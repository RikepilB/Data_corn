"""Límites administrativos: país, estado y condado del lote."""

from __future__ import annotations

from datacorn.domain.models import AdminArea, LonLat
from datacorn.infrastructure.earthengine.session import EarthEngineSession

TIGER_COUNTIES = "TIGER/2018/Counties"  # EE. UU.
GAUL_LEVEL2 = "FAO/GAUL/2015/level2"  # global (país, nivel 1, nivel 2)


class TigerCounties:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def locate(self, point: LonLat) -> AdminArea:
        raise NotImplementedError("F1: estado y condado (TIGER)")


class GaulAdmin:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def locate(self, point: LonLat) -> AdminArea:
        raise NotImplementedError("F1: país y niveles 1-2 (GAUL)")


class GaulCountryLocator:
    """Decide el perfil de región: país del punto (ISO alfa-2)."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def country(self, point: LonLat) -> str | None:
        raise NotImplementedError("F1: país del punto (GAUL nivel 0)")
