# SI-assisted (Claude Code); reviewed by <name>
"""Adaptadores de Earth Engine, sin red.

`FakeSession.ee()` devuelve un MagicMock (las expresiones se arman sin fallar) e `info()` devuelve
respuestas guardadas. Esto prueba la lectura de las respuestas, las unidades y el respaldo; no
prueba que Earth Engine acepte las expresiones: eso queda para la primera corrida con cuenta.
"""

from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock

import pytest

from datacorn.application.errors import DataUnavailable
from datacorn.application.use_cases import GetDroughtLayer
from datacorn.domain.models import ClimateDay, ClimateSeries, Crop
from datacorn.infrastructure.earthengine import _common as common
from datacorn.infrastructure.earthengine.climate import (
    Era5LandClimate,
    PowerImergClimate,
    PrismPowerClimate,
    era5_day,
    merge_prism,
)
from datacorn.infrastructure.earthengine.crop_history import CdlCropHistory, majority_by_year
from datacorn.infrastructure.earthengine.drought import SmapDroughtLayer
from datacorn.infrastructure.earthengine.elevation import NasademElevation
from datacorn.infrastructure.earthengine.evapotranspiration import OpenEtEvapotranspiration
from datacorn.infrastructure.earthengine.session import EarthEngineSession
from datacorn.infrastructure.earthengine.soil_moisture import NldasSoilMoisture, SmapL4SoilMoisture
from datacorn.infrastructure.earthengine.vegetation import (
    HlsSentinel2Vegetation,
    ModisVegetation,
    build_zone_map,
    ndvi_by_day,
)
from datacorn.infrastructure.providers import Fallback
from tests.fakes import SQUARE, TODAY


class FakeSession:
    def __init__(self, answers: dict[str, list[object]] | None = None) -> None:
        self.module = MagicMock()
        self.module.EEException = RuntimeError
        self._answers = answers or {}
        self.asked: list[str] = []

    def ee(self) -> MagicMock:
        return self.module

    def info(self, source: str, computed: object) -> object:
        self.asked.append(source)
        queue = self._answers.get(source) or []
        return queue.pop(0) if queue else []


class FakePower:
    """La respuesta de NASA POWER para dos días."""

    def daily_point(self, **_: object) -> dict:
        days = ("20260701", "20260702")
        values = {"T2M_MAX": 30.0, "T2M_MIN": 18.0, "PRECTOTCORR": 1.0, "ALLSKY_SFC_SW_DWN": 25.0}
        values |= {"RH2M": 60.0, "WS2M": 3.0, "GWETROOT": 0.6, "GWETTOP": 0.5}
        return {"properties": {"parameter": {k: dict.fromkeys(days, v) for k, v in values.items()}}}


OFF = EarthEngineSession(project=None, enabled=False)
JULY = (date(2026, 7, 1), date(2026, 7, 3))
PATCH = {"type": "Polygon", "coordinates": [[[-98.0, 40.9], [-97.99, 40.9], [-97.99, 40.91], [-98.0, 40.9]]]}


# --- Apagado: cada adaptador avisa "sin datos" y la cadena sigue ----------------------------


@pytest.mark.parametrize(
    "call",
    [
        lambda: PrismPowerClimate(OFF, FakePower()).daily(SQUARE, *JULY),
        lambda: Era5LandClimate(OFF).daily(SQUARE, *JULY),
        lambda: SmapL4SoilMoisture(OFF).series(SQUARE, *JULY),
        lambda: HlsSentinel2Vegetation(OFF).ndvi_series(SQUARE, *JULY),
        lambda: HlsSentinel2Vegetation(OFF).zone_map(SQUARE, 2021, 2025),
        lambda: ModisVegetation(OFF).ndvi_series(SQUARE, *JULY),
        lambda: OpenEtEvapotranspiration(OFF).actual(SQUARE, *JULY),
        lambda: CdlCropHistory(OFF).history(SQUARE, 2016, 2025),
        lambda: NasademElevation(OFF).terrain(SQUARE),
        lambda: SmapDroughtLayer(OFF).tiles(date(2026, 7, 1)),
        lambda: PowerImergClimate(OFF, FakePower()).daily(SQUARE, *JULY),
        lambda: NldasSoilMoisture(OFF).series(SQUARE, *JULY),
    ],
)
def test_disabled_earth_engine_means_data_unavailable(call) -> None:  # noqa: ANN001
    with pytest.raises(DataUnavailable):
        call()


