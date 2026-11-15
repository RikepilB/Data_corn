from __future__ import annotations

from dataclasses import replace
from datetime import date

from datacorn.application.cache_keys import cache_key
from datacorn.application.data_windows import climate_window, ndvi_window, optional
from datacorn.application.dto import AnalyzeFieldCommand
from datacorn.application.errors import DataUnavailable
from datacorn.application.ports import CachePort, ClockPort, CropCatalogPort, RegionResolverPort
from datacorn.application.use_cases.describe_field import DescribeField
from datacorn.domain.agronomy import (
    enso,
    irrigation,
    risks,
    rotation,
    scenarios,
    summary,
    vegetation,
    waterlogging,
    zones,
)
from datacorn.domain.models import Crop, IrrigationSystem
from datacorn.domain.report import FieldReport

MIN_SCENARIOS = 5


class AnalyzeField:
    """Reporte completo del lote para la pantalla y el PDF.

    Los adaptadores guardan en memoria lo que ya bajó describe, así que al cambiar fecha,
    híbrido o riego solo se recalcula el dominio (RF-33).
    """

    def __init__(
        self,
        *,
        regions: RegionResolverPort,
        crops: CropCatalogPort,
        cache: CachePort,
        clock: ClockPort,
        describe: DescribeField,
        history_start_year: int,
    ) -> None:
        self._regions = regions
        self._crops = crops
        self._cache = cache
        self._clock = clock
        self._describe = describe
        self._history_start_year = history_start_year

    def execute(self, cmd: AnalyzeFieldCommand) -> FieldReport:
        today = self._clock.today()
        key = cache_key("analyze", cmd.geometry, cmd.inputs, today.isoformat())
        if (hit := self._cache.get(key, FieldReport)) is not None:
            return hit

        inputs = cmd.inputs
        ctx = self._describe.execute(cmd.geometry, season=inputs.season).context
        if inputs.previous_crop is None and ctx.crop_history:
            inputs = replace(inputs, previous_crop=ctx.crop_history[-1].crop)
        src = self._regions.resolve(ctx.centroid)
        maize = self._crops.get(Crop.MAIZE)
        start, end = climate_window(today, self._history_start_year)

        # F3 · clima histórico + días observados → un escenario por año
        climate = src.climate.daily(cmd.geometry, start, end)
        season_scenarios = scenarios.build(
            climate, season=inputs.season, planting_date=inputs.planting_date, today=today
        )
        finished_season = bool(season_scenarios) and season_scenarios[0].analog_year == inputs.season
        if not finished_season and len(season_scenarios) < MIN_SCENARIOS:
            raise DataUnavailable("climate", "not enough complete seasons in the history")
        # F6 · fase de El Niño de cada año análogo
        enso_history = optional(lambda: src.enso.history(self._history_start_year, today.year), ())
        season_scenarios = scenarios.tag_enso(season_scenarios, enso_history)
        season_scenarios = scenarios.with_et0(
            season_scenarios,
            lat_deg=ctx.centroid.lat,
            elevation_m=ctx.terrain.elevation_m if ctx.terrain else 0.0,
        )

        def run_all(planting: date) -> tuple[scenarios.ScenarioOutcome, ...]:
            changed = replace(inputs, planting_date=planting)
            return tuple(
                scenarios.run(s, inputs=changed, context=ctx, params=maize)
                for s in season_scenarios
            )

        # F3/F4 · fenología, agua, calor y helada en cada escenario
        outcomes = run_all(inputs.planting_date)
        candidates = scenarios.candidate_planting_dates(inputs.planting_date)
        runs_by_date = {
            d: outcomes if d == inputs.planting_date else run_all(d) for d in candidates
        }

        # F4/F5 · observaciones (opcionales)
        soil_moisture = optional(lambda: src.soil_moisture.series(cmd.geometry, start, end), ())
        window = ndvi_window(inputs.season, today)
        ndvi = optional(lambda: src.vegetation.ndvi_series(cmd.geometry, *window), ()) if window else ()
        zone_map = optional(
            lambda: src.vegetation.zone_map(cmd.geometry, today.year - 5, today.year - 1), None
        )
        observed_et = (
            optional(
                lambda: src.evapotranspiration.actual(cmd.geometry, date(inputs.season, 1, 1), end),
                (),
            )
            if inputs.irrigation is not IrrigationSystem.NONE
            else ()
        )

        candidates_ind = (
            risks.planting_window(
                runs_by_date=runs_by_date, soil_moisture=soil_moisture, chosen=inputs.planting_date
            ),
            risks.hybrid_fit(outcomes=outcomes, hybrid_rm_days=inputs.hybrid_rm_days, params=maize),
            risks.flowering_water(outcomes=outcomes, params=maize),
            risks.flowering_heat(outcomes=outcomes, params=maize),
            risks.frost(outcomes=outcomes),
            irrigation.irrigation(outcomes=outcomes, inputs=inputs, observed_et=observed_et),
            vegetation.season_progress(ndvi=ndvi, planting_date=inputs.planting_date, today=today),
            waterlogging.waterlogging(
                outcomes=outcomes, soil=ctx.soil, terrain=ctx.terrain, soil_moisture=soil_moisture
            ),
            zones.field_zones(zone_map),
        )
        indicators = tuple(i for i in candidates_ind if i is not None)

        sources = {*climate.sources, *(s for ind in indicators for s in ind.evidence.sources)}
        if ctx.soil and ctx.soil.source != "fallback":
            sources.add(ctx.soil.source)
        else:
            sources.add("Generic loam soil (no soil data; assumed)")
        if ctx.terrain is None or ctx.terrain.mean_slope_pct is None:
            sources.add("Slope not available (assumed flat)")
        sources.update(c.source for c in ctx.crop_history)
        if ctx.enso_now:
            sources.add("NOAA CPC ONI")
        runs =tuple(sorted((scenarios.to_run(o) for o in outcomes), key=lambda r: r.year))

        report = FieldReport(
            context=ctx,
            inputs=inputs,
            summary=summary.summarize(context=ctx, indicators=indicators),  # F8
            timeline=summary.timeline(outcomes=outcomes, indicators=indicators, today=today),
            indicators=indicators,
            rotation=rotation.compare(context=ctx, inputs=inputs, outcomes=outcomes),  # F7
            enso=enso.insight(
                now=ctx.enso_now, outcomes=outcomes, county_yields=ctx.county_yields
            ),  # F6
            zones_geojson=zone_map,
            sources=tuple(sorted(sources)),
            observed_until=season_scenarios[0].observed_until,
            runs=runs,
            typical_year=scenarios.typical(outcomes).scenario.analog_year,
        )
        self._cache.put(key, report)
        return report
