"""Clima diario del lote (ClimatePort)."""

from __future__ import annotations

from datetime import date

from datacorn.domain.models import ClimateSeries, FieldGeometry
from datacorn.infrastructure.earthengine.session import EarthEngineSession
from datacorn.infrastructure.power import PowerClient

PRISM_DAILY = "OREGONSTATE/PRISM/AN81d"  # 4 km, EE. UU., desde 1981 · verificar ID y bandas
IMERG = "NASA/GPM_L3/IMERG_V07"  # lluvia, 0.1°, desde 2000
ERA5_LAND_DAILY = "ECMWF/ERA5_LAND/DAILY_AGGR"  # reanálisis, ~9 km, desde 1950


class PrismPowerClimate:
    """EE. UU.: temperatura y lluvia de PRISM + radiación, humedad y viento de NASA POWER."""

    def __init__(self, ee: EarthEngineSession, power: PowerClient) -> None:
        self._ee = ee
        self._power = power

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        raise NotImplementedError("F3: clima diario PRISM + POWER")


class PowerImergClimate:
    """Global: NASA POWER (temperatura, radiación, humedad, viento) + lluvia de GPM IMERG."""

    def __init__(self, ee: EarthEngineSession, power: PowerClient) -> None:
        self._ee = ee
        self._power = power

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        raise NotImplementedError("F3: clima diario POWER + IMERG")


class Era5LandClimate:
    """Respaldo global: ERA5-Land diario."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        raise NotImplementedError("F3: clima diario ERA5-Land")
