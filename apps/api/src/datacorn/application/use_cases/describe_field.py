from __future__ import annotations

from statistics import mean

from datacorn.application.cache_keys import cache_key
from datacorn.application.dto import DescribeFieldResult
from datacorn.application.ports import CachePort, ClockPort, RegionResolverPort
from datacorn.domain import geometry as geo
from datacorn.domain.agronomy.phenology import default_hybrid_rm
from datacorn.domain.models import Crop, FieldContext, FieldDefaults, FieldGeometry


class DescribeField:
    """Detecta todo lo que sale del contorno (RF-04, RF-05) y propone valores por defecto."""

    def __init__(
        self,
        *,
        regions: RegionResolverPort,
        cache: CachePort,
        clock: ClockPort,
        min_area_ha: float,
        max_area_ha: float,
        max_vertices: int,
        history_start_year: int,
    ) -> None:
        self._regions = regions
        self._cache = cache
        self._clock = clock
        self._limits = {"min_area_ha": min_area_ha, "max_area_ha": max_area_ha}
        self._max_vertices = max_vertices
        self._history_start_year = history_start_year

    def execute(self, geometry: FieldGeometry, *, season: int) -> DescribeFieldResult:
        today = self._clock.today()
        key = cache_key("describe", geometry, season, today.isoformat())
        if (hit := self._cache.get(key, DescribeFieldResult)) is not None:
            return hit

        # F1 · contorno y región
        area = geo.validate(geometry, max_vertices=self._max_vertices, **self._limits)
        point = geo.centroid(geometry)
        src = self._regions.resolve(point)
        admin = src.admin.locate(point)

        # F2 · suelo, relieve, cultivos por año y estadísticas del condado
        last_year = today.year - 1
        soil = src.soil.profile(geometry)
        terrain = src.elevation.terrain(geometry)
        crop_history = (
            src.crop_history.history(geometry, self._history_start_year, last_year)
            if src.crop_history
            else ()
        )
        county_yields = (
            src.yield_stats.county_yields(admin, Crop.MAIZE, self._history_start_year, last_year)
            if src.yield_stats
            else ()
        )

        # F6 · fase actual de El Niño
        enso_now = src.enso.current()

        context = FieldContext(
            region_id=src.region_id,
            admin=admin,
            area_ha=area,
            centroid=point,
            soil=soil,
            terrain=terrain,
            crop_history=crop_history,
            county_yields=county_yields,
            enso_now=enso_now,
        )

        planting = (
            src.yield_stats.typical_planting_date(admin, Crop.MAIZE, season)
            if src.yield_stats
            else None
        )
        if planting is None:
            raise NotImplementedError("F2: fecha de siembra por defecto sin estadísticas locales")
        recent = [y.yield_t_ha for y in county_yields[-5:]]
        defaults = FieldDefaults(
            planting_date=planting,
            hybrid_rm_days=default_hybrid_rm(point.lat),
            yield_goal_t_ha=mean(recent) if recent else None,
        )

        result = DescribeFieldResult(context=context, defaults=defaults)
        self._cache.put(key, result)
        return result
