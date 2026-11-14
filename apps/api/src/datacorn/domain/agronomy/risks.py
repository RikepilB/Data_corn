"""Indicadores de riesgo a partir de los escenarios (RF-10 a RF-14)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.crops import CropParameters
from datacorn.domain.models import SoilMoistureObservation
from datacorn.domain.report import Indicator


def planting_window(
    *,
    runs_by_date: Mapping[date, Sequence[ScenarioOutcome]],
    soil_moisture: Sequence[SoilMoistureObservation],
    chosen: date,
) -> Indicator:
    """RF-10: rango de fechas con buena humedad y sin helada; dónde cae la fecha elegida."""
    raise NotImplementedError("F4: ventana de siembra")


def hybrid_fit(
    *, outcomes: Sequence[ScenarioOutcome], hybrid_rm_days: int, params: CropParameters
) -> Indicator:
    """RF-11: probabilidad de madurar antes de la primera helada."""
    raise NotImplementedError("F3: ajuste del híbrido")


def flowering_water(*, outcomes: Sequence[ScenarioOutcome], params: CropParameters) -> Indicator:
    """RF-12: años con estrés hídrico en floración y pérdida estimada."""
    raise NotImplementedError("F4: agua en floración")


def flowering_heat(*, outcomes: Sequence[ScenarioOutcome], params: CropParameters) -> Indicator:
    """RF-13: días sobre el umbral de calor en floración."""
    raise NotImplementedError("F5: calor en floración")


def frost(*, outcomes: Sequence[ScenarioOutcome]) -> Indicator:
    """RF-14: helada tardía tras la siembra y temprana antes de la madurez."""
    raise NotImplementedError("F3: helada")
