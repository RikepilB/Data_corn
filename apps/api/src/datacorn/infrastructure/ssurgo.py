"""Suelo de EE. UU. con USDA NRCS SSURGO, vía Soil Data Access (sin clave)."""

from __future__ import annotations

from datacorn.domain.models import FieldGeometry, SoilProfile

SDA_URL = "https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest"


class SsurgoSoil:
    def profile(self, geometry: FieldGeometry) -> SoilProfile:
        """Componente dominante ponderado por área: textura, AWC, drenaje y grupo hidrológico."""
        raise NotImplementedError("F2: consulta espacial a Soil Data Access")
