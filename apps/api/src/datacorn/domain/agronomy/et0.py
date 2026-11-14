"""Evapotranspiración de referencia ET0, FAO-56 Penman-Monteith (ecuación 6)."""

from __future__ import annotations

import math
from datetime import date
from functools import lru_cache

from datacorn.domain.models import ClimateDay

SIGMA = 4.903e-9  # MJ K⁻⁴ m⁻² día⁻¹


def _sat_vp(t: float) -> float:
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


@lru_cache(maxsize=4096)
def _doy(d: date) -> int:
    return d.toordinal() - date(d.year, 1, 1).toordinal() + 1


@lru_cache(maxsize=8192)
def extraterrestrial_radiation(lat_deg: float, doy: int) -> float:
    """Ra en MJ/m²/día (FAO-56, ec. 21)."""
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)
    delta = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(delta))))
    return (
        24 * 60 / math.pi * 0.0820 * dr
        * (ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws))
    )


def et0_fao56(day: ClimateDay, *, lat_deg: float, elevation_m: float) -> float:
    """ET0 diaria en mm.

    Faltantes (FAO-56 cap. 3): radiación por Hargreaves, humedad con Tmin como punto de rocío,
    viento 2 m/s.
    """
    tmax, tmin = day.tmax_c, day.tmin_c
    tmean = (tmax + tmin) / 2
    pressure = 101.3 * ((293 - 0.0065 * elevation_m) / 293) ** 5.26
    gamma = 0.000665 * pressure
    delta = 4098 * _sat_vp(tmean) / (tmean + 237.3) ** 2
    es = (_sat_vp(tmax) + _sat_vp(tmin)) / 2
    ea = es * day.rh_mean_pct / 100 if day.rh_mean_pct is not None else _sat_vp(tmin)
    u2 = day.wind_2m_m_s if day.wind_2m_m_s is not None else 2.0

    ra = extraterrestrial_radiation(round(lat_deg, 3), _doy(day.day))
    rs = (
        day.solar_mj_m2
        if day.solar_mj_m2 is not None
        else 0.16 * math.sqrt(max(tmax - tmin, 0.0)) * ra
    )
    rso = (0.75 + 2e-5 * elevation_m) * ra
    rns = (1 - 0.23) * rs
    ratio = min(rs / rso, 1.0) if rso > 0 else 0.5
    rnl = (
        SIGMA * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2
        * (0.34 - 0.14 * math.sqrt(max(ea, 0.0)))
        * (1.35 * ratio - 0.35)
    )
    rn = rns - rnl
    et0 = (0.408 * delta * rn + gamma * 900 / (tmean + 273) * u2 * (es - ea)) / (
        delta + gamma * (1 + 0.34 * u2)
    )
    return max(et0, 0.0)
