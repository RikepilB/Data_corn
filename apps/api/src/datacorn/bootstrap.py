"""Raíz de composición: el único lugar donde se conectan las capas."""

from __future__ import annotations

from dataclasses import dataclass

from datacorn.application.ports import CachePort
from datacorn.application.use_cases import AnalyzeField, DescribeField, ListDemoFields, ListRegions
from datacorn.config import Settings
from datacorn.infrastructure.cache import GcsCache, MemoryCache
from datacorn.infrastructure.clock import SystemClock
from datacorn.infrastructure.crop_catalog import YamlCropCatalog
from datacorn.infrastructure.demo_fields import PackagedDemoFields
from datacorn.infrastructure.providers import ProviderFactory
from datacorn.infrastructure.regions import ProfileRegionResolver, load_profiles
from datacorn.infrastructure.regions.resolver import CountryLocator


@dataclass(frozen=True, slots=True)
class Container:
    settings: Settings
    list_regions: ListRegions
    list_demo_fields: ListDemoFields
    describe_field: DescribeField
    analyze_field: AnalyzeField


def _cache(settings: Settings) -> CachePort:
    if settings.cache_backend == "gcs":
        if not settings.cache_bucket:
            raise ValueError("DATACORN_CACHE_BUCKET is required when DATACORN_CACHE_BACKEND=gcs")
        return GcsCache(settings.cache_bucket)
    return MemoryCache()


def build_container(settings: Settings, *, countries: CountryLocator | None = None) -> Container:
    providers = ProviderFactory(settings)
    regions = ProfileRegionResolver(
        load_profiles(), providers, countries or providers.country_locator()
    )
    cache = _cache(settings)
    clock = SystemClock()
    describe = DescribeField(
        regions=regions,
        cache=cache,
        clock=clock,
        min_area_ha=settings.min_area_ha,
        max_area_ha=settings.max_area_ha,
        max_vertices=settings.max_vertices,
        history_start_year=settings.history_start_year,
    )
    analyze = AnalyzeField(
        regions=regions,
        crops=YamlCropCatalog(),
        cache=cache,
        clock=clock,
        describe=describe,
        history_start_year=settings.history_start_year,
    )
    return Container(
        settings=settings,
        list_regions=ListRegions(regions),
        list_demo_fields=ListDemoFields(PackagedDemoFields()),
        describe_field=describe,
        analyze_field=analyze,
    )
