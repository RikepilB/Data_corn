"""El Niño / La Niña: fase y cómo le fue al lote en cada fase (RF-19).

El efecto no se supone: se mide en la historia del lote. Así el mismo cálculo sirve en el
Corn Belt (relación débil) y en la costa del Perú (relación fuerte, con ICEN).
"""

from __future__ import annotations

from collections.abc import Sequence
from statistics import median
from typing import TYPE_CHECKING

from datacorn.domain.models import CountyYield, EnsoPhase, EnsoState
from datacorn.domain.report import EnsoInsight, EnsoPhaseOutcome, Message

if TYPE_CHECKING:
    from datacorn.domain.agronomy.scenarios import ScenarioOutcome

THRESHOLDS = {"ONI": 0.5, "ICEN": 0.4}
MIN_YEARS_PER_PHASE = 5  # con menos años en la fase, no se afirma un efecto


def classify(value: float, *, index: str = "ONI") -> EnsoPhase:
    """Fase según el índice (ONI: ±0.5 °C; ICEN: ±0.4 °C)."""
    t = THRESHOLDS.get(index, 0.5)
    if value >= t:
        return EnsoPhase.EL_NINO
    if value <= -t:
        return EnsoPhase.LA_NINA
    return EnsoPhase.NEUTRAL


def insight(
    *,
    now: EnsoState | None,
    outcomes: Sequence[ScenarioOutcome],
    county_yields: Sequence[CountyYield],
) -> EnsoInsight:
    """Agrupa los escenarios por fase y mide la fuerza de la relación."""
    groups: dict[EnsoPhase, list[ScenarioOutcome]] = {}
    for o in outcomes:
        if o.scenario.enso_phase is not None:
            groups.setdefault(o.scenario.enso_phase, []).append(o)
    results = tuple(
        EnsoPhaseOutcome(
            phase=phase,
            years=tuple(sorted(o.scenario.analog_year for o in group)),
            flowering_water_deficit_mm=round(median(o.flowering_deficit_mm for o in group), 1),
            flowering_heat_days=float(median(o.flowering_heat_days for o in group)),
            relative_yield=round(median(1 - o.relative_yield_loss for o in group), 3),
        )
        for phase, group in sorted(groups.items())
    )
    by_phase = {r.phase: r for r in results}
    neutral = by_phase.get(EnsoPhase.NEUTRAL)
    current = by_phase.get(now.phase) if now else None
    delta = 0.0
    if neutral and current and neutral.relative_yield and current.relative_yield:
        delta = current.relative_yield - neutral.relative_yield
    enough = current is not None and len(current.years) >= MIN_YEARS_PER_PHASE
    if not enough or abs(delta) < 0.03:
        strength = "weak"  # pocos años en esta fase o diferencia chica: no hay evidencia
    else:
        strength = "moderate" if abs(delta) < 0.08 else "strong"
    return EnsoInsight(
        now=now,
        outcomes=results,
        signal_strength=strength,
        message=Message(
            f"enso.{strength}",
            {
                "now_phase": now.phase.value if now else EnsoPhase.NEUTRAL.value,
                "delta_pct": round(100 * delta),
                "years": len(current.years) if current else 0,
            },
        ),
    )
