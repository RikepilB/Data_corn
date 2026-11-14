"""Adaptadores vacíos para fuentes que todavía necesitan cuenta (OpenET, ECOSTRESS)."""

from __future__ import annotations

from datetime import date

from datacorn.domain.models import EvapotranspirationObservation, FieldGeometry


class NoEvapotranspiration:
    def actual(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[EvapotranspirationObservation, ...]:
        return ()
