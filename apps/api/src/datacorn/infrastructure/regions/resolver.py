"""Elige el perfil de región de un punto y arma sus adaptadores."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from datacorn.application.ports import RegionDataSources, RegionInfo
from datacorn.domain.models import LonLat
from datacorn.infrastructure.regions.profile import RegionProfile

PORTS = (
    "admin",
    "climate",
    "soil",
    "elevation",
    "vegetation",
    "soil_moisture",
    "evapotranspiration",
    "enso",
    "crop_history",
    "yield_stats",
)
REQUIRED_PORTS = PORTS[:8]
GLOBAL_PROFILE = "global"


class CountryLocator(Protocol):
    def country(self, point: LonLat) -> str | None: ...


class ProviderChains(Protocol):
    @property
    def known(self) -> frozenset[str]: ...

    def chain(self, provider_ids: Sequence[str]) -> object | None: ...


class ProfileRegionResolver:
    def __init__(
        self,
        profiles: Sequence[RegionProfile],
        providers: ProviderChains,
        countries: CountryLocator,
    ) -> None:
        self._all = tuple(profiles)
        active = [p for p in self._all if p.status == "active"]
        self._global = next(p for p in active if p.id == GLOBAL_PROFILE)
        self._specific = [p for p in active if p.id != GLOBAL_PROFILE]
        self._providers = providers
        self._countries = countries
        self._built: dict[str, RegionDataSources] = {}
        for profile in active:  # falla al arrancar, no en medio de un análisis
            self._check(profile)

    def profile_for(self, point: LonLat) -> RegionProfile:
        country = self._countries.country(point)
        return next((p for p in self._specific if country in p.countries), self._global)

    def resolve(self, point: LonLat) -> RegionDataSources:
        profile = self.profile_for(point)
        if profile.id not in self._built:
            ids = profile.providers
            chains = {port: self._providers.chain(ids.get(port, ())) for port in PORTS}
            self._built[profile.id] = RegionDataSources(region_id=profile.id, **chains)
        return self._built[profile.id]

    def catalog(self) -> tuple[RegionInfo, ...]:
        return tuple(
            RegionInfo(id=p.id, name=p.name, status=p.status, providers=p.providers)
            for p in self._all
        )

    def _check(self, profile: RegionProfile) -> None:
        missing = [port for port in REQUIRED_PORTS if not profile.providers.get(port)]
        if missing:
            raise ValueError(f"region '{profile.id}': no providers for {missing}")
        unknown = {p for ids in profile.providers.values() for p in ids} - self._providers.known
        if unknown:
            raise ValueError(f"region '{profile.id}': unknown providers {sorted(unknown)}")
