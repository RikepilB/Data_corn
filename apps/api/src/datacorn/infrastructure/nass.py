"""USDA NASS QuickStats: rendimiento por condado y avance de siembra por estado."""

from __future__ import annotations

from datetime import date

from pydantic import SecretStr

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import AdminArea, CountyYield, Crop

API_URL = "https://quickstats.nass.usda.gov/api/api_GET/"


class NassYieldStats:
    def __init__(self, api_key: SecretStr | None) -> None:
        self._api_key = api_key

    def _key(self) -> str:
        if self._api_key is None:
            raise DataUnavailable("nass", "missing DATACORN_NASS_API_KEY")
        return self._api_key.get_secret_value()

    def county_yields(
        self, admin: AdminArea, crop: Crop, first_year: int, last_year: int
    ) -> tuple[CountyYield, ...]:
        raise NotImplementedError("F2: rendimiento por condado (bu/ac → t/ha)")

    def typical_planting_date(self, admin: AdminArea, crop: Crop, season: int) -> date | None:
        raise NotImplementedError("F2: fecha al 50 % de siembra (Crop Progress del estado)")
