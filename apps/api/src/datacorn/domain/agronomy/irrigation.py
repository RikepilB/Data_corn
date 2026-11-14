"""Riego: lámina de la semana pico frente a la capacidad del equipo (RF-15)."""

from __future__ import annotations

from collections.abc import Sequence
from statistics import median

from datacorn.domain.agronomy._common import by_fraction, confidence_by_sample, evidence
from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.agronomy.water_balance import irrigation_capacity
from datacorn.domain.models import EvapotranspirationObservation, FieldInputs, IrrigationSystem
from datacorn.domain.report import Indicator, IndicatorId, Message, RiskLevel, SeriesPoint

STRESS_DEFICIT_MM = 15.0  # con riego, cualquier déficit apreciable en floración cuenta
STRESS_LOSS = 0.05


def irrigation(
    *,
    outcomes: Sequence[ScenarioOutcome],
    inputs: FieldInputs,
    observed_et: Sequence[EvapotranspirationObservation],
) -> Indicator | None:
    """None si el lote es de secano. Valida contra la ET observada donde haya datos."""
    if inputs.irrigation is IrrigationSystem.NONE or not outcomes:
        return None
    cap, eff = irrigation_capacity(inputs)
    capacity_week = cap * eff * 7
    peak = median(o.peak_week_etc_mm for o in outcomes)
    season = median(o.irrigation_mm for o in outcomes)
    # El riesgo es el estrés que queda a pesar del riego: si el equipo no alcanza el pico pero el
    # agua guardada en el suelo cubre la diferencia, el cultivo no sufre.
    stressed = sum(
        o.flowering_deficit_mm >= STRESS_DEFICIT_MM or o.relative_yield_loss >= STRESS_LOSS
        for o in outcomes
    ) / len(outcomes)
    risk = by_fraction(stressed, medium=0.1, high=0.3)
    if risk is RiskLevel.HIGH:
        key = "irrigation.short"
    elif peak > capacity_week:
        key = "irrigation.tight"  # el suelo cubre la semana pico
    else:
        key = "irrigation.ok"
    extra = tuple(sorted({o.source for o in observed_et}))
    return Indicator(
        id=IndicatorId.IRRIGATION,
        risk=risk,
        message=Message(
            key,
            {
                "peak_week_mm": round(peak, 1),
                "capacity_week_mm": round(capacity_week, 1),
                "season_mm": round(season),
            },
        ),
        value=round(peak, 1),
        unit="mm_week",
        evidence=evidence(outcomes, "method.irrigation", *extra),
        confidence=confidence_by_sample(len(outcomes)),
        field_check=Message("check.irrigation_schedule"),
        series=tuple(
            SeriesPoint(str(o.scenario.analog_year), round(o.irrigation_mm)) for o in outcomes
        ),
    )
