# SI-assisted (Claude Code); reviewed by <name>
"""El CLI de precálculo, con puertos falsos (sin red): forma idéntica a la de la API."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from datacorn.application.use_cases import AnalyzeField, DescribeField, ListDemoFields, ListRegions
from datacorn.bootstrap import Container
from datacorn.config import Settings
from datacorn.infrastructure.cache import MemoryCache
from datacorn.infrastructure.crop_catalog import YamlCropCatalog
from datacorn.infrastructure.demo_fields import PackagedDemoFields
from datacorn.interfaces.cli.precompute import default_season, main, precompute
from datacorn.interfaces.http.app import create_app
from tests.fakes import FakeRegions, FixedClock

NOW = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)


def _container() -> Container:
    regions, cache, clock = FakeRegions(), MemoryCache(), FixedClock()
    describe = DescribeField(
        regions=regions, cache=cache, clock=clock, min_area_ha=1, max_area_ha=2000,
        max_vertices=500, history_start_year=2001,
    )
    analyze = AnalyzeField(
        regions=regions, crops=YamlCropCatalog(), cache=cache, clock=clock, describe=describe,
        history_start_year=2001,
    )
    return Container(
        settings=Settings(_env_file=None),
        list_regions=ListRegions(regions),
        list_demo_fields=ListDemoFields(PackagedDemoFields()),
        describe_field=describe,
        analyze_field=analyze,
        drought_layer=None,  # type: ignore[arg-type]
    )


def test_default_season_rolls_over_in_july() -> None:
    assert default_season(NOW.date()) == 2027
    assert default_season(datetime(2026, 6, 30).date()) == 2026


def test_writes_one_json_per_field_and_an_index(tmp_path: Path) -> None:
    entries, failures = precompute(_container(), tmp_path, now=NOW, commit="abc123")
    assert failures == []
    ids = {e["id"] for e in entries}
    assert {"hamilton-ne", "thomas-ks", "story-ia"} <= ids
    index = json.loads((tmp_path / "index.json").read_text(encoding="utf-8"))
    assert index["engine_commit"] == "abc123"
    assert index["generated_at"] == "2026-11-14T12:00:00+00:00"
    assert {f["id"] for f in index["fields"]} == ids
    for entry in index["fields"]:
        assert (tmp_path / entry["file"]).is_file()
        assert entry["name"]["en"]


def test_field_json_matches_the_api_response_shape(tmp_path: Path) -> None:
    container = _container()
    precompute(container, tmp_path, now=NOW, commit=None, only=["hamilton-ne"])
    saved = json.loads((tmp_path / "hamilton-ne.json").read_text(encoding="utf-8"))
    assert saved["season"] == 2027 and saved["engine_commit"] is None

    geometry = next(f.geometry for f in container.list_demo_fields.execute() if f.id == "hamilton-ne")
    client = TestClient(create_app(container))
    described = client.post("/api/v1/fields/describe", json={"geometry": geometry, "season": 2027}).json()
    assert saved["describe"] == described
    defaults = described["defaults"]
    analyzed = client.post(
        "/api/v1/fields/analyze",
        json={
            "geometry": geometry,
            "season": 2027,
            "planting_date": f"2027-{defaults['planting_date'][5:]}",
            "hybrid_rm_days": defaults["hybrid_rm_days"],
            "irrigation": "none",
            "yield_goal_t_ha": defaults["yield_goal_t_ha"],
        },
    ).json()
    assert saved["analyze"] == analyzed
    assert saved["analyze"]["inputs"]["irrigation"] == "none"


def test_a_failing_field_is_reported_not_fatal(tmp_path: Path) -> None:
    container = _container()

    class Boom:
        def execute(self, *_: object, **__: object) -> object:
            raise RuntimeError("service down")

    broken = replace(container, analyze_field=Boom())  # type: ignore[arg-type]
    entries, failures = precompute(broken, tmp_path, now=NOW, commit=None, retries=1)
    assert entries == []
    assert {f.field_id for f in failures} >= {"hamilton-ne"}
    assert "service down" in failures[0].reason


def test_main_returns_zero_and_writes(tmp_path: Path) -> None:
    assert main(["--out", str(tmp_path / "out")], container_factory=_container) == 0
    assert (tmp_path / "out" / "index.json").is_file()
