"""Puertos falsos sin red, con clima sintético de Nebraska, para probar los casos de uso."""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import date, timedelta

from datacorn.application.errors import DataUnavailable
from datacorn.application.ports import RegionDataSources, RegionInfo
from datacorn.domain.agronomy.enso import classify
from datacorn.domain.models import (
    AdminArea,
    ClimateDay,
    ClimateSeries,
    Crop,
    CropYear,
    EnsoState,
    FieldGeometry,
    LonLat,
    SoilMoistureObservation,
    SoilProfile,
    Terrain,
    VegetationObservation,
)

TODAY = date(2026, 11, 14)
SQUARE = FieldGeometry(
    ring=(
        LonLat(-98.0040, 40.9000),
        LonLat(-97.9940, 40.9000),
        LonLat(-97.9940, 40.9073),
        LonLat(-98.0040, 40.9073),
        LonLat(-98.0040, 40.9000),
    )
)


def synthetic_climate(first: date, last: date) -> ClimateSeries:
    days = []
    d = first
    while d <= last:
        doy = d.timetuple().tm_yday
        tmean = 10 + 15 * math.sin(2 * math.pi * (doy - 110) / 365)
        dry_july = d.year % 4 == 0 and d.month == 7  # cada 4 años, julio seco y caliente
        rain = 0.0 if dry_july else (9.0 if doy % 4 == 0 else 0.0)
        days.append(
            ClimateDay(
                day=d,
                tmin_c=tmean - 6,
                tmax_c=tmean + 6 + (5 if dry_july else 0),
                precip_mm=rain,
                solar_mj_m2=12 + 12 * max(0.0, math.sin(2 * math.pi * (doy - 80) / 365)),
                rh_mean_pct=65.0,
                wind_2m_m_s=3.0,
            )
        )
        d += timedelta(days=1)
    return ClimateSeries(days=tuple(days), sources=("synthetic",))


class FakeClimate:
    def daily(self, geometry: FieldGeometry, start: date, end: date) -> ClimateSeries:
        return synthetic_climate(start, end - timedelta(days=4))  # POWER va unos días atrasado


class FakeSoil:
    def profile(self, geometry: FieldGeometry) -> SoilProfile:
        return SoilProfile("silt_loam", 20, 18, 3.0, 190.0, "Well drained", "B", "fake soil")


class FakeTerrain:
    def terrain(self, geometry: FieldGeometry) -> Terrain:
        return Terrain(550.0, 1.0, 0.0, "fake terrain")


class FakeVegetation:
    def ndvi_series(self, geometry, start, end):  # noqa: ANN001, ANN201
        out = []
        for year in range(start.year, end.year + 1):
            for k in range(14):
                d = date(year, 4, 1) + timedelta(days=16 * k)
                if d <= end:
                    out.append(VegetationObservation(d, 0.2 + 0.6 * math.sin(math.pi * k / 13), "fake"))
        return tuple(out)

    def zone_map(self, geometry, first_year, last_year) -> Mapping[str, object]:  # noqa: ANN001
        raise DataUnavailable("fake", "no zones")


class FakeSoilMoisture:
    def series(self, geometry, start, end):  # noqa: ANN001, ANN201
        return (SoilMoistureObservation(start, 0.5, 0.5, "fake"),)


class FakeET:
    def actual(self, geometry, start, end):  # noqa: ANN001, ANN201
        return ()


class FakeEnso:
    def current(self) -> EnsoState:
        return EnsoState("ONI", 2.46, classify(2.46), "ASO 2026")

    def history(self, first_year: int, last_year: int) -> tuple[EnsoState, ...]:
        out = []
        for y in range(first_year, last_year + 1):
            value = 1.2 if y % 5 == 0 else -1.0 if y % 7 == 0 else 0.1
            out += [EnsoState("ONI", value, classify(value), f"{s} {y}") for s in ("MJJ", "JJA", "JAS")]
        return tuple(out)


class FakeCrops:
    def history(self, geometry, first_year, last_year):  # noqa: ANN001, ANN201
        return tuple(
            CropYear(y, Crop.MAIZE if y % 2 else Crop.SOYBEAN, "fake cdl")
            for y in range(max(first_year, 2008), last_year + 1)
        )


class FakeYields:
    def county_yields(self, admin, crop, first_year, last_year):  # noqa: ANN001, ANN201
        raise DataUnavailable("nass", "missing key")

    def typical_planting_date(self, admin, crop, season):  # noqa: ANN001, ANN201
        return None


class FakeAdmin:
    def locate(self, point: LonLat) -> AdminArea:
        return AdminArea("US", "NE", "Hamilton County")


class FakeRegions:
    def resolve(self, point: LonLat) -> RegionDataSources:
        return RegionDataSources(
            region_id="us",
            admin=FakeAdmin(),
            climate=FakeClimate(),
            soil=FakeSoil(),
            elevation=FakeTerrain(),
            vegetation=FakeVegetation(),
            soil_moisture=FakeSoilMoisture(),
            evapotranspiration=FakeET(),
            enso=FakeEnso(),
            crop_history=FakeCrops(),
            yield_stats=FakeYields(),
        )

    def catalog(self) -> tuple[RegionInfo, ...]:
        return ()


class FixedClock:
    def today(self) -> date:
        return TODAY
