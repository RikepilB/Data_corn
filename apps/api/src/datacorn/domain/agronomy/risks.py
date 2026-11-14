"""Indicadores de riesgo a partir de los escenarios (RF-10 a RF-14)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, timedelta
from statistics import median

from datacorn.domain.agronomy._common import (
    by_fraction,
    confidence_by_sample,
    evidence,
    worst,
)
from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.crops import CropParameters
from datacorn.domain.models import SoilMoistureObservation
from datacorn.domain.report import Indicator, IndicatorId, Message, RiskLevel, SeriesPoint

STRESS_DEFICIT_MM = 30.0  # déficit de transpiración en floración que cuenta como estrés
STRESS_LOSS = 0.15  # o pérdida relativa de rendimiento por agua ≥ 15 %
WINDOW_TOLERANCE = 0.03  # fechas a ≤ 3 puntos del mejor puntaje forman la ventana
HIGH_PENALTY = 0.08  # la fecha elegida rinde ≥ 8 puntos menos que la mejor → riesgo alto


def _score(outcomes: Sequence[ScenarioOutcome]) -> float:
    """Rendimiento relativo mediano, castigado por la probabilidad de helada."""
    if not outcomes:
        return 0.0
    n = len(outcomes)
    yield_rel = median(1 - o.relative_yield_loss for o in outcomes)
    frost = sum(o.late_frost for o in outcomes) / n + sum(o.frost_before_maturity for o in outcomes) / n
    return yield_rel - 0.5 * frost


def planting_window(
    *,
    runs_by_date: Mapping[date, Sequence[ScenarioOutcome]],
    soil_moisture: Sequence[SoilMoistureObservation],
    chosen: date,
) -> Indicator:
    """RF-10: fechas con mejor rendimiento esperado y sin helada; dónde cae la elegida."""
    scores = {d: _score(o) for d, o in sorted(runs_by_date.items())}
    best = max(scores.values())
    good = [d for d, s in scores.items() if s >= best - WINDOW_TOLERANCE]
    start, end = min(good) - timedelta(days=3), max(good) + timedelta(days=3)
    outcomes = runs_by_date.get(chosen) or next(iter(runs_by_date.values()))
    penalty = best - _score(outcomes)  # lo que se pierde por no sembrar en la mejor fecha
    if start <= chosen <= end or penalty <= WINDOW_TOLERANCE:
        key, risk = "planting_window.inside", RiskLevel.LOW
    else:
        key = "planting_window.early" if chosen < start else "planting_window.late"
        risk = RiskLevel.HIGH if penalty >= HIGH_PENALTY else RiskLevel.MEDIUM
    return Indicator(
        id=IndicatorId.PLANTING_WINDOW,
        risk=risk,
        message=Message(key, {"start_date": start.isoformat(), "end_date": end.isoformat()}),
        value=None,
        unit=None,
        evidence=evidence(outcomes, "method.planting_window"),
        confidence=confidence_by_sample(len(outcomes)),
        field_check=Message("check.soil_probe"),
        series=tuple(SeriesPoint(d.isoformat(), round(s, 3)) for d, s in scores.items()),
    )


def hybrid_fit(
    *, outcomes: Sequence[ScenarioOutcome], hybrid_rm_days: int, params: CropParameters
) -> Indicator:
    """RF-11: años en que el híbrido madura antes de la primera helada mortal."""
    total = len(outcomes)
    ok = sum(not o.frost_before_maturity for o in outcomes)
    share = ok / total if total else 0.0
    if share >= 0.9:
        key, risk = "hybrid_fit.ok", RiskLevel.LOW
    elif share >= 0.75:
        key, risk = "hybrid_fit.tight", RiskLevel.MEDIUM
    else:
        key, risk = "hybrid_fit.risky", RiskLevel.HIGH
    return Indicator(
        id=IndicatorId.HYBRID_FIT,
        risk=risk,
        message=Message(key, {"years": ok, "total": total, "rm": hybrid_rm_days}),
        value=float(ok),
        unit="count",
        evidence=evidence(outcomes, "method.hybrid_fit"),
        confidence=confidence_by_sample(total),
        field_check=Message("check.frost_low_spots"),
        series=tuple(
            SeriesPoint(str(o.scenario.analog_year), 0.0 if o.frost_before_maturity else 1.0)
            for o in outcomes
        ),
    )


def flowering_water(*, outcomes: Sequence[ScenarioOutcome], params: CropParameters) -> Indicator:
    """RF-12: años con estrés hídrico en floración y pérdida estimada."""
    total = len(outcomes)
    stressed = sum(
        o.flowering_deficit_mm >= STRESS_DEFICIT_MM or o.relative_yield_loss >= STRESS_LOSS
        for o in outcomes
    )
    loss = median(o.relative_yield_loss for o in outcomes) if outcomes else 0.0
    share = stressed / total if total else 0.0
    risk = by_fraction(share, medium=0.2, high=0.45)
    return Indicator(
        id=IndicatorId.FLOWERING_WATER,
        risk=risk,
        message=Message(
            f"flowering_water.{risk.value}",
            {"years": stressed, "total": total, "loss_pct": round(100 * loss)},
        ),
        value=float(stressed),
        unit="count",
        evidence=evidence(outcomes, "method.flowering_water"),
        confidence=confidence_by_sample(total),
        field_check=Message("check.soil_probe"),
        series=tuple(
            SeriesPoint(str(o.scenario.analog_year), round(o.flowering_deficit_mm, 1))
            for o in outcomes
        ),
    )


def flowering_heat(*, outcomes: Sequence[ScenarioOutcome], params: CropParameters) -> Indicator:
    """RF-13: días sobre el umbral de calor en floración."""
    days = median(o.flowering_heat_days for o in outcomes) if outcomes else 0
    risk = RiskLevel.LOW if days <= 1 else RiskLevel.MEDIUM if days <= 4 else RiskLevel.HIGH
    return Indicator(
        id=IndicatorId.FLOWERING_HEAT,
        risk=risk,
        message=Message(
            f"flowering_heat.{risk.value}",
            {"days": round(days), "threshold_c": params.heat_stress_c},
        ),
        value=float(round(days)),
        unit="days",
        evidence=evidence(outcomes, "method.flowering_heat"),
        confidence=confidence_by_sample(len(outcomes)),
        field_check=Message("check.scout_silking"),
        series=tuple(
            SeriesPoint(str(o.scenario.analog_year), float(o.flowering_heat_days)) for o in outcomes
        ),
    )


def frost(*, outcomes: Sequence[ScenarioOutcome]) -> Indicator:
    """RF-14: helada tardía tras la emergencia y helada mortal antes de la madurez."""
    total = len(outcomes) or 1
    late = sum(o.late_frost for o in outcomes) / total
    early = sum(o.frost_before_maturity for o in outcomes) / total
    risk = worst(by_fraction(late, medium=0.1, high=0.25), by_fraction(early, medium=0.1, high=0.25))
    return Indicator(
        id=IndicatorId.FROST,
        risk=risk,
        message=Message(
            f"frost.{risk.value}", {"late_pct": round(100 * late), "early_pct": round(100 * early)}
        ),
        value=round(late, 3),
        unit="fraction",
        evidence=evidence(outcomes, "method.frost"),
        confidence=confidence_by_sample(len(outcomes)),
        field_check=Message("check.frost_low_spots"),
    )
