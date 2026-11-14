"""Resumen de la campaña, línea de tiempo y confianza (RF-30, RF-31)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import FieldContext
from datacorn.domain.report import Confidence, Indicator, Summary, Timeline


def confidence(*, context: FieldContext, indicators: Sequence[Indicator]) -> Confidence:
    """Baja si faltan fuentes locales (región global) o si los datos discrepan entre sí."""
    raise NotImplementedError("F8: confianza")


def summarize(*, context: FieldContext, indicators: Sequence[Indicator]) -> Summary:
    """Semáforo de la campaña, recomendación en una frase y los 3 riesgos principales."""
    raise NotImplementedError("F8: resumen de la campaña")


def timeline(
    *, outcomes: Sequence[ScenarioOutcome], indicators: Sequence[Indicator], today: date
) -> Timeline:
    """Etapas con su fecha probable y franjas de riesgo."""
    raise NotImplementedError("F8: línea de tiempo")
