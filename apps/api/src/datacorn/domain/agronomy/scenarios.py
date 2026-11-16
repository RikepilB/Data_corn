"""Escenarios de campaña: lo observado hasta hoy + cada año histórico para lo que falta.

Un solo cálculo sirve para antes, durante y después de la campaña (docs/app/flujo-y-pantalla.md §3).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import date, timedelta
from statistics import mean

from datacorn.domain.agronomy import enso as enso_rules
from datacorn.domain.agronomy.et0 import et0_fao56
from datacorn.domain.agronomy.phenology import Phenology, phenology, windows
from datacorn.domain.agronomy.water_balance import (
    WaterBalanceDay,
    flowering_deficit_mm,
    relative_yield_loss,
    running_yield,
    simulate,
    stress_threshold_pct,
)
from datacorn.domain.crops import CropParameters
from datacorn.domain.models import (
    ClimateDay,
    ClimateSeries,
    EnsoPhase,
    EnsoState,
    FieldContext,
    FieldInputs,
    SoilProfile,
)
from datacorn.domain.report import SeasonRun, StageWindow
from datacorn.domain.soil import DEFAULT_TEXTURE

KILLING_FROST_C = -2.0  # helada que mata la planta (28 °F)
SEASON_START = (3, 1)
SEASON_END = (12, 31)
ENSO_GROWING_SEASONS = ("MJJ", "JJA", "JAS")  # trimestres que pesan en el maíz del hemisferio norte

# Suelo de respaldo cuando no hay dato (franco, Saxton y Rawls)
FALLBACK_SOIL = SoilProfile(
    texture_class=DEFAULT_TEXTURE,
    sand_pct=40.0,
    clay_pct=20.0,
    organic_matter_pct=2.5,
    available_water_mm_per_m=143.0,
    drainage_class=None,
    hydrologic_group="B",
    source="fallback",
)


@dataclass(frozen=True, slots=True)
class SeasonScenario:
    analog_year: int  # año que completa los días que faltan (o el año observado)
    climate: ClimateSeries
    observed_until: date | None  # último día observado de la campaña (None = todo escenario)
    enso_phase: EnsoPhase | None = None
    et0_by_day: Mapping[date, float] | None = None  # precalculada (ver with_et0)


@dataclass(frozen=True, slots=True)
class ScenarioOutcome:
    scenario: SeasonScenario
    phen: Phenology
    stages: tuple[StageWindow, ...]
    balance: tuple[WaterBalanceDay, ...]
    flowering_deficit_mm: float
    flowering_heat_days: int
    late_frost: bool  # helada después de la emergencia
    frost_before_maturity: bool  # helada mortal antes de madurar, o no madura
    relative_yield_loss: float
    irrigation_mm: float
    peak_week_etc_mm: float
    yield_curve: tuple[float, ...] = ()  # rendimiento relativo acumulado por día (película)


def build(
    history: ClimateSeries, *, season: int, planting_date: date, today: date
) -> tuple[SeasonScenario, ...]:
    """Un escenario por año histórico completo; los días ya observados van al inicio."""
    by_date = {d.day: d for d in history.days}
    start, end = date(season, *SEASON_START), date(season, *SEASON_END)
    last_obs = max(by_date) if by_date else None
    if last_obs and last_obs >= end and start in by_date:  # campaña ya terminada: solo lo real
        days = tuple(by_date[start + timedelta(days=i)] for i in range((end - start).days + 1)
                     if start + timedelta(days=i) in by_date)
        return (SeasonScenario(season, ClimateSeries(days, history.sources), end),)

    observed_until = min(last_obs, end) if last_obs and last_obs >= start else None
    years = sorted({d.year for d in by_date})
    out = []
    for y in years:
        if y == season or date(y, *SEASON_START) not in by_date or date(y, *SEASON_END) not in by_date:
            continue
        days: list[ClimateDay] = []
        cur = start
        while cur <= end:
            if observed_until and cur <= observed_until and cur in by_date:
                days.append(by_date[cur])
            else:
                src = by_date.get(date(y, cur.month, cur.day))
                if src is not None:
                    days.append(
                        ClimateDay(
                            cur, src.tmin_c, src.tmax_c, src.precip_mm, src.solar_mj_m2,
                            src.rh_mean_pct, src.wind_2m_m_s,
                        )
                    )
            cur += timedelta(days=1)
        out.append(SeasonScenario(y, ClimateSeries(tuple(days), history.sources), observed_until))
    return tuple(out)


def growing_season_phase(enso_history: Sequence[EnsoState], year: int) -> EnsoPhase | None:
    vals = [
        s.value for s in enso_history
        if s.period.split()[0] in ENSO_GROWING_SEASONS and s.period.endswith(str(year))
    ]
    return enso_rules.classify(mean(vals), index=enso_history[0].index) if vals else None


def tag_enso(
    scenarios: tuple[SeasonScenario, ...], enso_history: tuple[EnsoState, ...]
) -> tuple[SeasonScenario, ...]:
    """Marca cada escenario con la fase de El Niño de su campaña (mayo-septiembre)."""
    if not enso_history:
        return scenarios
    return tuple(
        replace(s, enso_phase=growing_season_phase(enso_history, s.analog_year)) for s in scenarios
    )


def with_et0(
    scenarios: tuple[SeasonScenario, ...], *, lat_deg: float, elevation_m: float
) -> tuple[SeasonScenario, ...]:
    """Calcula la ET0 de cada día una sola vez: no depende de la fecha de siembra."""
    return tuple(
        replace(
            s,
            et0_by_day={
                d.day: et0_fao56(d, lat_deg=lat_deg, elevation_m=elevation_m) for d in s.climate.days
            },
        )
        for s in scenarios
    )


def candidate_planting_dates(chosen: date) -> tuple[date, ...]:
    """Fechas de siembra a evaluar: la elegida ± 2 semanas, cada 7 días (RF-10)."""
    return tuple(chosen + timedelta(days=7 * k) for k in range(-2, 3))


def run(
    scenario: SeasonScenario,
    *,
    inputs: FieldInputs,
    context: FieldContext,
    params: CropParameters,
) -> ScenarioOutcome:
    """Fenología → balance de agua → calor → helada → pérdida de rendimiento."""
    climate = scenario.climate
    phen = phenology(
        climate, planting_date=inputs.planting_date, hybrid_rm_days=inputs.hybrid_rm_days,
        params=params,
    )
    soil = context.soil or FALLBACK_SOIL
    elevation = context.terrain.elevation_m if context.terrain else 0.0
    balance = simulate(
        climate, phen=phen, soil=soil, inputs=inputs, params=params,
        lat_deg=context.centroid.lat, elevation_m=elevation, et0_by_day=scenario.et0_by_day,
    )
    flowering = [d for d in climate.days if phen.flowering_start <= d.day <= phen.flowering_end]
    heat_days = sum(1 for d in flowering if d.tmax_c >= params.heat_stress_c)
    early_window_end = phen.emergence + timedelta(days=30)
    late_frost = any(
        d.tmin_c <= params.frost_c for d in climate.days if phen.emergence <= d.day <= early_window_end
    )
    frost_end = phen.maturity or phen.last_day
    killing = any(
        d.tmin_c <= KILLING_FROST_C for d in climate.days if phen.silking <= d.day < frost_end
    )
    weekly = [b.etc_potential_mm for b in balance]
    peak_week = max((sum(weekly[i : i + 7]) for i in range(max(len(weekly) - 6, 1))), default=0.0)
    return ScenarioOutcome(
        scenario=scenario,
        phen=phen,
        stages=windows(phen),
        balance=balance,
        flowering_deficit_mm=flowering_deficit_mm(balance, phen),
        flowering_heat_days=heat_days,
        late_frost=late_frost,
        frost_before_maturity=killing or phen.maturity is None,
        relative_yield_loss=relative_yield_loss(balance, phen, params.ky),
        irrigation_mm=sum(b.irrigation_mm for b in balance),
        peak_week_etc_mm=peak_week,
        yield_curve=running_yield(balance, phen, params.ky),
    )


def typical(outcomes: Sequence[ScenarioOutcome]) -> ScenarioOutcome:
    """El escenario con la pérdida de rendimiento mediana."""
    ordered = sorted(outcomes, key=lambda o: o.relative_yield_loss)
    return ordered[len(ordered) // 2]


def to_run(outcome: ScenarioOutcome) -> SeasonRun:
    """Serie diaria para la película y la franja de ese año (RF-31, RF-38)."""
    by_day = {d.day: d for d in outcome.scenario.climate.days}
    obs = outcome.scenario.observed_until
    return SeasonRun(
        year=outcome.scenario.analog_year,
        observed_days=sum(1 for b in outcome.balance if obs and b.day <= obs),
        enso_phase=outcome.scenario.enso_phase,
        start=outcome.phen.planting,
        water_pct=tuple(round(b.available_pct) for b in outcome.balance),
        tmax_c=tuple(round(by_day[b.day].tmax_c, 1) for b in outcome.balance),
        stages=outcome.stages,
        flowering_deficit_mm=round(outcome.flowering_deficit_mm, 1),
        flowering_heat_days=outcome.flowering_heat_days,
        relative_yield=round(1 - outcome.relative_yield_loss, 3),
        rain_mm=tuple(round(b.rain_mm, 1) for b in outcome.balance),
        irrigation_mm=tuple(round(b.irrigation_mm, 1) for b in outcome.balance),
        yield_pct=tuple(round(100 * y, 1) for y in outcome.yield_curve),
        stress_pct=round(stress_threshold_pct(outcome.balance)),
    )
