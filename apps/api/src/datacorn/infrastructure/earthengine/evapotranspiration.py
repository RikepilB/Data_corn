"""Evapotranspiración real observada (EvapotranspirationPort)."""

from __future__ import annotations

from datetime import date

from datacorn.domain.models import EvapotranspirationObservation, FieldGeometry
from datacorn.infrastructure.earthengine.session import EarthEngineSession

OPENET_MONTHLY = "OpenET/ENSEMBLE/CONUS/GRIDMET/MONTHLY/v2_0"  # oeste de EE. UU. · verificar


class OpenEtEvapotranspiration:
    """Fuera de la cobertura de OpenET lanza DataUnavailable y el respaldo usa ECOSTRESS."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def actual(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[EvapotranspirationObservation, ...]:
        raise NotImplementedError("F4: ET mensual de OpenET (validación del riego)")
