"""Humedad del suelo (SoilMoisturePort)."""

from __future__ import annotations

from datetime import date

from datacorn.domain.models import FieldGeometry, SoilMoistureObservation
from datacorn.infrastructure.earthengine.session import EarthEngineSession

SMAP_L4 = "NASA/SMAP/SPL4SMGP/008"  # superficie y zona de raíces, 9 km, 3 h · verificar versión
NLDAS = "NASA/NLDAS/FORA0125_H002"  # EE. UU., 1/8° · verificar qué producto trae humedad


class SmapL4SoilMoisture:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]:
        raise NotImplementedError("F4: humedad SMAP L4 (validación del gemelo)")


class NldasSoilMoisture:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]:
        raise NotImplementedError("F4: humedad NLDAS")
