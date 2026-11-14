from __future__ import annotations

from dataclasses import replace
from datetime import date

from datacorn.application.cache_keys import cache_key
from datacorn.application.dto import AnalyzeFieldCommand
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


class AnalyzeField:
    """Reporte completo del lote para la pantalla única.

    Los adaptadores de datos van envueltos en caché por contorno, así que al cambiar fecha,
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
        src = self._regions.resolve(ctx.centroid)
        maize = self._crops.get(Crop.MAIZE)
        start = date(self._history_start_year, 1, 1)

        # F3 · clima histórico + días observados → un escenario por año
        climate = src.climate.daily(cmd.geometry, start, today)
        season_scenarios = scenarios.build(
            climate, season=inputs.season, planting_date=inputs.planting_date, today=today
        )
        # F6 · fase de El Niño de cada año análogo
        season_scenarios = scenarios.tag_enso(
            season_scenarios, src.enso.history(self._history_start_year, today.year)
        )

        def run_all(planting: date) -> tuple[scenarios.ScenarioOutcome, ...]:
            changed = replace(inputs, planting_date=planting)
            return tuple(
                scenarios.run(s, inputs=changed, context=ctx, params=maize)
                for s in season_scenarios
            )

        # F3/F4 · fenología, agua, calor y helada en cada escenario
        outcomes = run_all(inputs.planting_date)
        candidate_dates = scenarios.candidate_planting_dates(inputs.planting_date)
        runs_by_date = {d: run_all(d) for d in candidate_dates}

        # F4/F5 · observaciones satelitales
        soil_moisture = src.soil_moisture.series(cmd.geometry, start, today)
        ndvi = src.vegetation.ndvi_series(cmd.geometry, start, today)
        zone_map = src.vegetation.zone_map(cmd.geometry, today.year - 5, today.year - 1)
        observed_et = (
            src.evapotranspiration.actual(cmd.geometry, date(inputs.season, 1, 1), today)
            if inputs.irrigation is not IrrigationSystem.NONE
            else ()
        )

        candidates = (
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
        indicators = tuple(i for i in candidates if i is not None)
        sources = {*climate.sources, *(s for ind in indicators for s in ind.evidence.sources)}

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
            observed_until=min(today, date(inputs.season, 12, 31)),
        )
        self._cache.put(key, report)
        return report
