"""Evapotranspiración de referencia ET0, FAO-56 Penman-Monteith (ecuación 6)."""

from __future__ import annotations

from datacorn.domain.models import ClimateDay


def et0_fao56(day: ClimateDay, *, lat_deg: float, elevation_m: float) -> float:
    """ET0 diaria en mm.

    Si faltan radiación, humedad o viento, se usan las estimaciones del capítulo 3 de FAO-56.
    Probar contra el ejemplo 18 del manual.
    """
    raise NotImplementedError("F4: ET0 FAO-56 Penman-Monteith")
