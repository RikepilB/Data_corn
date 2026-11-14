"""Reporte del lote: lo que la pantalla única muestra.

Las frases no van armadas: cada texto es una clave i18n con sus parámetros, y la web lo
traduce (es/en). Así el mismo reporte sirve para los dos idiomas.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum

from datacorn.domain.models import (
    Crop,
    CropYear,
    EnsoPhase,
    EnsoState,
    FieldContext,
    FieldInputs,
    Stage,
)


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    NO_DATA = "no_data"


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IndicatorId(StrEnum):
    PLANTING_WINDOW = "planting_window"  # RF-10
    HYBRID_FIT = "hybrid_fit"  # RF-11
    FLOWERING_WATER = "flowering_water"  # RF-12
    FLOWERING_HEAT = "flowering_heat"  # RF-13
    FROST = "frost"  # RF-14
    IRRIGATION = "irrigation"  # RF-15
    SEASON_PROGRESS = "season_progress"  # RF-16
    WATERLOGGING = "waterlogging"  # RF-17
    FIELD_ZONES = "field_zones"  # RF-18


@dataclass(frozen=True, slots=True)
class Message:
    """Texto traducible: clave i18n y parámetros."""

    key: str
    params: Mapping[str, str | int | float] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Evidence:
    sources: tuple[str, ...]
    years: tuple[int, int] | None
    method: str


@dataclass(frozen=True, slots=True)
class SeriesPoint:
    x: str
    y: float


@dataclass(frozen=True, slots=True)
class Indicator:
    id: IndicatorId
    risk: RiskLevel
    message: Message  # frase simple (gerente)
    value: float | None  # número clave
    unit: str | None
    evidence: Evidence  # detalle (agrónomo)
    confidence: Confidence
    field_check: Message | None = None  # qué revisar en campo
    series: tuple[SeriesPoint, ...] = ()


@dataclass(frozen=True, slots=True)
class StageWindow:
    stage: Stage
    start: date
    end: date


@dataclass(frozen=True, slots=True)
class RiskBand:
    indicator: IndicatorId
    start: date
    end: date
    risk: RiskLevel


@dataclass(frozen=True, slots=True)
class Timeline:
    stages: tuple[StageWindow, ...]
    risk_bands: tuple[RiskBand, ...]
    today: date | None


@dataclass(frozen=True, slots=True)
class RotationOption:
    previous_crop: Crop
    relative_yield: float | None
    planting_soil_water_mm: float | None
    residue_erosion_risk: RiskLevel
    notes: tuple[Message, ...] = ()


@dataclass(frozen=True, slots=True)
class RotationComparison:
    """RF-20: maíz tras maíz vs maíz tras soya."""

    options: tuple[RotationOption, ...]
    recommended: Crop | None
    field_history: tuple[CropYear, ...]
    message: Message


@dataclass(frozen=True, slots=True)
class EnsoPhaseOutcome:
    phase: EnsoPhase
    years: tuple[int, ...]
    flowering_water_deficit_mm: float | None
    flowering_heat_days: float | None
    relative_yield: float | None


@dataclass(frozen=True, slots=True)
class EnsoInsight:
    """RF-19: la relación se mide en la historia del lote, no se supone."""

    now: EnsoState | None
    outcomes: tuple[EnsoPhaseOutcome, ...]
    signal_strength: str  # "weak" | "moderate" | "strong"
    message: Message


@dataclass(frozen=True, slots=True)
class SeasonRun:
    """Una campaña simulada (película y franjas, RF-31 y RF-38).

    `water_pct[i]` es el agua disponible en la zona de raíces (0-100 %) del día `start + i`;
    `tmax_c[i]` la máxima de ese día. La serie va de la siembra a la cosecha.
    """

    year: int  # año análogo (o el año observado)
    observed_days: int  # cuántos días del inicio son observados (0 = todo escenario)
    enso_phase: EnsoPhase | None
    start: date
    water_pct: tuple[int, ...]
    tmax_c: tuple[float, ...]
    stages: tuple[StageWindow, ...]
    flowering_deficit_mm: float
    flowering_heat_days: int
    relative_yield: float  # 1 = sin pérdida por agua


@dataclass(frozen=True, slots=True)
class Summary:
    """RF-30."""

    risk: RiskLevel
    confidence: Confidence
    recommendation: Message
    top_risks: tuple[IndicatorId, ...]


@dataclass(frozen=True, slots=True)
class FieldReport:
    context: FieldContext
    inputs: FieldInputs
    summary: Summary
    timeline: Timeline
    indicators: tuple[Indicator, ...]
    rotation: RotationComparison
    enso: EnsoInsight
    zones_geojson: Mapping[str, object] | None
    sources: tuple[str, ...]
    observed_until: date | None
    runs: tuple[SeasonRun, ...] = ()
    typical_year: int | None = None  # el año con el rendimiento relativo mediano
