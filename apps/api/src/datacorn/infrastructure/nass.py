"""USDA NASS QuickStats: rendimiento de maíz por condado. Necesita clave (gratis)."""

from __future__ import annotations

from datetime import date

import httpx
from pydantic import SecretStr

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import AdminArea, CountyYield, Crop
from datacorn.infrastructure.http import client

API_URL = "https://quickstats.nass.usda.gov/api/api_GET/"
SOURCE = "USDA NASS QuickStats"
T_HA_PER_BU_AC = 1 / 15.93  # maíz, 56 lb por bushel


class NassYieldStats:
    def __init__(self, api_key: SecretStr | None) -> None:
        self._api_key = api_key
        self._http = client(timeout=60)

    def _key(self) -> str:
        if self._api_key is None:
            raise DataUnavailable("nass", "missing DATACORN_NASS_API_KEY")
        return self._api_key.get_secret_value()

    def county_yields(
        self, admin: AdminArea, crop: Crop, first_year: int, last_year: int
    ) -> tuple[CountyYield, ...]:
        if crop is not Crop.MAIZE or not admin.state or not admin.county:
            raise DataUnavailable("nass", "only corn yields by county")
        params = {
            "key": self._key(),
            "source_desc": "SURVEY",
            "commodity_desc": "CORN",
            "statisticcat_desc": "YIELD",
            "util_practice_desc": "GRAIN",
            "unit_desc": "BU / ACRE",
            "agg_level_desc": "COUNTY",
            "prodn_practice_desc": "ALL PRODUCTION PRACTICES",
            "state_alpha": admin.state,
            "county_name": admin.county.upper().removesuffix(" COUNTY"),
            "year__GE": first_year,
            "year__LE": last_year,
            "format": "JSON",
        }
        try:
            response = self._http.get(API_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DataUnavailable("nass", str(exc)) from exc
        out = []
        for row in response.json().get("data", []):
            try:
                value = float(str(row["Value"]).replace(",", ""))
            except ValueError:
                continue  # "(D)" = dato reservado
            out.append(
                CountyYield(
                    year=int(row["year"]),
                    crop=Crop.MAIZE,
                    yield_t_ha=round(value * T_HA_PER_BU_AC, 2),
                    source=SOURCE,
                )
            )
        return tuple(sorted(out, key=lambda y: y.year))

    def typical_planting_date(self, admin: AdminArea, crop: Crop, season: int) -> date | None:
        """Sin dato: la fecha por defecto sale del clima del lote (phenology)."""
        return None
