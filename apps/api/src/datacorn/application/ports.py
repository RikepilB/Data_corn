"""Puertos: lo que la aplicación necesita de afuera. La infraestructura los implementa.

Cada región elige qué adaptador cumple cada puerto (resources/regions/*.yaml).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from typing import Protocol, TypeVar

from datacorn.domain.crops import CropParameters
from datacorn.domain.models import (
    AdminArea,
    ClimateSeries,
    CountyYield,
    Crop,
    CropYear,
    EnsoState,
    EvapotranspirationObservation,
    FieldGeometry,
    IrrigationSystem,
    LonLat,
    SoilMoistureObservation,
    SoilProfile,
    Terrain,
    VegetationObservation,
)

T = TypeVar("T")


# --- Datos del lote -----------------------------------------------------------------------


class ClimatePort(Protocol):
    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries: ...


class SoilPort(Protocol):
    def profile(self, geometry: FieldGeometry) -> SoilProfile: ...


class ElevationPort(Protocol):
    def terrain(self, geometry: FieldGeometry) -> Terrain: ...


class CropHistoryPort(Protocol):
    def history(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> tuple[CropYear, ...]: ...


class VegetationPort(Protocol):
    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]: ...

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]: ...


class SoilMoisturePort(Protocol):
    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]: ...


class EvapotranspirationPort(Protocol):
    def actual(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[EvapotranspirationObservation, ...]: ...


class EnsoPort(Protocol):
    def current(self) -> EnsoState: ...

    def history(self, first_year: int, last_year: int) -> tuple[EnsoState, ...]: ...


class YieldStatsPort(Protocol):
    def county_yields(
        self, admin: AdminArea, crop: Crop, first_year: int, last_year: int
    ) -> tuple[CountyYield, ...]: ...

    def typical_planting_date(self, admin: AdminArea, crop: Crop, season: int) -> date | None: ...


class AdminAreaPort(Protocol):
    def locate(self, point: LonLat) -> AdminArea: ...


# --- Regiones -----------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class RegionDataSources:
    """Los adaptadores que una región usa para cada puerto (con su cadena de respaldo)."""

    region_id: str
    admin: AdminAreaPort
    climate: ClimatePort
    soil: SoilPort
    elevation: ElevationPort
    vegetation: VegetationPort
    soil_moisture: SoilMoisturePort
    evapotranspiration: EvapotranspirationPort
    enso: EnsoPort
    crop_history: CropHistoryPort | None = None  # no todas las regiones tienen mapa de cultivos
    yield_stats: YieldStatsPort | None = None


@dataclass(frozen=True, slots=True)
class RegionInfo:
    id: str
    name: Mapping[str, str]  # {"es": ..., "en": ...}
    status: str  # "active" | "planned"
    providers: Mapping[str, tuple[str, ...]]


class RegionResolverPort(Protocol):
    def resolve(self, point: LonLat) -> RegionDataSources: ...

    def catalog(self) -> tuple[RegionInfo, ...]: ...


# --- Soporte ------------------------------------------------------------------------------


class CropCatalogPort(Protocol):
    def get(self, crop: Crop) -> CropParameters: ...


class CachePort(Protocol):
    def get(self, key: str, type_: type[T]) -> T | None: ...

    def put(self, key: str, value: object) -> None: ...


class ClockPort(Protocol):
    def today(self) -> date: ...


@dataclass(frozen=True, slots=True)
class DemoField:
    id: str
    name: Mapping[str, str]
    region_id: str
    irrigation: IrrigationSystem
    geometry: Mapping[str, object]  # GeoJSON Polygon


class DemoFieldsPort(Protocol):
    def list(self) -> tuple[DemoField, ...]: ...


# --- Capas del mapa -----------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class TileLayer:
    """Capa de teselas XYZ lista para el mapa, con lo necesario para su leyenda."""

    id: str
    month: str  # AAAA-MM
    url_template: str  # .../{z}/{x}/{y}
    min: float
    max: float
    unit: str
    palette: tuple[str, ...]  # de `min` a `max`
    source: str


class DroughtLayerPort(Protocol):
    def tiles(self, month: date) -> TileLayer: ...
