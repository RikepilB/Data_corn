"""Cultivo de cada año en el lote (CropHistoryPort)."""

from __future__ import annotations

from datacorn.domain.models import Crop, CropYear, FieldGeometry
from datacorn.infrastructure.earthengine.session import EarthEngineSession

CDL = "USDA/NASS/CDL"  # banda 'cropland', 30 m, EE. UU. completo desde 2008

CDL_CLASSES = {1: Crop.MAIZE, 5: Crop.SOYBEAN}  # el resto → Crop.OTHER


class CdlCropHistory:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def history(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> tuple[CropYear, ...]:
        raise NotImplementedError("F2: clase CDL mayoritaria del lote por año")
