# SI-assisted (Claude Code); reviewed by <name>
"""Rotación (#42): las tres estrategias siempre presentes, en orden estable, con `current`."""

from __future__ import annotations

from datetime import date

import pytest

from datacorn.domain.agronomy import rotation
from datacorn.domain.models import (
    AdminArea,
    Crop,
    CropYear,
    FieldContext,
    FieldInputs,
    LonLat,
    Terrain,
)
from datacorn.domain.report import RiskLevel, RotationComparison, RotationStrategy

ORDER = [
    RotationStrategy.CONTINUOUS_CORN,
    RotationStrategy.CORN_SOYBEAN,
    RotationStrategy.CORN_SOYBEAN_RYE,
]
M, S, X = Crop.MAIZE, Crop.SOYBEAN, Crop.OTHER


def _history(*crops: Crop, first: int = 2020) -> tuple[CropYear, ...]:
    return tuple(CropYear(first + i, c, "test") for i, c in enumerate(crops))


def _compare(history: tuple[CropYear, ...]) -> RotationComparison:
    context = FieldContext(
        region_id="us", admin=AdminArea("US", "NE", "Hamilton County"), area_ha=10.0,
        centroid=LonLat(-98.0, 40.9), soil=None, terrain=Terrain(550.0, 1.0, 0.0, "test"),
        crop_history=history, county_yields=(), enso_now=None,
    )
    inputs = FieldInputs(season=2027, planting_date=date(2027, 5, 1), hybrid_rm_days=105)
    return rotation.compare(context=context, inputs=inputs, outcomes=())


@pytest.mark.parametrize("history", [(), _history(M), _history(M, S, M, S, M, S), _history(M, M, M, M)])
def test_three_strategies_always_present_in_stable_order(history: tuple[CropYear, ...]) -> None:
    options = _compare(history).options
    assert [o.strategy for o in options] == ORDER
    assert all(o.current is not None for o in options)  # el consumidor nunca tiene que adivinar
    assert sum(o.current is True for o in options) <= 1


@pytest.mark.parametrize(
    ("history", "expected"),
    [
        (_history(M, M, M, M), RotationStrategy.CONTINUOUS_CORN),
        (_history(S, M, M, M, M, M), RotationStrategy.CONTINUOUS_CORN),  # solo cuentan los últimos 4
        (_history(M, S, M, S), RotationStrategy.CORN_SOYBEAN),
        (_history(S, M, S, M), RotationStrategy.CORN_SOYBEAN),
        (_history(M, M, S, M), None),
        (_history(M, S, X, S), None),
        (_history(M, S, M), None),  # menos de 4 años: desconocido
        ((), None),
    ],
)
def test_current_strategy_from_crop_history(
    history: tuple[CropYear, ...], expected: RotationStrategy | None
) -> None:
    flagged = [o.strategy for o in _compare(history).options if o.current]
    assert flagged == ([expected] if expected else [])


def test_history_is_sorted_by_year_before_detecting() -> None:
    shuffled = tuple(reversed(_history(M, S, M, S)))
    assert _compare(shuffled).options[1].current is True


def test_rye_option_never_current_and_erosion_not_verified() -> None:
    rye = _compare(_history(M, S, M, S)).options[2]
    assert rye.current is False
    assert rye.residue_erosion_risk is RiskLevel.NO_DATA
    assert rye.relative_yield is None
    assert rye.planting_soil_water_mm is None


def test_previous_crop_data_kept_for_legacy_consumers() -> None:
    comparison = _compare(_history(M, S, M, S))
    assert comparison.options[0].previous_crop is Crop.MAIZE
    assert comparison.options[1].previous_crop is Crop.SOYBEAN
    assert comparison.recommended is Crop.SOYBEAN
    assert comparison.field_history
    assert comparison.message.key == "rotation.soy_first"
