"""Cultivo de cada año en el lote con USDA NASS CropScape (CDL, 30 m, sin clave)."""

from __future__ import annotations

import math
import re
from concurrent.futures import ThreadPoolExecutor

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import Crop, CropYear, FieldGeometry
from datacorn.infrastructure.http import client

URL = "https://nassgeodata.gmu.edu/axis2/services/CDLService/GetCDLValue"
SOURCE = "USDA NASS CropScape CDL"
FIRST_CDL_YEAR = 2008  # cobertura nacional completa
MAX_YEARS = 10  # la rotación mira los últimos años; el servicio tarda ~2-3 s por año

MAIZE = {1, 12, 13, 225, 226, 228, 237, 241}
SOYBEAN = {5, 26, 239, 240, 254}
FALLOW = {61}
_VALUE_RE = re.compile(r"value:\s*(\d+)")

# EPSG:5070 · NAD83 / Conus Albers (GRS80)
_A = 6378137.0
_F = 1 / 298.257222101
_E2 = 2 * _F - _F**2
_E = math.sqrt(_E2)
_PHI1, _PHI2, _PHI0, _LAM0 = map(math.radians, (29.5, 45.5, 23.0, -96.0))


def _m(phi: float) -> float:
    return math.cos(phi) / math.sqrt(1 - _E2 * math.sin(phi) ** 2)


def _q(phi: float) -> float:
    s = math.sin(phi)
    return (1 - _E2) * (s / (1 - _E2 * s * s) - (1 / (2 * _E)) * math.log((1 - _E * s) / (1 + _E * s)))


_N = (_m(_PHI1) ** 2 - _m(_PHI2) ** 2) / (_q(_PHI2) - _q(_PHI1))
_C = _m(_PHI1) ** 2 + _N * _q(_PHI1)
_RHO0 = _A * math.sqrt(_C - _N * _q(_PHI0)) / _N


def albers_conus(lon: float, lat: float) -> tuple[float, float]:
    """Lon/lat (NAD83 ≈ WGS84) → x, y en metros de EPSG:5070 (Snyder 1987, ec. 14)."""
    phi, lam = math.radians(lat), math.radians(lon)
    rho = _A * math.sqrt(_C - _N * _q(phi)) / _N
    theta = _N * (lam - _LAM0)
    return rho * math.sin(theta), _RHO0 - rho * math.cos(theta)


def _crop(value: int) -> Crop:
    if value in MAIZE:
        return Crop.MAIZE
    if value in SOYBEAN:
        return Crop.SOYBEAN
    if value in FALLOW:
        return Crop.FALLOW
    return Crop.OTHER


class CropScapeHistory:
    def __init__(self) -> None:
        # Algunos años a veces no responden: se omiten pasado este tiempo
        self._http = client(timeout=12)

    def _year(self, year: int, x: float, y: float) -> CropYear | None:
        try:
            response = self._http.get(URL, params={"year": year, "x": f"{x:.1f}", "y": f"{y:.1f}"})
            response.raise_for_status()
        except httpx.HTTPError:
            return None  # año aún no publicado o servicio lento: se omite
        match = _VALUE_RE.search(response.text)
        if not match or int(match.group(1)) == 0:
            return None
        return CropYear(year=year, crop=_crop(int(match.group(1))), source=SOURCE)

    def history(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> tuple[CropYear, ...]:
        c = centroid(geometry)
        x, y = albers_conus(c.lon, c.lat)
        years = range(max(first_year, FIRST_CDL_YEAR, last_year - MAX_YEARS + 1), last_year + 1)
        with ThreadPoolExecutor(max_workers=MAX_YEARS) as pool:
            found = [r for r in pool.map(lambda yr: self._year(yr, x, y), years) if r]
        if not found:
            raise DataUnavailable("cropscape", "no CDL values for this field")
        return tuple(sorted(found, key=lambda r: r.year))
