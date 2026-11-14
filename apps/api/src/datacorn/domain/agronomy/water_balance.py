"""Gemelo de agua del suelo: balance diario FAO-56 en la zona de raíces (RF-12, RF-15)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from datacorn.domain.crops import CropParameters, YieldResponse
from datacorn.domain.models import ClimateSeries, FieldInputs, SoilProfile, Terrain
from datacorn.domain.report import StageWindow


@dataclass(frozen=True, slots=True)
class WaterBalanceDay:
    day: date
    et0_mm: float
    etc_mm: float  # ETc ajustada (Ks · Kc · ET0)
    ks: float  # coeficiente de estrés hídrico
    depletion_mm: float  # Dr
    taw_mm: float  # agua total disponible
    raw_mm: float  # agua fácilmente disponible
    rain_mm: float
    irrigation_mm: float
    runoff_mm: float  # número de curva SCS
    deep_percolation_mm: float


def simulate(
    climate: ClimateSeries,
    *,
    stages: tuple[StageWindow, ...],
    soil: SoilProfile,
    terrain: Terrain | None,
    inputs: FieldInputs,
    params: CropParameters,
    lat_deg: float,
    elevation_m: float,
    initial_depletion_mm: float = 0.0,
) -> tuple[WaterBalanceDay, ...]:
    """Balance diario desde la siembra hasta la madurez. Con riego, repone al llegar a RAW."""
    raise NotImplementedError("F4: balance de agua FAO-56")


def flowering_deficit_mm(
    balance: tuple[WaterBalanceDay, ...], stages: tuple[StageWindow, ...]
) -> float:
    """Déficit de transpiración acumulado en la ventana de floración."""
    raise NotImplementedError("F4: déficit en floración")


def relative_yield_loss(
    balance: tuple[WaterBalanceDay, ...], stages: tuple[StageWindow, ...], ky: YieldResponse
) -> float:
    """FAO-33: 1 − Ya/Ym = Ky · (1 − ETa/ETm), por etapa."""
    raise NotImplementedError("F4: pérdida relativa de rendimiento por agua")
