# SI-assisted (Codex); reviewed by Miguel
"""Relative erosion exposure for comparing rotations within one field."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from math import atan, isfinite, isnan, sin


@dataclass(frozen=True)
class ErosionResult:
    index: float | None
    erosive_days: int
    missing_days: int
    slope_pct: float
    k_factor: float
    gaps: tuple[str, ...]


def erosion_index(
    daily_rain_mm: Sequence[float],
    cover_factor: float | Sequence[float],
    *,
    slope_pct: float | None = None,
    k_factor: float | None = None,
) -> ErosionResult:
    """Return a unitless, relative RUSLE-style index, never tonnes per hectare.

    Compare rotations within one field using K * S(slope) * sum(cover * rain**1.5)
    over days with rain >= 12.7 mm. The exponent 1.5 is to confirm with an agronomist.
    NaN rain days are skipped; an empty or entirely missing record has no data (None).
    """
    gaps: list[str] = []
    if slope_pct is None:
        slope_pct = 2.0
        gaps.append("Missing slope_pct: using default slope 2.0%.")
    if k_factor is None:
        k_factor = 0.03
        gaps.append("Missing k_factor: using default K 0.03.")
    if not isfinite(slope_pct) or slope_pct < 0:
        raise ValueError("slope_pct must be finite and nonnegative")
    if not isfinite(k_factor) or k_factor < 0:
        raise ValueError("k_factor must be finite and nonnegative")

    rain = tuple(daily_rain_mm)
    if isinstance(cover_factor, (int, float)):
        covers = (cover_factor,) * len(rain)
        cover_values = (cover_factor,)
    else:
        covers = tuple(cover_factor)
        cover_values = covers
        if len(covers) != len(rain):
            raise ValueError("cover_factor must have one value per rain day")
    if any(not isfinite(cover) or not 0 <= cover <= 1 for cover in cover_values):
        raise ValueError("cover_factor values must be finite and between 0 and 1")

    missing_days = 0
    erosive_days = 0
    exposure = 0.0
    for rain_day, cover_day in zip(rain, covers, strict=True):
        if isnan(rain_day):
            missing_days += 1
            continue
        if not isfinite(rain_day) or rain_day < 0:
            raise ValueError("rain must be nonnegative and finite, or NaN for missing days")
        if rain_day >= 12.7:
            erosive_days += 1
            exposure += cover_day * rain_day**1.5

    theta = atan(slope_pct / 100)
    slope_factor = 10.8 * sin(theta) + 0.03 if slope_pct < 9 else 16.8 * sin(theta) - 0.50
    index = k_factor * slope_factor * exposure
    if missing_days:
        gaps.append(f"Missing rainfall: skipped {missing_days} NaN day(s).")
    if len(rain) == missing_days:
        index = None
        gaps.append("No data: no valid rain days available.")
    return ErosionResult(index, erosive_days, missing_days, slope_pct, k_factor, tuple(gaps))