def test_chain_falls_back_to_the_next_source_when_earth_engine_is_off() -> None:
    class NoAccountClimate:
        def daily(self, *_: object) -> str:
            return "from POWER"

    chain = Fallback([PrismPowerClimate(OFF, FakePower()), NoAccountClimate()])
    assert chain.daily(SQUARE, *JULY) == "from POWER"


def test_an_earth_engine_error_becomes_data_unavailable() -> None:
    import ee

    session = EarthEngineSession(project="p", enabled=True)
    session._ready = True  # sin Initialize: no hay red en las pruebas
    failing = MagicMock()
    failing.getInfo.side_effect = ee.EEException("quota exceeded")
    with pytest.raises(DataUnavailable) as error:
        session.info("prism", failing)
    assert error.value.source == "prism"


# --- Series por imagen ----------------------------------------------------------------------


def test_rows_without_data_are_dropped_and_days_sorted() -> None:
    raw = [["2026-07-02", 0.7, 1.0], ["2026-07-01", None, 0.2], ["2026-06-30", 0.5, 0.9]]
    rows = common.parse_rows(raw, ("ndvi", "valid"))
    assert [d for d, _ in rows] == [date(2026, 6, 30), date(2026, 7, 2)]
    assert rows[1][1] == {"ndvi": 0.7, "valid": 1.0}


def test_year_chunks_cover_the_range_once() -> None:
    chunks = list(common.year_chunks(date(2001, 1, 1), date(2026, 11, 14)))
    assert chunks[0][0] == date(2001, 1, 1)
    assert chunks[-1][1] == date(2026, 11, 15)  # fin exclusivo: incluye el último día
    assert all(a[1] == b[0] for a, b in zip(chunks, chunks[1:], strict=False))
    assert len(chunks) == 6


# --- Clima ----------------------------------------------------------------------------------


def test_prism_replaces_temperature_and_rain_and_keeps_power_radiation() -> None:
    power = ClimateSeries(
        days=(ClimateDay(date(2026, 7, 1), 18.0, 30.0, 1.0, 25.0, 60.0, 3.0),), sources=("POWER",)
    )
    prism = [
        (date(2026, 7, 1), {"tmin": 16.5, "tmax": 33.1, "ppt": 12.0}),
        (date(2026, 7, 2), {"tmin": 17.0, "tmax": 31.0, "ppt": -0.1}),  # día que POWER aún no tiene
    ]
    merged = merge_prism(prism, power)
    first, second = merged.days
    assert (first.tmin_c, first.tmax_c, first.precip_mm) == (16.5, 33.1, 12.0)
    assert (first.solar_mj_m2, first.rh_mean_pct, first.wind_2m_m_s) == (25.0, 60.0, 3.0)
    assert second.precip_mm == 0.0 and second.solar_mj_m2 is None  # sin dato es None, nunca 0
    assert merged.sources[0].startswith("PRISM") and "POWER" in merged.sources


def test_prism_adapter_merges_with_power_and_reports_no_coverage() -> None:
    rows = [["2026-07-01", 16.5, 33.1, 12.0]]
    series = PrismPowerClimate(FakeSession({"prism": [rows]}), FakePower()).daily(SQUARE, *JULY)
    assert [d.day for d in series.days] == [date(2026, 7, 1), date(2026, 7, 2)]
    assert series.days[0].tmax_c == 33.1 and series.days[1].tmax_c == 30.0
    with pytest.raises(DataUnavailable) as error:  # fuera de EE. UU. no llegan filas
        PrismPowerClimate(FakeSession(), FakePower()).daily(SQUARE, *JULY)
    assert error.value.source == "prism"


