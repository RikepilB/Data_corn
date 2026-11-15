# SI-assisted (Codex); reviewed by Miguel
from __future__ import annotations

from dataclasses import FrozenInstanceError
from math import atan, sin

import pytest

from datacorn.domain.agronomy.erosion import erosion_index


def test_no_rain_and_subthreshold_rain_give_zero() -> None:
    for rain in ([0.0, 0.0], [1.0, 12.699]):
        result = erosion_index(rain, 0.5)
        assert result.index == 0
        assert result.erosive_days == 0


def test_doubling_daily_cover_on_erosive_days_doubles_index() -> None:
    low = erosion_index([5.0, 20.0, 40.0], [0.9, 0.2, 0.3])
    high = erosion_index([5.0, 20.0, 40.0], [0.1, 0.4, 0.6])
    assert high.index == pytest.approx(2 * low.index)
    assert high.erosive_days == 2


@pytest.mark.parametrize("slope", [3.0, 9.0, 15.0])
def test_exact_threshold_counts_and_matches_formula(slope: float) -> None:
    result = erosion_index([12.7], 0.5, slope_pct=slope, k_factor=0.04)
    theta = atan(slope / 100)
    s = 10.8 * sin(theta) + 0.03 if slope < 9 else 16.8 * sin(theta) - 0.50
    assert result.index == pytest.approx(0.04 * s * 0.5 * 12.7**1.5)
    assert result.erosive_days == 1
    assert result.gaps == ()


def test_steeper_slope_has_greater_index_and_k_is_linear() -> None:
    gentle = erosion_index([30.0], 0.5, slope_pct=3.0, k_factor=0.03)
    steep = erosion_index([30.0], 0.5, slope_pct=15.0, k_factor=0.03)
    doubled = erosion_index([30.0], 0.5, slope_pct=3.0, k_factor=0.06)
    assert steep.index > gentle.index
    assert doubled.index == pytest.approx(2 * gentle.index)


def test_defaults_are_named_individually_and_explicit_zero_is_preserved() -> None:
    result = erosion_index([20.0], 0.5)
    assert (result.slope_pct, result.k_factor) == (2.0, 0.03)
    assert len(result.gaps) == 2
    assert "default slope 2.0%" in result.gaps[0]
    assert "default K 0.03" in result.gaps[1]
    assert len(erosion_index([20.0], 0.5, slope_pct=3.0).gaps) == 1
    assert len(erosion_index([20.0], 0.5, k_factor=0.1).gaps) == 1
    zero = erosion_index([20.0], 0.5, slope_pct=0.0, k_factor=0.0)
    assert zero.index == 0 and zero.gaps == ()


def test_nan_days_are_skipped_and_counted() -> None:
    result = erosion_index([float("nan"), 20.0, 0.0], [0.8, 0.5, 0.2])
    assert result.index == erosion_index([20.0, 0.0], [0.5, 0.2]).index
    assert (result.missing_days, result.erosive_days) == (1, 1)
    assert "skipped 1" in result.gaps[-1]


def test_none_and_nan_days_are_skipped_and_counted() -> None:
    result = erosion_index([None, 20.0, float("nan"), 0.0, 30.0], [0.8, 0.5, 0.9, 0.2, 0.3])
    assert result.index == erosion_index([20.0, 0.0, 30.0], [0.5, 0.2, 0.3]).index
    assert (result.missing_days, result.erosive_days) == (2, 2)


@pytest.mark.parametrize("rain", [[], [float("nan"), float("nan")], [None, None]])
def test_no_valid_rain_is_no_data(rain: list[float | None]) -> None:
    result = erosion_index(rain, 0.5)
    assert result.index is None
    assert result.missing_days == len(rain)
    assert result.erosive_days == 0
    assert "No data: no valid rain days" in result.gaps[-1]


@pytest.mark.parametrize(
    ("rain", "cover", "kwargs"),
    [
        ([-1.0], 0.5, {}),
        ([float("inf")], 0.5, {}),
        ([20.0], -0.1, {}),
        ([20.0], 1.1, {}),
        ([20.0], [float("nan")], {}),
        ([], 1.1, {}),
        ([20.0], [], {}),
        ([20.0], [0.5, 0.5], {}),
        ([20.0], 0.5, {"slope_pct": -1.0}),
        ([20.0], 0.5, {"k_factor": -0.01}),
        ([20.0], 0.5, {"slope_pct": float("nan")}),
        ([20.0], 0.5, {"k_factor": float("inf")}),
    ],
)
def test_invalid_inputs_raise_value_error(
    rain: list[float], cover: float | list[float], kwargs: dict[str, float]
) -> None:
    with pytest.raises(ValueError):
        erosion_index(rain, cover, **kwargs)


def test_result_is_frozen() -> None:
    result = erosion_index([20.0], 0.5)
    with pytest.raises(FrozenInstanceError):
        result.index = 0.0
