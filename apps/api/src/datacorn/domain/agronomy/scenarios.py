"""Escenarios de campaña: lo observado hasta hoy + cada año histórico para lo que falta.

Un solo cálculo sirve para antes, durante y después de la campaña (docs/flujo.md §3).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from datacorn.domain.agronomy.water_balance import WaterBalanceDay
from datacorn.domain.crops import CropParameters
from datacorn.domain.models import ClimateSeries, EnsoPhase, EnsoState, FieldContext, FieldInputs
from datacorn.domain.report import StageWindow


@dataclass(frozen=True, slots=True)
class SeasonScenario:
    analog_year: int  # año histórico que completa los días que faltan
    climate: ClimateSeries
    enso_phase: EnsoPhase | None = None


@dataclass(frozen=True, slots=True)
class ScenarioOutcome:
    scenario: SeasonScenario
    stages: tuple[StageWindow, ...]
    balance: tuple[WaterBalanceDay, ...]
    flowering_deficit_mm: float
    flowering_heat_days: int
    late_frost: bool  # helada después de la emergencia
    frost_before_maturity: bool
    relative_yield_loss: float


def build(
    history: ClimateSeries, *, season: int, planting_date: date, today: date
) -> tuple[SeasonScenario, ...]:
    """Arma un escenario por año histórico, con los días observados de la campaña al inicio."""
    raise NotImplementedError("F3: escenarios de campaña")


def tag_enso(
    scenarios: tuple[SeasonScenario, ...], enso_history: tuple[EnsoState, ...]
) -> tuple[SeasonScenario, ...]:
    """Marca cada escenario con la fase de El Niño de su campaña."""
    raise NotImplementedError("F6: fase ENSO de cada año análogo")


def candidate_planting_dates(chosen: date) -> tuple[date, ...]:
    """Fechas de siembra a evaluar alrededor de la elegida (ventana de siembra, RF-10)."""
    raise NotImplementedError("F4: fechas candidatas de siembra")


def run(
    scenario: SeasonScenario,
    *,
    inputs: FieldInputs,
    context: FieldContext,
    params: CropParameters,
) -> ScenarioOutcome:
    """Fenología → balance de agua → calor → helada → pérdida de rendimiento."""
    raise NotImplementedError("F3/F4: corrida de un escenario")
