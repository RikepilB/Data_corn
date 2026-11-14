"""Rotación: maíz tras maíz vs maíz tras soya (RF-20)."""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import FieldContext, FieldInputs
from datacorn.domain.report import RotationComparison


def compare(
    *, context: FieldContext, inputs: FieldInputs, outcomes: Sequence[ScenarioOutcome]
) -> RotationComparison:
    """Agua al sembrar, residuos y erosión, historial del lote (CDL) y rendimiento del condado."""
    raise NotImplementedError("F7: comparación de rotación")
