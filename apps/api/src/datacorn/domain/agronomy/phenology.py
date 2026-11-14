"""Fenología del maíz por grados-día (RF-11, RF-31)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from statistics import median

from datacorn.domain.crops import CropParameters
from datacorn.domain.models import ClimateSeries, Stage
from datacorn.domain.report import StageWindow

EMERGENCE_GDD = 70.0  # °C·día (~125 °F·día) de siembra a emergencia
FLOWERING_HALF_WINDOW_DAYS = 10  # floración = espigado/estigmas ± 10 días
HARVEST_AFTER_MATURITY_DAYS = 21  # secado en campo
PLANTING_TEMP_C = 14.0  # media móvil de 7 días para la fecha de siembra por defecto


@dataclass(frozen=True, slots=True)
class Phenology:
    planting: date
    emergence: date
    silking: date
    flowering_start: date
    flowering_end: date
    maturity: date | None  # None = no llega a madurez en la campaña
    harvest: date | None
    last_day: date  # último día con clima


def daily_gdd(tmin_c: float, tmax_c: float, *, base_c: float, upper_c: float) -> float:
    """Grados-día del día (método 86/50 en °C)."""
    hi = min(max(tmax_c, base_c), upper_c)
    lo = min(max(tmin_c, base_c), upper_c)
    return (hi + lo) / 2 - base_c


def gdd_to_maturity(params: CropParameters, hybrid_rm_days: int) -> float:
    table = sorted(params.gdd_maturity_by_rm)
    if not table:
        raise ValueError(f"{params.crop} has no GDD table")
    if hybrid_rm_days <= table[0][0]:
        return table[0][1]
    for (rm0, g0), (rm1, g1) in zip(table, table[1:], strict=False):
        if hybrid_rm_days <= rm1:
            return g0 + (g1 - g0) * (hybrid_rm_days - rm0) / (rm1 - rm0)
    return table[-1][1]


def default_hybrid_rm(lat_deg: float) -> int:
    """Madurez relativa por defecto: ~120 días a 35° y ~85 días a 47° de latitud."""
    rm = 120 - (abs(lat_deg) - 35) * (35 / 12)
    return int(min(120, max(80, round(rm / 5) * 5)))


def default_planting_date(climate: ClimateSeries, season: int) -> date:
    """Mediana del primer día (desde el 1 de abril) con media de 7 días ≥ 14 °C."""
    by_year: dict[int, list] = {}
    for d in climate.days:
        if d.day.month >= 4 and d.day.year < season:
            by_year.setdefault(d.day.year, []).append(d)
    doys = []
    for days in by_year.values():
        temps = [(x.tmin_c + x.tmax_c) / 2 for x in days]
        for i in range(6, len(days)):
            if sum(temps[i - 6 : i + 1]) / 7 >= PLANTING_TEMP_C:
                doys.append(days[i].day.timetuple().tm_yday)
                break
    if not doys:
        return date(season, 5, 1)
    return date(season, 1, 1) + timedelta(days=int(median(doys)) - 1)


def phenology(
    climate: ClimateSeries, *, planting_date: date, hybrid_rm_days: int, params: CropParameters
) -> Phenology:
    total = gdd_to_maturity(params, hybrid_rm_days)
    silking_gdd = total * params.gdd_flowering_fraction
    acc = 0.0
    emergence = silking = maturity = None
    last = planting_date
    for d in climate.days:
        if d.day < planting_date:
            continue
        last = d.day
        acc += daily_gdd(d.tmin_c, d.tmax_c, base_c=params.base_temp_c, upper_c=params.upper_temp_c)
        if emergence is None and acc >= EMERGENCE_GDD:
            emergence = d.day
        if silking is None and acc >= silking_gdd:
            silking = d.day
        if acc >= total:
            maturity = d.day
            break
    emergence = emergence or planting_date + timedelta(days=10)
    silking = silking or last
    half = timedelta(days=FLOWERING_HALF_WINDOW_DAYS)
    harvest = maturity + timedelta(days=HARVEST_AFTER_MATURITY_DAYS) if maturity else None
    return Phenology(
        planting=planting_date,
        emergence=emergence,
        silking=silking,
        flowering_start=silking - half,
        flowering_end=silking + half,
        maturity=maturity,
        harvest=harvest,
        last_day=climate.days[-1].day if climate.days else last,
    )


def windows(p: Phenology) -> tuple[StageWindow, ...]:
    one = timedelta(days=1)
    end_fill = p.maturity or p.last_day
    out = [
        StageWindow(Stage.SOWING, p.planting, p.planting),
        StageWindow(Stage.EMERGENCE, p.emergence, p.emergence),
        StageWindow(Stage.VEGETATIVE, p.emergence + one, p.flowering_start - one),
        StageWindow(Stage.FLOWERING, p.flowering_start, p.flowering_end),
        StageWindow(Stage.GRAIN_FILL, p.flowering_end + one, end_fill),
    ]
    if p.maturity:
        out.append(StageWindow(Stage.MATURITY, p.maturity, p.maturity))
    if p.harvest:
        out.append(StageWindow(Stage.HARVEST, p.harvest, p.harvest))
    return tuple(out)


def stage_windows(
    climate: ClimateSeries, *, planting_date: date, hybrid_rm_days: int, params: CropParameters
) -> tuple[StageWindow, ...]:
    """Fechas de siembra, emergencia, floración (±10 días), llenado, madurez y cosecha."""
    return windows(
        phenology(climate, planting_date=planting_date, hybrid_rm_days=hybrid_rm_days, params=params)
    )
