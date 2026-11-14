"""Entidades y objetos de valor del dominio (unidades métricas)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import StrEnum


class IrrigationSystem(StrEnum):
    NONE = "none"
    PIVOT = "pivot"
    FURROW = "furrow"
    DRIP = "drip"


class Tillage(StrEnum):
    CONVENTIONAL = "conventional"
    REDUCED = "reduced"
    NO_TILL = "no_till"


class Crop(StrEnum):
    MAIZE = "maize"
    SOYBEAN = "soybean"
    OTHER = "other"
    FALLOW = "fallow"


class Stage(StrEnum):
    SOWING = "sowing"
    EMERGENCE = "emergence"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    GRAIN_FILL = "grain_fill"
    MATURITY = "maturity"
    HARVEST = "harvest"


class EnsoPhase(StrEnum):
    EL_NINO = "el_nino"
    LA_NINA = "la_nina"
    NEUTRAL = "neutral"


@dataclass(frozen=True, slots=True)
class LonLat:
    lon: float
    lat: float


@dataclass(frozen=True, slots=True)
class FieldGeometry:
    """Contorno del lote: anillo exterior cerrado en lon/lat (WGS84)."""

    ring: tuple[LonLat, ...]

    @property
    def vertex_count(self) -> int:
        closed = len(self.ring) > 1 and self.ring[0] == self.ring[-1]
        return len(self.ring) - 1 if closed else len(self.ring)


@dataclass(frozen=True, slots=True)
class FieldInputs:
    """Datos del formulario (RF-06)."""

    season: int
    planting_date: date
    hybrid_rm_days: int
    irrigation: IrrigationSystem = IrrigationSystem.NONE
    irrigation_capacity_mm_day: float | None = None
    tillage: Tillage = Tillage.CONVENTIONAL
    yield_goal_t_ha: float | None = None
    previous_crop: Crop | None = None  # None = usar el detectado (RF-07)


@dataclass(frozen=True, slots=True)
class AdminArea:
    country: str  # ISO 3166-1 alfa-2
    state: str | None = None
    county: str | None = None


@dataclass(frozen=True, slots=True)
class SoilProfile:
    texture_class: str
    sand_pct: float
    clay_pct: float
    organic_matter_pct: float | None
    available_water_mm_per_m: float
    drainage_class: str | None
    hydrologic_group: str | None
    source: str


@dataclass(frozen=True, slots=True)
class Terrain:
    elevation_m: float
    mean_slope_pct: float
    low_area_fraction: float
    source: str


@dataclass(frozen=True, slots=True)
class ClimateDay:
    day: date
    tmin_c: float
    tmax_c: float
    precip_mm: float
    solar_mj_m2: float | None = None
    rh_mean_pct: float | None = None
    wind_2m_m_s: float | None = None


@dataclass(frozen=True, slots=True)
class ClimateSeries:
    days: tuple[ClimateDay, ...]
    sources: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class CropYear:
    year: int
    crop: Crop
    source: str


@dataclass(frozen=True, slots=True)
class VegetationObservation:
    day: date
    ndvi: float
    sensor: str


@dataclass(frozen=True, slots=True)
class SoilMoistureObservation:
    day: date
    surface_m3_m3: float
    rootzone_m3_m3: float | None
    source: str


@dataclass(frozen=True, slots=True)
class EvapotranspirationObservation:
    start: date
    end: date
    et_mm: float
    source: str


@dataclass(frozen=True, slots=True)
class EnsoState:
    index: str  # "ONI", "ICEN"
    value: float
    phase: EnsoPhase
    period: str  # p. ej. "ASO 2026"


@dataclass(frozen=True, slots=True)
class CountyYield:
    year: int
    crop: Crop
    yield_t_ha: float
    source: str


@dataclass(frozen=True, slots=True)
class FieldContext:
    """Lo que se detecta solo a partir del contorno (RF-05)."""

    region_id: str
    admin: AdminArea
    area_ha: float
    centroid: LonLat
    soil: SoilProfile | None
    terrain: Terrain | None
    crop_history: tuple[CropYear, ...]
    county_yields: tuple[CountyYield, ...]
    enso_now: EnsoState | None


@dataclass(frozen=True, slots=True)
class FieldDefaults:
    """Valores por defecto del formulario."""

    planting_date: date
    hybrid_rm_days: int
    yield_goal_t_ha: float | None
