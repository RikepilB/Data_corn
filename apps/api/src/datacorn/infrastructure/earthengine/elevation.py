"""Relieve del lote (ElevationPort)."""

from __future__ import annotations

import math

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import FieldGeometry, Terrain
from datacorn.infrastructure.earthengine._common import MAX_PIXELS, polygon
from datacorn.infrastructure.earthengine.session import EarthEngineSession

NASADEM = "NASA/NASADEM_HGT/001"  # SRTM reprocesado, 30 m, de 56° S a 60° N
NASADEM_SOURCE = "NASA NASADEM (30 m)"
# NASADEM guarda metros enteros: un escalón de 1 m entre píxeles vecinos ya es 1,6 % de pendiente.
# Se suaviza con la media de 90 m antes de derivar; aun así, en lotes muy planos la pendiente
# puede salir algo alta, y por eso en EE. UU. va primero la de SSURGO · verificar
SMOOTH_M = 90
# Zona baja: al menos 1 m por debajo de la media de su entorno de 150 m (posición topográfica)
NEIGHBOURHOOD_M = 150
LOW_SPOT_M = -1.0


class NasademElevation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def terrain(self, geometry: FieldGeometry) -> Terrain:
        ee = self._ee.ee()
        elevation = ee.Image(NASADEM).select("elevation")
        smooth = elevation.toFloat().focalMean(radius=SMOOTH_M, units="meters")
        slope_pct = ee.Terrain.slope(smooth).multiply(math.pi / 180).tan().multiply(100)
        position = smooth.subtract(smooth.focalMean(radius=NEIGHBOURHOOD_M, units="meters"))
        bands = (
            elevation.rename("elevation")
            .addBands(slope_pct.rename("slope"))
            .addBands(position.lt(LOW_SPOT_M).rename("low"))
        )
        stats = self._ee.info(
            "nasadem",
            bands.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=polygon(ee, geometry), scale=30, maxPixels=MAX_PIXELS
            ),
        )
        if not stats or stats.get("elevation") is None or stats.get("slope") is None:  # type: ignore[union-attr]
            raise DataUnavailable("nasadem", "no elevation here (NASADEM covers 56° S to 60° N)")
        return Terrain(
            elevation_m=float(stats["elevation"]),  # type: ignore[index]
            mean_slope_pct=round(float(stats["slope"]), 2),  # type: ignore[index]
            low_area_fraction=round(float(stats.get("low") or 0.0), 3),  # type: ignore[union-attr]
            source=NASADEM_SOURCE,
        )
