"""ICEN de ENFEN (Perú): El Niño costero. Lo usará el perfil de Perú (planificado)."""

from __future__ import annotations

from datacorn.domain.models import EnsoState


class EnfenIcen:
    def current(self) -> EnsoState:
        raise NotImplementedError("Después: ICEN para la costa del Perú")

    def history(self, first_year: int, last_year: int) -> tuple[EnsoState, ...]:
        raise NotImplementedError("Después: ICEN histórico")
