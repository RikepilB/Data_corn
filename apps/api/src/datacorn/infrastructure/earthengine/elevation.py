"""Relieve del lote (ElevationPort)."""

from __future__ import annotations

from datacorn.domain.models import FieldGeometry, Terrain
from datacorn.infrastructure.earthengine.session import EarthEngineSession

NASADEM = "NASA/NASADEM_HGT/001"  # SRTM reprocesado, 30 m


class NasademElevation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def terrain(self, geometry: FieldGeometry) -> Terrain:
        raise NotImplementedError("F2: altura, pendiente media y fracción de zonas bajas")
