"""Humedad del suelo (SoilMoisturePort)."""

from __future__ import annotations

from datetime import date

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import FieldGeometry, SoilMoistureObservation
from datacorn.infrastructure.earthengine._common import center_point, chunked_series
from datacorn.infrastructure.earthengine.session import EarthEngineSession

SMAP_L4 = "NASA/SMAP/SPL4SMGP/008"  # superficie y zona de raíces, 9 km (grilla de 11 km), cada 3 h
SMAP_FIRST_DAY = date(2015, 3, 31)
# "Wetness" = fracción de saturación (0-1), la misma magnitud que GWETTOP y GWETROOT de POWER,
# así el cambio de fuente no cambia la escala de lo que lee el dominio
SMAP_BANDS = ("sm_surface_wetness", "sm_rootzone_wetness")
SMAP_SCALE_M = 11000
SMAP_SOURCE = "NASA SMAP L4 (SPL4SMGP v008)"
# Una imagen por día, la de mediodía UTC (madrugada o mañana en América): la zona de raíces
# cambia despacio y así el pedido es 8 veces más liviano
SNAPSHOT_HOURS = (12, 14)
NLDAS = "NASA/NLDAS/FORA0125_H002"  # EE. UU., 1/8°: solo forzantes (lluvia, temperatura, radiación)


class SmapL4SoilMoisture:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]:
        ee = self._ee.ee()
        hours = ee.Filter.calendarRange(*SNAPSHOT_HOURS, "hour")
        rows = chunked_series(
            self._ee,
            "smap_l4",
            lambda a, b: ee.ImageCollection(SMAP_L4)
            .filterDate(a.isoformat(), b.isoformat())
            .filter(hours),
            SMAP_BANDS,
            center_point(ee, geometry),
            SMAP_SCALE_M,
            max(start, SMAP_FIRST_DAY),
            end,
        )
        if not rows:
            raise DataUnavailable("smap_l4", "no SMAP L4 data at this point")
        return tuple(
            SoilMoistureObservation(
                day=day,
                surface_m3_m3=v["sm_surface_wetness"],
                rootzone_m3_m3=v["sm_rootzone_wetness"],
                source=SMAP_SOURCE,
            )
            for day, v in rows
        )


class NldasSoilMoisture:
    """Sin dato: el producto de NLDAS del catálogo trae forzantes, no humedad del suelo."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[SoilMoistureObservation, ...]:
        raise DataUnavailable("nldas", f"{NLDAS} has forcing fields only, no soil moisture")
