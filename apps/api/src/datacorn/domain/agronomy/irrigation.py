"""Riego: lámina semanal y capacidad del equipo (RF-15)."""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import EvapotranspirationObservation, FieldInputs
from datacorn.domain.report import Indicator


def irrigation(
    *,
    outcomes: Sequence[ScenarioOutcome],
    inputs: FieldInputs,
    observed_et: Sequence[EvapotranspirationObservation],
) -> Indicator | None:
    """Devuelve None si el lote es de secano. Valida contra OpenET donde haya datos."""
    raise NotImplementedError("F4: riego")
