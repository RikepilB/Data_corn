"""Resumen de la campaña, línea de tiempo y confianza (RF-30, RF-31)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta

from datacorn.domain.agronomy._common import SEVERITY
from datacorn.domain.agronomy.scenarios import ScenarioOutcome, typical
from datacorn.domain.models import FieldContext
from datacorn.domain.report import (
    Confidence,
    Indicator,
    IndicatorId,
    Message,
    RiskBand,
    RiskLevel,
    Summary,
    Timeline,
)

# Indicadores que deciden el veredicto de la campaña
DECISIVE = (
    IndicatorId.FLOWERING_WATER,
    IndicatorId.FLOWERING_HEAT,
    IndicatorId.HYBRID_FIT,
    IndicatorId.FROST,
    IndicatorId.IRRIGATION,
    IndicatorId.WATERLOGGING,
    IndicatorId.PLANTING_WINDOW,
    IndicatorId.SEASON_PROGRESS,
)


def confidence(*, context: FieldContext, indicators: Sequence[Indicator]) -> Confidence:
    """Baja con fuentes solo globales; media si faltan datos del lote."""
    if context.region_id == "global":
        return Confidence.LOW
    missing = sum(i.risk is RiskLevel.NO_DATA for i in indicators)
    if context.soil is None or missing > 2:
        return Confidence.MEDIUM
    return Confidence.HIGH


def summarize(*, context: FieldContext, indicators: Sequence[Indicator]) -> Summary:
    """Semáforo de la campaña, recomendación en una frase y los 3 riesgos principales."""
    decisive = [i for i in indicators if i.id in DECISIVE and i.risk is not RiskLevel.NO_DATA]
    ranked = sorted(decisive, key=lambda i: SEVERITY[i.risk], reverse=True)
    top = tuple(i.id for i in ranked if i.risk is not RiskLevel.LOW)[:3]
    overall = ranked[0].risk if ranked else RiskLevel.NO_DATA
    window = next((i for i in indicators if i.id is IndicatorId.PLANTING_WINDOW), None)
    params: dict[str, str | int | float] = dict(window.message.params) if window else {}
    if top:
        params["main_indicator"] = top[0].value
        key = "summary.watch"
    else:
        key = "summary.good"
    return Summary(
        risk=overall,
        confidence=confidence(context=context, indicators=indicators),
        recommendation=Message(key, params),
        top_risks=top,
    )


def timeline(
    *, outcomes: Sequence[ScenarioOutcome], indicators: Sequence[Indicator], today: date
) -> Timeline:
    """Etapas del año típico con franjas de riesgo (agua y calor en floración, heladas)."""
    t = typical(outcomes)
    risk = {i.id: i.risk for i in indicators}
    bands: list[RiskBand] = []
    for ind in (IndicatorId.FLOWERING_WATER, IndicatorId.FLOWERING_HEAT):
        if risk.get(ind, RiskLevel.LOW) not in (RiskLevel.LOW, RiskLevel.NO_DATA):
            bands.append(RiskBand(ind, t.phen.flowering_start, t.phen.flowering_end, risk[ind]))
    frost_risk = risk.get(IndicatorId.FROST, RiskLevel.LOW)
    if frost_risk not in (RiskLevel.LOW, RiskLevel.NO_DATA):
        end = t.phen.maturity or t.phen.last_day
        bands.append(RiskBand(IndicatorId.FROST, end - timedelta(days=15), end, frost_risk))
    last = t.phen.harvest or t.phen.last_day
    return Timeline(
        stages=t.stages,
        risk_bands=tuple(bands),
        today=today if t.phen.planting <= today <= last else None,
    )