def test_era5_units_become_the_ones_the_model_uses() -> None:
    day = era5_day(
        date(2026, 7, 1),
        {
            "temperature_2m_min": 288.15,
            "temperature_2m_max": 303.15,
            "total_precipitation_sum": 0.0123,
            "surface_solar_radiation_downwards_sum": 2.5e7,
            "dewpoint_temperature_2m": 288.15,
            "u_component_of_wind_10m": 3.0,
            "v_component_of_wind_10m": 4.0,
        },
    )
    assert (day.tmin_c, day.tmax_c) == pytest.approx((15.0, 30.0))
    assert day.precip_mm == pytest.approx(12.3)
    assert day.solar_mj_m2 == pytest.approx(25.0)
    assert day.wind_2m_m_s == pytest.approx(5.0 * 0.748, abs=0.005)  # FAO-56 ec. 47
    # ea = es(Tdew) = 1,705 kPa; es = (es(15) + es(30)) / 2 = 2,974 kPa (FAO-56 ec. 12)
    assert day.rh_mean_pct == pytest.approx(57.3, abs=0.2)


# --- Humedad, NDVI, ET, cultivos, relieve ---------------------------------------------------


def test_smap_wetness_is_read_as_saturation_fraction() -> None:
    session = FakeSession({"smap_l4": [[["2026-07-01", 0.41, 0.55]]]})
    (obs,) = SmapL4SoilMoisture(session).series(SQUARE, date(2001, 1, 1), date(2026, 7, 3))
    assert (obs.day, obs.surface_m3_m3, obs.rootzone_m3_m3) == (date(2026, 7, 1), 0.41, 0.55)
    assert "SMAP" in obs.source
    assert len(session.asked) == 3  # 2015-03-31 → 2026 en tramos de 5 años, no desde 2001


def test_ndvi_averages_same_day_scenes_and_skips_cloudy_ones() -> None:
    rows = [
        (date(2026, 6, 1), {"ndvi": 0.60, "valid": 0.9}),
        (date(2026, 6, 1), {"ndvi": 0.70, "valid": 1.0}),
        (date(2026, 6, 9), {"ndvi": 0.10, "valid": 0.3}),  # 30 % despejado: no cuenta
    ]
    (obs,) = ndvi_by_day(rows, "HLS")
    assert obs.day == date(2026, 6, 1) and obs.ndvi == pytest.approx(0.65)


def test_hls_series_and_modis_report_no_scenes() -> None:
    session = FakeSession({"hls": [[["2026-06-01", 0.62, 0.95]]]})
    (obs,) = HlsSentinel2Vegetation(session).ndvi_series(SQUARE, date(2023, 5, 1), date(2026, 7, 31))
    assert obs.ndvi == 0.62 and "HLS" in obs.sensor
    with pytest.raises(DataUnavailable):
        ModisVegetation(FakeSession()).ndvi_series(SQUARE, *JULY)
    with pytest.raises(DataUnavailable):
        ModisVegetation(FakeSession()).zone_map(SQUARE, 2021, 2025)


def _patch(zone: int, area: float, ndvi: float | None, kind: str = "Polygon") -> dict:
    return {
        "type": "Feature",
        "geometry": {**PATCH, "type": kind},
        "properties": {"zone": zone, "area_m2": area, "mean": ndvi},
    }


def test_zone_map_reports_each_class_share_and_mean_ndvi() -> None:
    raw = {
        "seasons": 5,
        "zones": {
            "features": [
                _patch(1, 20_000, 0.60),
                _patch(1, 10_000, 0.66),
                _patch(2, 50_000, 0.80),
                _patch(3, 20_000, 0.88),
                _patch(3, 100, 0.99),  # menos de 3 píxeles: ruido
                _patch(2, 9_000, 0.5, kind="LineString"),  # resto de un recorte: no es un parche
            ]
        },
    }
    zones = build_zone_map(raw, 2021, 2025)
    assert zones["type"] == "FeatureCollection"
    assert zones["meta"] == {
        "source": "Copernicus Sentinel-2 SR (Earth Engine)",
        "first_year": 2021,
        "last_year": 2025,
        "seasons": 5,
        "resolution_m": 10,
    }
    props = [f["properties"] for f in zones["features"]]
    assert [p["zone"] for p in props] == ["low", "low", "medium", "high"]
    assert props[0] == {"zone": "low", "ndvi": 0.62, "area_pct": 30}  # 0.60 y 0.66 por área
    assert sum({p["zone"]: p["area_pct"] for p in props}.values()) == 100


