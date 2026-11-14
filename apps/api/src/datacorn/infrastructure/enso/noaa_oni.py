"""ONI de NOAA CPC (sin clave): índice global de El Niño / La Niña."""

from __future__ import annotations

import threading
import time

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.agronomy.enso import classify
from datacorn.domain.models import EnsoState
from datacorn.infrastructure.http import client

ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
REFRESH_S = 12 * 3600


class NoaaOni:
    def __init__(self) -> None:
        self._http = client(timeout=30)
        self._lock = threading.Lock()
        self._rows: tuple[EnsoState, ...] = ()
        self._loaded_at = 0.0

    def _all(self) -> tuple[EnsoState, ...]:
        with self._lock:
            if self._rows and time.time() - self._loaded_at < REFRESH_S:
                return self._rows
            try:
                response = self._http.get(ONI_URL)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                if self._rows:
                    return self._rows
                raise DataUnavailable("noaa_oni", str(exc)) from exc
            rows = []
            for line in response.text.splitlines():
                parts = line.split()
                if len(parts) != 4 or not parts[1].isdigit():
                    continue  # encabezado
                season, year, _total, anom = parts
                value = float(anom)
                rows.append(
                    EnsoState(index="ONI", value=value, phase=classify(value), period=f"{season} {year}")
                )
            self._rows, self._loaded_at = tuple(rows), time.time()
            return self._rows

    def current(self) -> EnsoState:
        rows = self._all()
        if not rows:
            raise DataUnavailable("noaa_oni", "empty table")
        return rows[-1]

    def history(self, first_year: int, last_year: int) -> tuple[EnsoState, ...]:
        return tuple(r for r in self._all() if first_year <= int(r.period.split()[1]) <= last_year)
