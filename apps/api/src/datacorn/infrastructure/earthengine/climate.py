"""Clima diario del lote (ClimatePort)."""

from __future__ import annotations

import math
from dataclasses import replace
from datetime import date

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import ClimateDay, ClimateSeries, FieldGeometry
from datacorn.infrastructure.earthengine._common import Row, center_point, chunked_series
from datacorn.infrastructure.earthengine.session import EarthEngineSession
from datacorn.infrastructure.power import PowerClient, PowerClimate

# AN81d quedó obsoleta (termina en 2020-12); ANd es su sucesora y llega a pocos días de hoy
PRISM_DAILY = "OREGONSTATE/PRISM/ANd"  # 4 km, EE. UU. contiguo, desde 1981
PRISM_BANDS = ("tmin", "tmax", "ppt")  # °C, °C, mm
PRISM_SCALE_M = 4638.3
PRISM_SOURCE = "PRISM daily (Oregon State University)"

IMERG = "NASA/GPM_L3/IMERG_V07"  # lluvia, 0.1°, media hora, desde 2000

ERA5_LAND_DAILY = "ECMWF/ERA5_LAND/DAILY_AGGR"  # reanálisis, ~11 km, desde 1950
ERA5_BANDS = (
    "temperature_2m_min",  # K
    "temperature_2m_max",  # K
    "total_precipitation_sum",  # m
    "surface_solar_radiation_downwards_sum",  # J/m²
    "dewpoint_temperature_2m",  # K
    "u_component_of_wind_10m",  # m/s
    "v_component_of_wind_10m",  # m/s
)
ERA5_SCALE_M = 11132
ERA5_SOURCE = "ERA5-Land daily (ECMWF / Copernicus C3S)"
KELVIN = 273.15
WIND_10M_TO_2M = 4.87 / math.log(67.8 * 10 - 5.42)  # FAO-56 ec. 47


def merge_prism(prism: list[Row], power: ClimateSeries) -> ClimateSeries:
    """Temperatura y lluvia de PRISM (4 km) sobre los días de POWER, que aporta el resto.

    Un día que PRISM aún no publicó queda con los valores de POWER; uno que solo tiene PRISM
    entra sin radiación, humedad ni viento (la ET0 usa entonces sus valores por defecto).
    El día de PRISM termina a las 12:00 UTC de su fecha, así que su máxima y buena parte de su
    lluvia son de la tarde anterior: los totales no cambian, un evento puede correrse un día.
    """
    by_day = {d.day: d for d in power.days}
    for day, v in prism:
        base = by_day.get(day)
        values = {"tmin_c": v["tmin"], "tmax_c": v["tmax"], "precip_mm": max(v["ppt"], 0.0)}
        by_day[day] = replace(base, **values) if base else ClimateDay(day=day, **values)
    days = tuple(by_day[d] for d in sorted(by_day))
    return ClimateSeries(days=days, sources=(PRISM_SOURCE, *power.sources))


def _sat_vp(t_c: float) -> float:
    """Presión de vapor de saturación, kPa (FAO-56 ec. 11)."""
    return 0.6108 * math.exp(17.27 * t_c / (t_c + 237.3))


def era5_day(day: date, v: dict[str, float]) -> ClimateDay:
    tmin, tmax = v["temperature_2m_min"] - KELVIN, v["temperature_2m_max"] - KELVIN
    tdew = v["dewpoint_temperature_2m"] - KELVIN
    # Sobre la media de es(Tmin) y es(Tmax), que es como la ET0 del dominio reconstruye ea
    rh = 100 * _sat_vp(tdew) / ((_sat_vp(tmin) + _sat_vp(tmax)) / 2)
    # La media diaria de los componentes subestima algo el viento medio (se promedian vectores)
    wind_10m = math.hypot(v["u_component_of_wind_10m"], v["v_component_of_wind_10m"])
    return ClimateDay(
        day=day,
        tmin_c=tmin,
        tmax_c=tmax,
        precip_mm=max(v["total_precipitation_sum"], 0.0) * 1000,
        solar_mj_m2=v["surface_solar_radiation_downwards_sum"] / 1e6,
        rh_mean_pct=min(max(rh, 0.0), 100.0),
        wind_2m_m_s=wind_10m * WIND_10M_TO_2M,
    )


class PrismPowerClimate:
    """EE. UU.: temperatura y lluvia de PRISM + radiación, humedad y viento de NASA POWER."""

    def __init__(self, ee: EarthEngineSession, power: PowerClient) -> None:
        self._ee = ee
        self._power = power

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        ee = self._ee.ee()
        rows = chunked_series(
            self._ee,
            "prism",
            lambda a, b: ee.ImageCollection(PRISM_DAILY).filterDate(a.isoformat(), b.isoformat()),
            PRISM_BANDS,
            center_point(ee, geometry),
            PRISM_SCALE_M,
            start,
            end,
        )
        if not rows:
            raise DataUnavailable("prism", "no PRISM data here (outside the contiguous US)")
        return merge_prism(rows, PowerClimate(self._power).daily(geometry, start, end))


class PowerImergClimate:
    """Global: NASA POWER + lluvia de GPM IMERG. Descartado por ahora.

    En Earth Engine IMERG viene cada media hora: sumar 25 años de lluvia diaria de un lote son
    unas 440 000 imágenes por pedido. Hasta tener un producto diario, el respaldo global de
    lluvia es ERA5-Land.
    """

    def __init__(self, ee: EarthEngineSession, power: PowerClient) -> None:
        self._ee = ee
        self._power = power

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        raise DataUnavailable("imerg", f"{IMERG} is half-hourly; no daily series is built from it")


class Era5LandClimate:
    """Respaldo global: ERA5-Land diario."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        ee = self._ee.ee()
        rows = chunked_series(
            self._ee,
            "era5_land",
            lambda a, b: ee.ImageCollection(ERA5_LAND_DAILY).filterDate(a.isoformat(), b.isoformat()),
            ERA5_BANDS,
            center_point(ee, geometry),
            ERA5_SCALE_M,
            start,
            end,
        )
        if not rows:
            raise DataUnavailable("era5_land", "no ERA5-Land data at this point (sea or ice)")
        return ClimateSeries(days=tuple(era5_day(d, v) for d, v in rows), sources=(ERA5_SOURCE,))
