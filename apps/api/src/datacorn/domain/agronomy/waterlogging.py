"""Riesgo de encharcamiento (RF-17)."""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy._common import by_fraction, confidence_by_sample, evidence
from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import SoilMoistureObservation, SoilProfile, Terrain
from datacorn.domain.report import Indicator, IndicatorId, Message, SeriesPoint

POOR_DRAINAGE = ("poorly", "very poorly", "somewhat poorly")


def _three_day_max(rain: list[float]) -> float:
    return max((sum(rain[i : i + 3]) for i in range(max(len(rain) - 2, 1))), default=0.0)


def waterlogging(
    *,
    outcomes: Sequence[ScenarioOutcome],
    soil: SoilProfile | None,
    terrain: Terrain | None,
    soil_moisture: Sequence[SoilMoistureObservation],
) -> Indicator:
    """Un año cuenta si, entre la siembra y la floración, llueve mucho en 3 días.

    El umbral baja si el suelo drena mal o es del grupo hidrológico D, o si es plano.
    """
    drainage = (soil.drainage_class or "").lower() if soil else ""
    poor = any(p in drainage for p in POOR_DRAINAGE) or (soil and soil.hydrologic_group == "D")
    flat = (
        terrain is not None and terrain.mean_slope_pct is not None and terrain.mean_slope_pct < 1.0
    )
    threshold = 75.0 if poor else 100.0
    if flat:
        threshold -= 10
    events = []
    for o in outcomes:
        rain = [b.rain_mm for b in o.balance if b.day <= o.phen.flowering_start]
        events.append(_three_day_max(rain) >= threshold)
    total = len(outcomes)
    years = sum(events)
    risk = by_fraction(years / total if total else 0.0, medium=0.15, high=0.35)
    return Indicator(
        id=IndicatorId.WATERLOGGING,
        risk=risk,
        message=Message(f"waterlogging.{risk.value}", {"years": years, "total": total}),
        value=float(years),
        unit="count",
        evidence=evidence(outcomes, "method.waterlogging", *((soil.source,) if soil else ())),
        confidence=confidence_by_sample(total),
        field_check=Message("check.drainage"),
        series=tuple(
            SeriesPoint(str(o.scenario.analog_year), 1.0 if e else 0.0)
            for o, e in zip(outcomes, events, strict=True)
        ),
    )
