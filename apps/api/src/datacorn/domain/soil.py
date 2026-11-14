"""Suelo: clase textural USDA y agua disponible (Saxton y Rawls, 2006)."""

from __future__ import annotations

TEXTURES = (
    "sand",
    "loamy_sand",
    "sandy_loam",
    "loam",
    "silt_loam",
    "silt",
    "sandy_clay_loam",
    "clay_loam",
    "silty_clay_loam",
    "sandy_clay",
    "silty_clay",
    "clay",
)


def texture_class(sand_pct: float, clay_pct: float) -> str:
    """Triángulo textural USDA (algoritmo de NRCS). Devuelve una clave snake_case."""
    sand, clay = sand_pct, clay_pct
    silt = 100.0 - sand - clay
    if silt + 1.5 * clay < 15:
        return "sand"
    if silt + 2 * clay < 30:
        return "loamy_sand"
    if (7 <= clay < 20 and sand > 52) or (clay < 7 and silt < 50):
        return "sandy_loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52:
        return "loam"
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12):
        return "silt_loam"
    if silt >= 80 and clay < 12:
        return "silt"
    if 20 <= clay < 35 and silt < 28 and sand > 45:
        return "sandy_clay_loam"
    if 27 <= clay < 40 and 20 < sand <= 45:
        return "clay_loam"
    if 27 <= clay < 40 and sand <= 20:
        return "silty_clay_loam"
    if clay >= 35 and sand > 45:
        return "sandy_clay"
    if clay >= 40 and silt >= 40:
        return "silty_clay"
    return "clay"


def available_water_mm_per_m(sand_pct: float, clay_pct: float, om_pct: float) -> float:
    """Agua disponible (capacidad de campo − punto de marchitez), Saxton y Rawls (2006)."""
    s, c, om = sand_pct / 100, clay_pct / 100, min(max(om_pct, 0.0), 8.0)
    t1500t = (
        -0.024 * s + 0.487 * c + 0.006 * om + 0.005 * s * om - 0.013 * c * om + 0.068 * s * c
        + 0.031
    )
    t1500 = t1500t + (0.14 * t1500t - 0.02)
    t33t = (
        -0.251 * s + 0.195 * c + 0.011 * om + 0.006 * s * om - 0.027 * c * om + 0.452 * s * c
        + 0.299
    )
    t33 = t33t + (1.283 * t33t**2 - 0.374 * t33t - 0.015)
    return max(t33 - t1500, 0.03) * 1000


def hydrologic_group(texture: str) -> str:
    """Grupo hidrológico aproximado por textura, cuando no hay dato de SSURGO."""
    if texture in ("sand", "loamy_sand", "sandy_loam"):
        return "A"
    if texture in ("loam", "silt_loam", "silt"):
        return "B"
    if texture == "sandy_clay_loam":
        return "C"
    return "D"


DEFAULT_TEXTURE = "loam"
