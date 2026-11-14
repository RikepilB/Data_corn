"""Fenología del maíz por grados-día (RF-11, RF-31)."""

from __future__ import annotations

from datetime import date

from datacorn.domain.crops import CropParameters
from datacorn.domain.models import ClimateSeries
from datacorn.domain.report import StageWindow


def daily_gdd(tmin_c: float, tmax_c: float, *, base_c: float, upper_c: float) -> float:
    """Grados-día del día (método 86/50 en °C: temperaturas acotadas a [base, upper])."""
    raise NotImplementedError("F3: grados-día diarios")


def gdd_to_maturity(params: CropParameters, hybrid_rm_days: int) -> float:
    """Grados-día hasta madurez para una madurez relativa (interpolación de la tabla del YAML)."""
    raise NotImplementedError("F3: grados-día requeridos por madurez del híbrido")


def default_hybrid_rm(lat_deg: float) -> int:
    """Madurez relativa por defecto según la latitud (RF-06)."""
    raise NotImplementedError("F2: madurez por defecto según la latitud")


def stage_windows(
    climate: ClimateSeries, *, planting_date: date, hybrid_rm_days: int, params: CropParameters
) -> tuple[StageWindow, ...]:
    """Fechas de siembra, emergencia, floración (±2 semanas), llenado, madurez y cosecha."""
    raise NotImplementedError("F3: etapas por grados-día")
