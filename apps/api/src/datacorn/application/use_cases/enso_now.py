# SI-assisted (Claude Code); reviewed by <name>
from __future__ import annotations

from datacorn.application.dto import EnsoOverview
from datacorn.application.ports import ClockPort, EnsoPort

RECENT_YEARS = 3


class EnsoNow:
    """Estado actual de El Niño / La Niña y su serie reciente (globo «Hoy en el mundo»)."""

    def __init__(self, enso: EnsoPort, clock: ClockPort) -> None:
        self._enso = enso
        self._clock = clock

    def execute(self) -> EnsoOverview:
        year = self._clock.today().year
        recent = self._enso.history(year - RECENT_YEARS, year)
        return EnsoOverview(current=self._enso.current(), recent=recent)
