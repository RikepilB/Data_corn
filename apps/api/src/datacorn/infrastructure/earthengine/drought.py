# SI-assisted (Claude Code); reviewed by <name>
"""Capa de sequía (DroughtLayerPort): humedad de la zona de raíces frente a lo normal.

SMAP L4 ya trae la humedad en percentiles de su propia climatología (`sm_rootzone_pctl`): cerca
de 50 es lo normal del lugar y valores bajos son suelo más seco que lo normal, así que no hace
falta calcular la normal. Por verificar en la especificación del producto: si esa climatología es
por época del año o de todo el año. No se ha corrido contra Earth Engine (falta registrar el
proyecto).
"""

from __future__ import annotations

import threading
import time
from datetime import date

from datacorn.application.errors import DataUnavailable
from datacorn.application.ports import TileLayer
from datacorn.infrastructure.earthengine.session import EarthEngineSession, request_errors
from datacorn.infrastructure.earthengine.soil_moisture import (
    SMAP_L4,
    SMAP_SOURCE,
    SNAPSHOT_HOURS,
)

BAND = "sm_rootzone_pctl"  # percentil 0-100
PALETTE = ("#b4532a", "#e7e3dc", "#2b6cb0")  # seco, normal, con agua: la escala de la web
TTL_SECONDS = 2 * 3600  # las teselas de Earth Engine caducan a las pocas horas · verificar
MIN_DAYS = 10  # con menos días el promedio no representa el mes (SMAP llega con atraso)


def _next_month(month: date) -> date:
    return date(month.year + month.month // 12, month.month % 12 + 1, 1)


class SmapDroughtLayer:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee
        self._lock = threading.Lock()
        self._cache: dict[date, tuple[float, TileLayer]] = {}

    def tiles(self, month: date) -> TileLayer:
        ee = self._ee.ee()
        with self._lock:
            hit = self._cache.get(month)
            if hit and time.monotonic() - hit[0] < TTL_SECONDS:
                return hit[1]
        days = (
            ee.ImageCollection(SMAP_L4)
            .filterDate(month.isoformat(), _next_month(month).isoformat())
            .filter(ee.Filter.calendarRange(*SNAPSHOT_HOURS, "hour"))
            .select(BAND)
        )
        count = self._ee.info("smap_l4", days.size())
        if not isinstance(count, int) or count < MIN_DAYS:
            raise DataUnavailable("smap_l4", f"only {count or 0} days of {month:%Y-%m} so far")
        try:
            map_id = days.mean().getMapId({"min": 0, "max": 100, "palette": list(PALETTE)})
        except request_errors(ee) as exc:
            raise DataUnavailable("smap_l4", f"Earth Engine: {exc}") from exc
        layer = TileLayer(
            id="drought",
            month=f"{month:%Y-%m}",
            url_template=map_id["tile_fetcher"].url_format,
            min=0,
            max=100,
            unit="percentile",
            palette=PALETTE,
            source=f"{SMAP_SOURCE} root-zone soil moisture percentile",
        )
        with self._lock:
            self._cache[month] = (time.monotonic(), layer)
        return layer
