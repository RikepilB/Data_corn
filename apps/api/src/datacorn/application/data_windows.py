"""Ventanas de datos compartidas por describe y analyze.

Ambos casos de uso piden exactamente los mismos rangos, así la segunda llamada sale de la
caché de los adaptadores (RF-33).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date

from datacorn.application.errors import DataUnavailable

NDVI_HISTORY_YEARS = 3  # campañas previas para comparar el verdeo del lote
GREENUP = ((5, 1), (7, 31))  # el verdeo del maíz cae entre mayo y julio


def climate_window(today: date, history_start_year: int) -> tuple[date, date]:
    return date(history_start_year, 1, 1), today


def ndvi_window(season: int, today: date) -> tuple[date, date] | None:
    """Solo si la campaña ya empezó: antes de sembrar el NDVI no aporta (y el servicio es lento)."""
    if date(season, *GREENUP[0]) > today:
        return None
    return date(season - NDVI_HISTORY_YEARS, *GREENUP[0]), min(today, date(season, *GREENUP[1]))


def optional[T](fn: Callable[[], T], default: T) -> T:
    """Datos que mejoran el reporte pero no son imprescindibles."""
    try:
        return fn()
    except DataUnavailable:
        return default
