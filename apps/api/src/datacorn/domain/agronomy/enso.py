"""El Niño / La Niña: fase y cómo le fue al lote en cada fase (RF-19).

El efecto no se supone: se mide en la historia del lote. Así el mismo cálculo sirve en el
Corn Belt (relación débil) y en la costa del Perú (relación fuerte, con ICEN).
"""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import CountyYield, EnsoPhase, EnsoState
from datacorn.domain.report import EnsoInsight


def classify(value: float, *, index: str = "ONI") -> EnsoPhase:
    """Fase según el índice (ONI: ±0.5 °C; ICEN: categorías de ENFEN)."""
    raise NotImplementedError("F6: clasificación de la fase")


def insight(
    *,
    now: EnsoState | None,
    outcomes: Sequence[ScenarioOutcome],
    county_yields: Sequence[CountyYield],
) -> EnsoInsight:
    """Agrupa los escenarios por fase y mide la fuerza de la relación."""
    raise NotImplementedError("F6: El Niño / La Niña en este lote")
