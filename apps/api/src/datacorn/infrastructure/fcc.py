"""Estado y condado del lote con la FCC Census Area API (sin clave, solo EE. UU.)."""

from __future__ import annotations

import threading

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import AdminArea, LonLat
from datacorn.infrastructure.http import client

URL = "https://geo.fcc.gov/api/census/area"


class FccCensusArea:
    def __init__(self) -> None:
        self._http = client(timeout=30)
        self._lock = threading.Lock()
        self._cache: dict[tuple[float, float], dict | None] = {}

    def lookup(self, point: LonLat) -> dict | None:
        key = (round(point.lon, 4), round(point.lat, 4))
        with self._lock:
            if key in self._cache:
                return self._cache[key]
        try:
            response = self._http.get(
                URL,
                params={"lat": point.lat, "lon": point.lon, "censusYear": 2020, "format": "json"},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DataUnavailable("fcc", str(exc)) from exc
        results = response.json().get("results") or []
        row = results[0] if results else None
        with self._lock:
            self._cache[key] = row
        return row


class FccAdmin:
    def __init__(self, fcc: FccCensusArea) -> None:
        self._fcc = fcc

    def locate(self, point: LonLat) -> AdminArea:
        row = self._fcc.lookup(point)
        if row is None:
            raise DataUnavailable("fcc", "outside the United States")
        return AdminArea(country="US", state=row.get("state_code"), county=row.get("county_name"))


class FccCountryLocator:
    """El perfil de EE. UU. aplica si la FCC encuentra un condado; si no, el perfil global."""

    def __init__(self, fcc: FccCensusArea) -> None:
        self._fcc = fcc

    def country(self, point: LonLat) -> str | None:
        try:
            return "US" if self._fcc.lookup(point) else None
        except DataUnavailable:
            return None


class PointAdmin:
    """Respaldo global sin límites administrativos."""

    def locate(self, point: LonLat) -> AdminArea:
        return AdminArea(country="")
