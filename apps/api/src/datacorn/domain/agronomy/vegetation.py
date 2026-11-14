"""NDVI del lote: suavizado y avance de la campaña (RF-16)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date

from datacorn.domain.models import VegetationObservation
from datacorn.domain.report import Indicator


def smooth(observations: Sequence[VegetationObservation]) -> tuple[VegetationObservation, ...]:
    """Serie diaria suavizada (Savitzky-Golay) a partir de HLS, Sentinel-2 y MODIS."""
    raise NotImplementedError("F5: suavizado del NDVI")


def season_progress(
    *, ndvi: Sequence[VegetationObservation], planting_date: date, today: date
) -> Indicator:
    """Compara la curva de esta campaña con la de los otros años del mismo lote."""
    raise NotImplementedError("F5: avance de la campaña")
