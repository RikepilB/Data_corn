"""Suelo global con la API REST de ISRIC SoilGrids 2.0 (sin clave). Respaldo fuera de EE. UU."""

from __future__ import annotations

import httpx

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import FieldGeometry, SoilProfile
from datacorn.domain.soil import available_water_mm_per_m, hydrologic_group, texture_class
from datacorn.infrastructure.http import client

URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
DEPTHS = ("0-5cm", "5-15cm", "15-30cm")
SOURCE = "ISRIC SoilGrids 2.0"


class SoilGridsRest:
    def __init__(self) -> None:
        self._http = client(timeout=60)

    def profile(self, geometry: FieldGeometry) -> SoilProfile:
        c = centroid(geometry)
        params = [("lon", f"{c.lon:.5f}"), ("lat", f"{c.lat:.5f}"), ("value", "mean")]
        params += [("property", p) for p in ("sand", "clay", "soc")]
        params += [("depth", d) for d in DEPTHS]
        try:
            response = self._http.get(URL, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DataUnavailable("soilgrids", str(exc)) from exc
        values: dict[str, float] = {}
        for layer in response.json().get("properties", {}).get("layers", []):
            factor = layer.get("unit_measure", {}).get("d_factor", 1) or 1
            means = [
                d["values"]["mean"] / factor
                for d in layer.get("depths", [])
                if d.get("values", {}).get("mean") is not None
            ]
            if means:
                values[layer["name"]] = sum(means) / len(means)
        if "sand" not in values or "clay" not in values:
            raise DataUnavailable("soilgrids", "no sand/clay at this point")
        sand, clay = values["sand"] / 10, values["clay"] / 10  # g/kg → %
        om = values.get("soc", 10.0) / 10 * 1.724  # g/kg de carbono → % de materia orgánica
        texture = texture_class(sand, clay)
        return SoilProfile(
            texture_class=texture,
            sand_pct=round(sand, 1),
            clay_pct=round(clay, 1),
            organic_matter_pct=round(om, 2),
            available_water_mm_per_m=round(available_water_mm_per_m(sand, clay, om), 1),
            drainage_class=None,
            hydrologic_group=hydrologic_group(texture),
            source=SOURCE,
        )