def test_zone_map_without_clear_imagery_is_data_unavailable() -> None:
    with pytest.raises(DataUnavailable):
        build_zone_map({"seasons": 0, "zones": {"features": []}}, 2021, 2025)
    session = FakeSession({"sentinel2": [{"seasons": 4, "zones": {"features": [_patch(2, 90_000, 0.8)]}}]})
    zones = HlsSentinel2Vegetation(session).zone_map(SQUARE, 2021, 2025)
    assert [f["properties"]["area_pct"] for f in zones["features"]] == [100]


def test_openet_months_carry_their_first_and_last_day() -> None:
    session = FakeSession({"openet": [[["2024-06-01", 151.2], ["2024-07-01", 190.0]]]})
    june, july = OpenEtEvapotranspiration(session).actual(SQUARE, date(2024, 1, 1), date(2024, 12, 31))
    assert (june.start, june.end, june.et_mm) == (date(2024, 6, 1), date(2024, 6, 30), 151.2)
    assert july.end == date(2024, 7, 31) and "OpenET" in july.source
    with pytest.raises(DataUnavailable):  # campaña futura o fuera de cobertura
        OpenEtEvapotranspiration(FakeSession()).actual(SQUARE, date(2027, 1, 1), date(2027, 6, 1))


def test_cdl_takes_the_class_with_most_pixels_each_year() -> None:
    history = majority_by_year(
        [2023, 2022, 2024, 2021],
        [{"1": 700.0, "5": 20.0}, {"5": 650.5, "1": 12, "0": 9000}, {"176": 400}, {}],
    )
    assert [(c.year, c.crop) for c in history] == [
        (2022, Crop.SOYBEAN),
        (2023, Crop.MAIZE),
        (2024, Crop.OTHER),
    ]
    twice = majority_by_year([2024, 2024], [{"1": 5}, {"5": 9}])  # dos imágenes del mismo año
    assert [(c.year, c.crop) for c in twice] == [(2024, Crop.SOYBEAN)]
    session = FakeSession({"cdl": [{"years": [2024], "h": [{"1": 10}]}, {"years": [], "h": []}]})
    assert CdlCropHistory(session).history(SQUARE, 2001, 2025)[0].crop is Crop.MAIZE
    with pytest.raises(DataUnavailable):
        CdlCropHistory(session).history(SQUARE, 2001, 2025)


def test_nasadem_terrain_and_its_coverage_limit() -> None:
    answers = [{"elevation": 552.4, "slope": 1.2345, "low": 0.0712}, {"elevation": None}]
    session = FakeSession({"nasadem": answers})
    terrain = NasademElevation(session).terrain(SQUARE)
    assert (terrain.elevation_m, terrain.mean_slope_pct, terrain.low_area_fraction) == (552.4, 1.23, 0.071)
    with pytest.raises(DataUnavailable):
        NasademElevation(session).terrain(SQUARE)


# --- Capa de sequía -------------------------------------------------------------------------


class FakeClock:
    def today(self) -> date:
        return TODAY


def test_drought_layer_returns_a_tile_template_and_reuses_it() -> None:
    session = FakeSession({"smap_l4": [31, 3]})  # julio completo; noviembre con 3 días
    days = session.module.ImageCollection.return_value.filterDate.return_value.filter.return_value
    image = days.select.return_value.mean.return_value
    image.getMapId.return_value = {"tile_fetcher": MagicMock(url_format="https://ee/{z}/{x}/{y}")}
    layer = SmapDroughtLayer(session)
    first = layer.tiles(date(2026, 7, 1))
    assert first.url_template == "https://ee/{z}/{x}/{y}" and first.month == "2026-07"
    assert (first.min, first.max, first.unit) == (0, 100, "percentile")
    assert layer.tiles(date(2026, 7, 1)) is first
    assert image.getMapId.call_count == 1
    with pytest.raises(DataUnavailable):  # un mes recién empezado no se muestra como el mes
        layer.tiles(date(2026, 11, 1))
    assert image.getMapId.call_count == 1


def test_drought_use_case_only_asks_for_months_smap_has() -> None:
    port = MagicMock()
    use_case = GetDroughtLayer(layer=port, clock=FakeClock())
    for month in (date(2015, 3, 1), date(2026, 12, 1)):
        with pytest.raises(DataUnavailable):
            use_case.execute(month)
    use_case.execute(date(2026, 7, 19))
    port.tiles.assert_called_once_with(date(2026, 7, 1))
