"""Registro de proveedores de datos: id del YAML → adaptador, con cadena de respaldo."""

from __future__ import annotations

from collections.abc import Callable, Sequence

from datacorn.application.errors import DataUnavailable
from datacorn.config import Settings
from datacorn.infrastructure.earthengine.admin import GaulAdmin, GaulCountryLocator, TigerCounties
from datacorn.infrastructure.earthengine.climate import (
    Era5LandClimate,
    PowerImergClimate,
    PrismPowerClimate,
)
from datacorn.infrastructure.earthengine.crop_history import CdlCropHistory
from datacorn.infrastructure.earthengine.elevation import NasademElevation
from datacorn.infrastructure.earthengine.evapotranspiration import OpenEtEvapotranspiration
from datacorn.infrastructure.earthengine.session import EarthEngineSession
from datacorn.infrastructure.earthengine.soil_moisture import NldasSoilMoisture, SmapL4SoilMoisture
from datacorn.infrastructure.earthengine.soilgrids import SoilGridsSoil
from datacorn.infrastructure.earthengine.vegetation import HlsSentinel2Vegetation, ModisVegetation
from datacorn.infrastructure.ecostress import EcostressEvapotranspiration
from datacorn.infrastructure.enso.enfen_icen import EnfenIcen
from datacorn.infrastructure.enso.noaa_oni import NoaaOni
from datacorn.infrastructure.nass import NassYieldStats
from datacorn.infrastructure.power import PowerClient
from datacorn.infrastructure.ssurgo import SsurgoSoil


class Fallback:
    """Prueba cada adaptador en orden; si uno no tiene datos, pasa al siguiente."""

    def __init__(self, adapters: Sequence[object]) -> None:
        self._adapters = tuple(adapters)

    def __getattr__(self, name: str) -> Callable[..., object]:
        def call(*args: object, **kwargs: object) -> object:
            last: DataUnavailable | None = None
            for adapter in self._adapters:
                try:
                    return getattr(adapter, name)(*args, **kwargs)
                except DataUnavailable as exc:
                    last = exc
            raise last or DataUnavailable("fallback", f"no adapter answered {name}")

        return call


class ProviderFactory:
    def __init__(self, settings: Settings) -> None:
        ee = EarthEngineSession(
            project=settings.gcp_project, enabled=settings.earth_engine_enabled
        )
        power = PowerClient()
        self._ee = ee
        self._builders: dict[str, Callable[[], object]] = {
            # clima
            "prism_power": lambda: PrismPowerClimate(ee, power),
            "power_imerg": lambda: PowerImergClimate(ee, power),
            "era5_land": lambda: Era5LandClimate(ee),
            # suelo y relieve
            "ssurgo": lambda: SsurgoSoil(),
            "soilgrids": lambda: SoilGridsSoil(ee),
            "nasadem": lambda: NasademElevation(ee),
            # cultivos y vegetación
            "cdl": lambda: CdlCropHistory(ee),
            "hls_sentinel2": lambda: HlsSentinel2Vegetation(ee),
            "modis": lambda: ModisVegetation(ee),
            # agua
            "smap_l4": lambda: SmapL4SoilMoisture(ee),
            "nldas": lambda: NldasSoilMoisture(ee),
            "openet": lambda: OpenEtEvapotranspiration(ee),
            "ecostress": lambda: EcostressEvapotranspiration(),
            # El Niño / La Niña
            "oni": lambda: NoaaOni(),
            "icen": lambda: EnfenIcen(),
            # estadísticas y límites administrativos
            "nass": lambda: NassYieldStats(settings.nass_api_key),
            "tiger_counties": lambda: TigerCounties(ee),
            "gaul": lambda: GaulAdmin(ee),
        }
        self._instances: dict[str, object] = {}

    @property
    def known(self) -> frozenset[str]:
        return frozenset(self._builders)

    def chain(self, provider_ids: Sequence[str]) -> object | None:
        if not provider_ids:
            return None
        adapters = [self._instance(p) for p in provider_ids]
        return adapters[0] if len(adapters) == 1 else Fallback(adapters)

    def country_locator(self) -> GaulCountryLocator:
        return GaulCountryLocator(self._ee)

    def _instance(self, provider_id: str) -> object:
        if provider_id not in self._instances:
            self._instances[provider_id] = self._builders[provider_id]()
        return self._instances[provider_id]
