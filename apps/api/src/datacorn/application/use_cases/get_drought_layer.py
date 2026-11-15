# SI-assisted (Claude Code); reviewed by <name>
from __future__ import annotations

from datetime import date

from datacorn.application.errors import DataUnavailable
from datacorn.application.ports import ClockPort, DroughtLayerPort, TileLayer

FIRST_MONTH = date(2015, 4, 1)  # primer mes completo de SMAP


class GetDroughtLayer:
    """Capa de sequía de un mes: humedad del suelo frente a lo normal de esa fecha (RF-60)."""

    def __init__(self, *, layer: DroughtLayerPort, clock: ClockPort) -> None:
        self._layer = layer
        self._clock = clock

    def execute(self, month: date) -> TileLayer:
        month = month.replace(day=1)
        if not FIRST_MONTH <= month <= self._clock.today():
            raise DataUnavailable("smap_l4", f"no SMAP data for {month:%Y-%m} (starts 2015-04)")
        return self._layer.tiles(month)
