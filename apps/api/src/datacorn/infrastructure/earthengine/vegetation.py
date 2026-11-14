"""NDVI del lote y zonas estables (VegetationPort)."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date

from datacorn.domain.models import FieldGeometry, VegetationObservation
from datacorn.infrastructure.earthengine.session import EarthEngineSession

HLS_L30 = "NASA/HLS/HLSL30/v002"  # Landsat armonizado, 30 m
HLS_S30 = "NASA/HLS/HLSS30/v002"  # Sentinel-2 armonizado, 30 m
SENTINEL2_SR = "COPERNICUS/S2_SR_HARMONIZED"  # 10 m, para zonas dentro del lote
MODIS_VI = "MODIS/061/MOD13Q1"  # 250 m, 16 días, desde 2000 (historia larga)


class HlsSentinel2Vegetation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]:
        raise NotImplementedError("F5: NDVI HLS + Sentinel-2 sin nubes")

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]:
        raise NotImplementedError("F5: zonas estables con NDVI de varias campañas + NASADEM")


class ModisVegetation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]:
        raise NotImplementedError("F5: NDVI MODIS")

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]:
        raise NotImplementedError("F5: MODIS es muy grueso para zonas; devolver DataUnavailable")
