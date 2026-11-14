"""Parámetros de cultivo. Los valores vienen de resources/crops/*.yaml (con su referencia)."""

from __future__ import annotations

from dataclasses import dataclass

from datacorn.domain.models import Crop


@dataclass(frozen=True, slots=True)
class KcCurve:
    """Coeficientes de cultivo FAO-56 (tabla 12)."""

    ini: float
    mid: float
    end: float


@dataclass(frozen=True, slots=True)
class YieldResponse:
    """Factor de respuesta del rendimiento al agua Ky (FAO-33), por etapa."""

    total: float
    vegetative: float
    flowering: float
    grain_fill: float
    ripening: float


@dataclass(frozen=True, slots=True)
class CropParameters:
    crop: Crop
    base_temp_c: float
    upper_temp_c: float
    heat_stress_c: float
    frost_c: float
    kc: KcCurve
    ky: YieldResponse
    root_depth_min_m: float
    root_depth_max_m: float
    depletion_fraction_p: float
    # Grados-día (°C·día) hasta madurez fisiológica, por madurez relativa del híbrido
    gdd_maturity_by_rm: tuple[tuple[int, float], ...]
    # Fracción de esos grados-día hasta la floración
    gdd_flowering_fraction: float
    references: tuple[str, ...]
