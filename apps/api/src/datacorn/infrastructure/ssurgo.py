"""Suelo de EE. UU. con USDA NRCS SSURGO, vía Soil Data Access (sin clave)."""

from __future__ import annotations

import re
import threading

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import FieldGeometry, LonLat, SoilProfile, Terrain
from datacorn.domain.soil import (
    DEFAULT_TEXTURE,
    TEXTURES,
    available_water_mm_per_m,
    texture_class,
)
from datacorn.infrastructure.http import client
from datacorn.infrastructure.power import PowerClient

SDA_URL = "https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest"
SOURCE = "USDA NRCS SSURGO"

POINT_QUERY = """
SELECT TOP 1 mu.muname, ma.aws0150wta, ma.slopegradwta, c.comppct_r, c.hydgrp, c.drainagecl,
       h.sandtotal_r, h.claytotal_r, h.om_r
FROM mapunit mu
INNER JOIN muaggatt ma ON ma.mukey = mu.mukey
INNER JOIN component c ON c.mukey = mu.mukey AND c.majcompflag = 'Yes'
LEFT JOIN chorizon h ON h.cokey = c.cokey AND h.hzdept_r = 0
WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({lon} {lat})'))
ORDER BY c.comppct_r DESC
"""


def _num(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except ValueError:
        return None


def _texture_from_name(muname: str) -> str | None:
    name = muname.lower().replace("-", " ")
    for texture in sorted(TEXTURES, key=len, reverse=True):  # "silt loam" antes que "loam"
        if texture.replace("_", " ") in name:
            return texture
    return None


class SoilDataAccess:
    def __init__(self) -> None:
        self._http = client(timeout=60)
        self._lock = threading.Lock()
        self._cache: dict[tuple[float, float], dict[str, str | None]] = {}

    def at_point(self, point: LonLat) -> dict[str, str | None]:
        key = (round(point.lon, 5), round(point.lat, 5))
        with self._lock:
            if key in self._cache:
                return self._cache[key]
        query = POINT_QUERY.format(lon=f"{point.lon:.6f}", lat=f"{point.lat:.6f}")
        try:
            response = self._http.post(SDA_URL, json={"format": "JSON+COLUMNNAME", "query": query})
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DataUnavailable("ssurgo", str(exc)) from exc
        table = (response.json() or {}).get("Table") or []
        if len(table) < 2:
            raise DataUnavailable("ssurgo", "no map unit at this point (outside SSURGO coverage)")
        row = dict(zip(table[0], table[1], strict=False))
        with self._lock:
            self._cache[key] = row
        return row


class SsurgoSoil:
    def __init__(self, sda: SoilDataAccess) -> None:
        self._sda = sda

    def profile(self, geometry: FieldGeometry) -> SoilProfile:
        """Componente dominante en el centro del lote: textura, agua disponible, drenaje."""
        row = self._sda.at_point(centroid(geometry))
        sand, clay, om = _num(row.get("sandtotal_r")), _num(row.get("claytotal_r")), _num(row.get("om_r"))
        aws_cm = _num(row.get("aws0150wta"))  # cm de agua en 0-150 cm
        if aws_cm is not None:
            aw = aws_cm * 10 / 1.5
        elif sand is not None and clay is not None:
            aw = available_water_mm_per_m(sand, clay, om or 2.0)
        else:
            raise DataUnavailable("ssurgo", "no available-water data")
        texture = (
            texture_class(sand, clay)
            if sand is not None and clay is not None
            else _texture_from_name(row.get("muname") or "") or DEFAULT_TEXTURE
        )
        group = (row.get("hydgrp") or "").strip()[:1] or None
        return SoilProfile(
            texture_class=texture,
            sand_pct=sand if sand is not None else 40.0,
            clay_pct=clay if clay is not None else 20.0,
            organic_matter_pct=om,
            available_water_mm_per_m=round(aw, 1),
            drainage_class=row.get("drainagecl"),
            hydrologic_group=group,
            source=SOURCE,
        )


class SsurgoPowerTerrain:
    """Pendiente media de SSURGO + altura de NASA POWER."""

    def __init__(self, sda: SoilDataAccess, power: PowerClient) -> None:
        self._sda = sda
        self._power = power

    def terrain(self, geometry: FieldGeometry) -> Terrain:
        from datetime import date

        point = centroid(geometry)
        row = self._sda.at_point(point)
        slope = _num(row.get("slopegradwta"))
        if slope is None:
            raise DataUnavailable("ssurgo", "no slope data")
        today = date.today()
        elevation = float(
            self._power.daily_point(lat=point.lat, lon=point.lon, start=today, end=today)[
                "geometry"
            ]["coordinates"][2]
        )
        drainage = (row.get("drainagecl") or "").lower()
        low = 0.2 if "poorly" in drainage else 0.0
        return Terrain(
            elevation_m=elevation,
            mean_slope_pct=slope,
            low_area_fraction=low,
            source=f"{SOURCE} (pendiente) + NASA POWER (altura)",
        )


_NAME_RE = re.compile(r"\s+")
