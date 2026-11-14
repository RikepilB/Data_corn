"""ONI de NOAA CPC (sin clave): índice global de El Niño / La Niña."""

from __future__ import annotations

from datacorn.domain.models import EnsoState

ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"


class NoaaOni:
    def current(self) -> EnsoState:
        raise NotImplementedError("F6: último trimestre del ONI")

    def history(self, first_year: int, last_year: int) -> tuple[EnsoState, ...]:
        raise NotImplementedError("F6: ONI histórico")
