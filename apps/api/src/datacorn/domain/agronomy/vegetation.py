"""NDVI del lote: suavizado y avance de la campaña (RF-16)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from statistics import median

from scipy.signal import savgol_filter

from datacorn.domain.models import VegetationObservation
from datacorn.domain.report import (
    Confidence,
    Evidence,
    Indicator,
    IndicatorId,
    Message,
    RiskLevel,
    SeriesPoint,
)

GREENUP_NDVI = 0.5  # el lote "verdea" cuando el NDVI suavizado cruza 0.5


def smooth(observations: Sequence[VegetationObservation]) -> tuple[VegetationObservation, ...]:
    """Savitzky-Golay (ventana 5, orden 2) sobre la serie de 16 días, año por año."""
    out: list[VegetationObservation] = []
    by_year: dict[int, list[VegetationObservation]] = {}
    for o in sorted(observations, key=lambda o: o.day):
        by_year.setdefault(o.day.year, []).append(o)
    for obs in by_year.values():
        if len(obs) >= 5:
            values = savgol_filter([o.ndvi for o in obs], 5, 2)
            out.extend(
                VegetationObservation(o.day, float(v), o.sensor) for o, v in zip(obs, values, strict=True)
            )
        else:
            out.extend(obs)
    return tuple(out)


def _greenup_doy(obs: Sequence[VegetationObservation]) -> int | None:
    for o in obs:
        if o.day.month >= 4 and o.ndvi >= GREENUP_NDVI:
            return o.day.timetuple().tm_yday
    return None


def season_progress(
    *, ndvi: Sequence[VegetationObservation], planting_date: date, today: date
) -> Indicator:
    """Compara el verdeo de esta campaña con el de los otros años del mismo lote."""
    season = planting_date.year
    sensors = tuple(sorted({o.sensor for o in ndvi}))
    ev = Evidence(sources=sensors, years=None, method="method.season_progress")

    def no_data(key: str) -> Indicator:
        return Indicator(
            id=IndicatorId.SEASON_PROGRESS,
            risk=RiskLevel.NO_DATA,
            message=Message(key, {"season": season}),
            value=None,
            unit="days",
            evidence=ev,
            confidence=Confidence.LOW,
            field_check=Message("check.scout_field"),
        )

    if today < planting_date:
        return no_data("season_progress.not_started")
    smoothed = smooth(ndvi)
    by_year: dict[int, list[VegetationObservation]] = {}
    for o in smoothed:
        by_year.setdefault(o.day.year, []).append(o)
    target = _greenup_doy(by_year.get(season, []))
    history = [g for y, obs in by_year.items() if y != season and (g := _greenup_doy(obs))]
    if target is None or len(history) < 3:
        return no_data("season_progress.no_data")
    days = round(median(history) - target)  # + adelantado, − atrasado
    if days > 5:
        key, risk = "season_progress.ahead", RiskLevel.LOW
    elif days >= -5:
        key, risk = "season_progress.normal", RiskLevel.LOW
    else:
        key, risk = "season_progress.behind", RiskLevel.MEDIUM if days >= -12 else RiskLevel.HIGH
    years = sorted(by_year)
    return Indicator(
        id=IndicatorId.SEASON_PROGRESS,
        risk=risk,
        message=Message(key, {"days": abs(days), "season": season}),
        value=float(days),
        unit="days",
        evidence=Evidence(sources=sensors, years=(years[0], years[-1]), method=ev.method),
        confidence=Confidence.MEDIUM,
        field_check=Message("check.scout_field"),
        series=tuple(SeriesPoint(o.day.isoformat(), round(o.ndvi, 3)) for o in by_year[season]),
    )
