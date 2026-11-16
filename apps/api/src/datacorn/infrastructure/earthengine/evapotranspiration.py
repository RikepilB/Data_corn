"""Evapotranspiración real observada (EvapotranspirationPort)."""

from __future__ import annotations

from datetime import date, timedelta

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import EvapotranspirationObservation, FieldGeometry
from datacorn.infrastructure.earthengine._common import band_series, polygon
from datacorn.infrastructure.earthengine.session import EarthEngineSession

# El ID del catálogo (OpenET/ENSEMBLE/CONUS/GRIDMET/MONTHLY/v2_0) quedó obsoleto; este es su
# sucesor. EE. UU. contiguo, 30 m, mensual, de 1999-10 a 2024-12 (catálogo, 2026-11-14).
OPENET_MONTHLY = "projects/openet/assets/ensemble/conus/gridmet/monthly/v2_0"
OPENET_BAND = "et_ensemble_mad"  # mm por mes: media del conjunto de modelos, sin atípicos
OPENET_SOURCE = "OpenET ensemble v2.0 (Landsat, 30 m)"


def _month_end(first: date) -> date:
    return (first.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


class OpenEtEvapotranspiration:
    """Fuera de la cobertura o del período de OpenET lanza DataUnavailable y sigue el respaldo."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def actual(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[EvapotranspirationObservation, ...]:
        ee = self._ee.ee()
        months = ee.ImageCollection(OPENET_MONTHLY).filterDate(
            start.replace(day=1).isoformat(), (end + timedelta(days=1)).isoformat()
        )
        rows = band_series(self._ee, "openet", months, (OPENET_BAND,), polygon(ee, geometry), 30)
        if not rows:
            raise DataUnavailable("openet", "no OpenET months for this field and period")
        return tuple(
            EvapotranspirationObservation(
                start=first, end=_month_end(first), et_mm=v[OPENET_BAND], source=OPENET_SOURCE
            )
            for first, v in rows
        )
