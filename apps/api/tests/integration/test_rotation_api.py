# SI-assisted (Claude Code); reviewed by <name>
"""Forma JSON del bloque `rotation` (#42), con puertos falsos: sin red."""

from __future__ import annotations

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from datacorn.application.use_cases import AnalyzeField, DescribeField
from datacorn.bootstrap import build_container
from datacorn.config import Settings
from datacorn.infrastructure.cache import MemoryCache
from datacorn.infrastructure.crop_catalog import YamlCropCatalog
from datacorn.interfaces.http.app import create_app
from tests.conftest import FakeCountries
from tests.fakes import FakeRegions, FixedClock

RING = [[-98.0, 40.9], [-97.99, 40.9], [-97.99, 40.91], [-98.0, 40.91], [-98.0, 40.9]]
BODY = {
    "geometry": {"type": "Polygon", "coordinates": [RING]},
    "season": 2027,
    "planting_date": "2027-05-01",
    "hybrid_rm_days": 105,
}


@pytest.fixture
def offline_client(settings: Settings) -> TestClient:
    regions, cache, clock = FakeRegions(), MemoryCache(), FixedClock()
    describe = DescribeField(
        regions=regions, cache=cache, clock=clock, min_area_ha=1, max_area_ha=2000,
        max_vertices=500, history_start_year=2001,
    )
    analyze = AnalyzeField(
        regions=regions, crops=YamlCropCatalog(), cache=cache, clock=clock, describe=describe,
        history_start_year=2001,
    )
    container = replace(
        build_container(settings, countries=FakeCountries()),
        describe_field=describe,
        analyze_field=analyze,
    )
    return TestClient(create_app(container))


def test_analyze_rotation_block_has_three_strategies(offline_client: TestClient) -> None:
    response = offline_client.post("/api/v1/fields/analyze", json=BODY)
    assert response.status_code == 200
    rotation = response.json()["rotation"]
    options = rotation["options"]
    assert [o["strategy"] for o in options] == ["continuous_corn", "corn_soybean", "corn_soybean_rye"]
    assert [o["current"] for o in options] == [False, True, False]  # el CDL falso alterna maíz y soya
    assert set(options[0]) == {
        "previous_crop", "relative_yield", "planting_soil_water_mm", "residue_erosion_risk",
        "notes", "strategy", "current",
    }
    assert options[0]["relative_yield"] is None  # sin dato: null, nunca 0
    assert options[2]["residue_erosion_risk"] == "no_data"
    assert rotation["recommended"] in {"soybean", "maize"}
    assert rotation["field_history"]
    assert rotation["message"]["key"]
