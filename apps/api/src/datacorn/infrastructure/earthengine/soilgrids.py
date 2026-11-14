"""Suelo global de ISRIC SoilGrids 250 m (respaldo de SoilPort)."""

from __future__ import annotations

from datacorn.domain.models import FieldGeometry, SoilProfile
from datacorn.infrastructure.earthengine.session import EarthEngineSession

SOILGRIDS = {  # colección comunitaria en Earth Engine
    "sand": "projects/soilgrids-isric/sand_mean",
    "clay": "projects/soilgrids-isric/clay_mean",
    "soc": "projects/soilgrids-isric/soc_mean",
}


class SoilGridsSoil:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def profile(self, geometry: FieldGeometry) -> SoilProfile:
        raise NotImplementedError("F2: textura SoilGrids + agua disponible (Saxton y Rawls)")
