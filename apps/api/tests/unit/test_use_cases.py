"""Describe → analyze de punta a punta con puertos falsos (sin red)."""

from __future__ import annotations

from datetime import date

from datacorn.application.dto import AnalyzeFieldCommand
from datacorn.application.use_cases import AnalyzeField, DescribeField
from datacorn.domain.models import FieldInputs, IrrigationSystem
from datacorn.domain.report import IndicatorId, RiskLevel
from datacorn.infrastructure.cache import MemoryCache
from datacorn.infrastructure.crop_catalog import YamlCropCatalog
from tests.fakes import SQUARE, FakeRegions, FixedClock


def _use_cases() -> tuple[DescribeField, AnalyzeField]:
    regions, cache, clock = FakeRegions(), MemoryCache(), FixedClock()
    describe = DescribeField(
        regions=regions, cache=cache, clock=clock, min_area_ha=1, max_area_ha=2000,
        max_vertices=500, history_start_year=2001,
    )
    analyze = AnalyzeField(
        regions=regions, crops=YamlCropCatalog(), cache=cache, clock=clock, describe=describe,
        history_start_year=2001,
    )
    return describe, analyze


def test_describe_detects_field_and_defaults() -> None:
    describe, _ = _use_cases()
    result = describe.execute(SQUARE, season=2027)
    assert result.context.admin.county == "Hamilton County"
    assert result.context.county_yields == ()  # sin clave de NASS
    assert 4 <= result.defaults.planting_date.month <= 5
    assert result.defaults.hybrid_rm_days == 105


def test_analyze_planning_season() -> None:
    describe, analyze = _use_cases()
    defaults = describe.execute(SQUARE, season=2027).defaults
    report = analyze.execute(
        AnalyzeFieldCommand(
            SQUARE,
            FieldInputs(season=2027, planting_date=defaults.planting_date, hybrid_rm_days=105),
        )
    )
    ids = {i.id for i in report.indicators}
    assert IndicatorId.IRRIGATION not in ids  # secano
    assert {IndicatorId.FLOWERING_WATER, IndicatorId.PLANTING_WINDOW, IndicatorId.FROST} <= ids
    progress = next(i for i in report.indicators if i.id is IndicatorId.SEASON_PROGRESS)
    assert progress.risk is RiskLevel.NO_DATA  # campaña 2027 aún no empieza
    assert len(report.runs) >= 20
    assert report.typical_year in {r.year for r in report.runs}
    assert all(0 <= v <= 100 for v in report.runs[0].water_pct)
    # Los años secos (cada 4) deben salir peor que el resto
    dry = [r.relative_yield for r in report.runs if r.year % 4 == 0]
    wet = [r.relative_yield for r in report.runs if r.year % 4 != 0]
    assert sum(dry) / len(dry) < sum(wet) / len(wet)
    assert report.rotation.message.key in {"rotation.soy_first", "rotation.corn_on_slopes"}


def test_irrigated_field_gets_irrigation_card() -> None:
    _, analyze = _use_cases()
    report = analyze.execute(
        AnalyzeFieldCommand(
            SQUARE,
            FieldInputs(
                season=2027, planting_date=date(2027, 5, 1), hybrid_rm_days=110,
                irrigation=IrrigationSystem.PIVOT,
            ),
        )
    )
    irrigation = next(i for i in report.indicators if i.id is IndicatorId.IRRIGATION)
    assert irrigation.value and irrigation.value > 0
    water = next(i for i in report.indicators if i.id is IndicatorId.FLOWERING_WATER)
    assert water.risk is RiskLevel.LOW  # con riego no falta agua


def test_past_season_uses_observed_days() -> None:
    _, analyze = _use_cases()
    report = analyze.execute(
        AnalyzeFieldCommand(
            SQUARE, FieldInputs(season=2026, planting_date=date(2026, 5, 1), hybrid_rm_days=105)
        )
    )
    assert report.observed_until is not None
    assert all(r.observed_days > 100 for r in report.runs)
