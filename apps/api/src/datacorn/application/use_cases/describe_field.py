from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from statistics import mean

from datacorn.application.cache_keys import cache_key
from datacorn.application.data_windows import climate_window, ndvi_window, optional
from datacorn.application.dto import DescribeFieldResult
from datacorn.application.ports import CachePort, ClockPort, RegionResolverPort
from datacorn.domain import geometry as geo
from datacorn.domain.agronomy.phenology import default_hybrid_rm, default_planting_date
from datacorn.domain.models import AdminArea, Crop, FieldContext, FieldDefaults, FieldGeometry


class DescribeField:
    """Al cerrar el lote: valida, detecta todo y deja los datos en caché (RF-04, RF-05).

    Las descargas van en paralelo; las que no son imprescindibles pueden faltar.
    """

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
        first, last = self._history_start_year, today.year - 1
        start, end = climate_window(today, first)
        ndvi = ndvi_window(season, today)

        with ThreadPoolExecutor(max_workers=8) as pool:
            admin_f = pool.submit(
                optional, lambda: src.admin.locate(point), AdminArea(country=src.region_id.upper())
            )
            soil_f = pool.submit(optional, lambda: src.soil.profile(geometry), None)
            terrain_f = pool.submit(optional, lambda: src.elevation.terrain(geometry), None)
            history_f = pool.submit(
                optional,
                lambda: src.crop_history.history(geometry, first, last) if src.crop_history else (),
                (),
            )
            enso_f = pool.submit(optional, src.enso.current, None)
            # Se precargan para que analyze sea inmediato
            climate_f = pool.submit(src.climate.daily, geometry, start, end)
            pool.submit(optional, lambda: src.soil_moisture.series(geometry, start, end), ())
            if ndvi:
                pool.submit(optional, lambda: src.vegetation.ndvi_series(geometry, *ndvi), ())
            pool.submit(optional, lambda: src.enso.history(first, today.year), ())
            admin = admin_f.result()
            yields = (
                optional(lambda: src.yield_stats.county_yields(admin, Crop.MAIZE, first, last), ())
                if src.yield_stats
                else ()
            )
            planting = (
                optional(lambda: src.yield_stats.typical_planting_date(admin, Crop.MAIZE, season), None)
                if src.yield_stats
                else None
            )
            climate = climate_f.result()
            context = FieldContext(
                region_id=src.region_id,
                admin=admin,
                area_ha=area,
                centroid=point,
                soil=soil_f.result(),
                terrain=terrain_f.result(),
                crop_history=history_f.result(),
                county_yields=yields,
                enso_now=enso_f.result(),
            )

        recent = [y.yield_t_ha for y in yields[-5:]]
        defaults = FieldDefaults(
            planting_date=planting or default_planting_date(climate, season),
            hybrid_rm_days=default_hybrid_rm(point.lat),
            yield_goal_t_ha=round(mean(recent), 2) if recent else None,
        )
        result = DescribeFieldResult(context=context, defaults=defaults)
        self._cache.put(key, result)
        return result
