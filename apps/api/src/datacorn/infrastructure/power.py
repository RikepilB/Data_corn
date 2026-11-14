"""NASA POWER (sin clave): clima diario, humedad del suelo (MERRA-2) y altura del lote."""

from __future__ import annotations

import threading
from datetime import date, datetime

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import (
    ClimateDay,
    ClimateSeries,
    FieldGeometry,
    SoilMoistureObservation,
    Terrain,
)
from datacorn.infrastructure.http import client

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = (
    "T2M_MAX",
    "T2M_MIN",
    "PRECTOTCORR",
    "ALLSKY_SFC_SW_DWN",
    "RH2M",
    "WS2M",
    "GWETROOT",
    "GWETTOP",
)
COMMUNITY = "AG"  # unidades agroclimáticas (MJ/m²/día)
FILL = -999.0
SOURCE = "NASA POWER (MERRA-2)"


class PowerClient:
    """Una sola descarga por punto y rango, aunque la pidan varios adaptadores a la vez."""

    def __init__(self) -> None:
        self._http = client(timeout=180)
        self._lock = threading.Lock()
        self._key_locks: dict[tuple, threading.Lock] = {}
        self._cache: dict[tuple, dict] = {}

    def daily_point(self, *, lat: float, lon: float, start: date, end: date) -> dict:
        key = (round(lat, 4), round(lon, 4), start, end)
        with self._lock:
            lock = self._key_locks.setdefault(key, threading.Lock())
        with lock:
            if key in self._cache:
                return self._cache[key]
            try:
                response = self._http.get(
                    BASE_URL,
                    params={
                        "parameters": ",".join(PARAMETERS),
                        "community": COMMUNITY,
                        "latitude": f"{lat:.4f}",
                        "longitude": f"{lon:.4f}",
                        "start": start.strftime("%Y%m%d"),
                        "end": end.strftime("%Y%m%d"),
                        "format": "JSON",
                    },
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise DataUnavailable("nasa_power", str(exc)) from exc
            data = response.json()
            self._cache[key] = data
            return data


def _value(series: dict[str, float], key: str) -> float | None:
    v = series.get(key)
    return None if v is None or v <= FILL else float(v)


class PowerClimate:
    def __init__(self, power: PowerClient) -> None:
        self._power = power

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        c = centroid(geometry)
        data = self._power.daily_point(lat=c.lat, lon=c.lon, start=start, end=end)
        p = data["properties"]["parameter"]
        days = []
        for key in sorted(p["T2M_MAX"]):
            tmax, tmin = _value(p["T2M_MAX"], key), _value(p["T2M_MIN"], key)
            rain = _value(p["PRECTOTCORR"], key)
            if tmax is None or tmin is None or rain is None:
                continue  # días aún sin procesar al final del registro
            days.append(
                ClimateDay(
                    day=datetime.strptime(key, "%Y%m%d").date(),
                    tmin_c=tmin,
                    tmax_c=tmax,
                    precip_mm=rain,
                    solar_mj_m2=_value(p["ALLSKY_SFC_SW_DWN"], key),
                    rh_mean_pct=_value(p["RH2M"], key),
                    wind_2m_m_s=_value(p["WS2M"], key),
                )
            )
        if not days:
            raise DataUnavailable("nasa_power", "no valid days")
        return ClimateSeries(days=tuple(days), sources=(SOURCE,))


class PowerSoilWetness:
    """Humedad del suelo de MERRA-2 (fracción de saturación 0-1), vía POWER."""

    def __init__(self, power: PowerClient) -> None:
        self._power = power

    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]:
        c = centroid(geometry)
        p = self._power.daily_point(lat=c.lat, lon=c.lon, start=start, end=end)["properties"][
            "parameter"
        ]
        out = []
        for key in sorted(p["GWETROOT"]):
            root, top = _value(p["GWETROOT"], key), _value(p["GWETTOP"], key)
            if root is None or top is None:
                continue
            out.append(
                SoilMoistureObservation(
                    day=datetime.strptime(key, "%Y%m%d").date(),
                    surface_m3_m3=top,
                    rootzone_m3_m3=root,
                    source="NASA POWER GWETROOT (MERRA-2)",
                )
            )
        return tuple(out)


class PowerTerrain:
    """Respaldo global: altura de POWER; la pendiente queda sin dato (0)."""

    def __init__(self, power: PowerClient) -> None:
        self._power = power

    def terrain(self, geometry: FieldGeometry) -> Terrain:
        c = centroid(geometry)
        today = date.today()
        data = self._power.daily_point(lat=c.lat, lon=c.lon, start=today, end=today)
        return Terrain(
            elevation_m=float(data["geometry"]["coordinates"][2]),
            mean_slope_pct=0.0,
            low_area_fraction=0.0,
            source="NASA POWER (altura)",
        )
