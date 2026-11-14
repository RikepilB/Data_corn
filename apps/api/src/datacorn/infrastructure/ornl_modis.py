"""NDVI de MODIS (MOD13Q1, 250 m, 16 días) con el servicio web de ORNL DAAC (sin clave)."""

from __future__ import annotations

from collections.abc import Mapping
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import FieldGeometry, VegetationObservation
from datacorn.infrastructure.http import client

URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
BAND = "250m_16_days_NDVI"
SENSOR = "NASA MODIS MOD13Q1 (ORNL DAAC)"
SCALE = 0.0001
# El servicio acepta hasta 10 compuestos por pedido y es lento (~1 min por pedido): se pide un
# solo tramo por año, mayo-julio, que cubre el verdeo del maíz
CHUNKS = (((5, 1), (7, 31)),)


def _modis_date(d: date) -> str:
    return f"A{d.year}{d.timetuple().tm_yday:03d}"


class OrnlModisVegetation:
    def __init__(self) -> None:
        self._http = client(timeout=60)

    def _chunk(self, lat: float, lon: float, start: date, end: date) -> list[VegetationObservation]:
        try:
            response = self._http.get(
                URL,
                params={
                    "latitude": f"{lat:.5f}",
                    "longitude": f"{lon:.5f}",
                    "band": BAND,
                    "startDate": _modis_date(start),
                    "endDate": _modis_date(end),
                    "kmAboveBelow": 0,
                    "kmLeftRight": 0,
                },
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return []
        out = []
        for item in response.json().get("subset", []):
            raw = item.get("data", [None])[0]
            if raw is None or raw < -2000:  # -3000 = sin dato
                continue
            out.append(
                VegetationObservation(
                    day=datetime.strptime(item["calendar_date"], "%Y-%m-%d").date(),
                    ndvi=raw * SCALE,
                    sensor=SENSOR,
                )
            )
        return out

    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]:
        c = centroid(geometry)
        windows = []
        for year in range(start.year, end.year + 1):
            for (m0, d0), (m1, d1) in CHUNKS:
                w0, w1 = max(date(year, m0, d0), start), min(date(year, m1, d1), end)
                if w0 <= w1:
                    windows.append((w0, w1))
        with ThreadPoolExecutor(max_workers=6) as pool:
            chunks = pool.map(lambda w: self._chunk(c.lat, c.lon, *w), windows)
            obs = sorted({o.day: o for chunk in chunks for o in chunk}.values(), key=lambda o: o.day)
        if not obs:
            raise DataUnavailable("ornl_modis", "no NDVI for this point")
        return tuple(obs)

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]:
        raise DataUnavailable("ornl_modis", "250 m is too coarse for in-field zones")
