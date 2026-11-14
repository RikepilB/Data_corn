from __future__ import annotations

from datetime import date

import pytest

from datacorn.domain import geometry as geo
from datacorn.domain.agronomy.enso import classify
from datacorn.domain.agronomy.et0 import et0_fao56
from datacorn.domain.agronomy.phenology import daily_gdd, default_hybrid_rm, gdd_to_maturity
from datacorn.domain.errors import InvalidFieldGeometry
from datacorn.domain.models import ClimateDay, Crop, EnsoPhase, FieldGeometry, LonLat
from datacorn.domain.soil import available_water_mm_per_m, texture_class
from datacorn.infrastructure.crop_catalog import YamlCropCatalog
from datacorn.infrastructure.cropscape import albers_conus
from tests.fakes import SQUARE


def test_area_of_sample_field() -> None:
    # 0.01° de longitud × 0.0073° de latitud a 40.9° N ≈ 840.5 m × 811.7 m
    assert geo.area_ha(SQUARE) == pytest.approx(68.2, rel=0.01)


def test_centroid_of_square() -> None:
    c = geo.centroid(SQUARE)
    assert c.lon == pytest.approx(-97.999, abs=1e-4)
    assert c.lat == pytest.approx(40.90365, abs=1e-4)


def test_bowtie_is_not_simple() -> None:
    bowtie = FieldGeometry(
        (LonLat(0, 0), LonLat(0.01, 0.01), LonLat(0.01, 0), LonLat(0, 0.01), LonLat(0, 0))
    )
    assert not geo.is_simple(bowtie)
    assert geo.is_simple(SQUARE)


def test_tiny_field_is_rejected() -> None:
    tiny = FieldGeometry(
        (LonLat(0, 0), LonLat(0.0001, 0), LonLat(0.0001, 0.0001), LonLat(0, 0.0001), LonLat(0, 0))
    )
    with pytest.raises(InvalidFieldGeometry) as err:
        geo.validate(tiny, min_area_ha=1, max_area_ha=2000, max_vertices=500)
    assert err.value.reason == "area_too_small"


def test_et0_matches_fao56_example_18() -> None:
    # Bruselas, 6 de julio: ET0 = 3.9 mm/día (FAO-56, ejemplo 18; aquí con HR media)
    day = ClimateDay(date(2026, 7, 6), 12.3, 21.5, 0.0, 22.07, 73.5, 2.078)
    assert et0_fao56(day, lat_deg=50.8, elevation_m=100) == pytest.approx(3.9, abs=0.25)


def test_growing_degree_days_are_capped() -> None:
    assert daily_gdd(10, 30, base_c=10, upper_c=30) == 10
    assert daily_gdd(5, 35, base_c=10, upper_c=30) == 10
    assert daily_gdd(0, 8, base_c=10, upper_c=30) == 0


def test_gdd_table_interpolates() -> None:
    maize = YamlCropCatalog().get(Crop.MAIZE)
    assert gdd_to_maturity(maize, 110) == pytest.approx(1500.0)
    assert default_hybrid_rm(40.9) == 105


def test_texture_and_available_water() -> None:
    assert texture_class(20, 15) == "silt_loam"
    assert texture_class(40, 20) == "loam"
    assert texture_class(90, 5) == "sand"
    assert available_water_mm_per_m(40, 20, 2.5) == pytest.approx(143, abs=3)


def test_enso_thresholds() -> None:
    assert classify(2.46) is EnsoPhase.EL_NINO
    assert classify(-0.7) is EnsoPhase.LA_NINA
    assert classify(0.3) is EnsoPhase.NEUTRAL
    assert classify(0.45, index="ICEN") is EnsoPhase.EL_NINO


def test_albers_matches_pyproj() -> None:
    # Valores de referencia de pyproj (EPSG:4269 → EPSG:5070)
    x, y = albers_conus(-98.0, 40.9)
    assert (round(x, 1), round(y, 1)) == (-167111.2, 1989551.6)
    x, y = albers_conus(-89.0, 40.0)
    assert (round(x, 1), round(y, 1)) == (591822.9, 1908783.8)
