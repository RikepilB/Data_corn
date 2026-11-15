"""Registro de proveedores de datos: id del YAML → adaptador, con respaldo y caché en memoria."""

from __future__ import annotations

import threading
from collections import OrderedDict
from collections.abc import Callable, Sequence

from datacorn.application.errors import DataUnavailable
from datacorn.config import Settings
from datacorn.infrastructure.cropscape import CropScapeHistory
from datacorn.infrastructure.earthengine.admin import GaulAdmin, TigerCounties
from datacorn.infrastructure.earthengine.climate import (
    Era5LandClimate,
    PowerImergClimate,
    PrismPowerClimate,
)
from datacorn.infrastructure.earthengine.crop_history import CdlCropHistory
from datacorn.infrastructure.earthengine.drought import SmapDroughtLayer
from datacorn.infrastructure.earthengine.elevation import NasademElevation
from datacorn.infrastructure.earthengine.evapotranspiration import OpenEtEvapotranspiration
from datacorn.infrastructure.earthengine.session import EarthEngineSession
from datacorn.infrastructure.earthengine.soil_moisture import NldasSoilMoisture, SmapL4SoilMoisture
from datacorn.infrastructure.earthengine.soilgrids import SoilGridsSoil
from datacorn.infrastructure.earthengine.vegetation import HlsSentinel2Vegetation, ModisVegetation
from datacorn.infrastructure.ecostress import EcostressEvapotranspiration
from datacorn.infrastructure.enso.enfen_icen import EnfenIcen
from datacorn.infrastructure.enso.noaa_oni import NoaaOni
from datacorn.infrastructure.fcc import FccAdmin, FccCensusArea, FccCountryLocator, PointAdmin
from datacorn.infrastructure.nass import NassYieldStats
from datacorn.infrastructure.ornl_modis import OrnlModisVegetation
from datacorn.infrastructure.power import PowerClient, PowerClimate, PowerSoilWetness, PowerTerrain
from datacorn.infrastructure.soilgrids_rest import SoilGridsRest
from datacorn.infrastructure.ssurgo import SoilDataAccess, SsurgoPowerTerrain, SsurgoSoil
from datacorn.infrastructure.unavailable import NoEvapotranspiration


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


class Memo:
    """Guarda en memoria cada respuesta por (método, argumentos): describe precarga, analyze
    reutiliza (RF-33). Si dos hilos piden lo mismo a la vez, se descarga una sola vez."""

    def __init__(self, adapter: object, max_entries: int = 256) -> None:
        self._adapter = adapter
        self._max = max_entries
        self._cache: OrderedDict[tuple, object] = OrderedDict()
        self._lock = threading.Lock()
        self._key_locks: dict[tuple, threading.Lock] = {}

    def __getattr__(self, name: str) -> Callable[..., object]:
        target = getattr(self._adapter, name)

        def call(*args: object, **kwargs: object) -> object:
            key = (name, args, tuple(sorted(kwargs.items())))
            with self._lock:
                if key in self._cache:
                    self._cache.move_to_end(key)
                    return self._cache[key]
                key_lock = self._key_locks.setdefault(key, threading.Lock())
            with key_lock:
                with self._lock:
                    if key in self._cache:
                        return self._cache[key]
                value = target(*args, **kwargs)
                with self._lock:
                    self._cache[key] = value
                    while len(self._cache) > self._max:
                        self._cache.popitem(last=False)
                return value

        return call


class ProviderFactory:
    def __init__(self, settings: Settings) -> None:
        ee = EarthEngineSession(project=settings.gcp_project, enabled=settings.earth_engine_enabled)
        self._ee = ee
        power = PowerClient()
        sda = SoilDataAccess()
        self._fcc = FccCensusArea()
        fcc = self._fcc
        self._builders: dict[str, Callable[[], object]] = {
            # Sin cuenta: funcionan hoy
            "power": lambda: PowerClimate(power),
            "power_soil_wetness": lambda: PowerSoilWetness(power),
            "power_terrain": lambda: PowerTerrain(power),
            "ssurgo": lambda: SsurgoSoil(sda),
            "ssurgo_power_terrain": lambda: SsurgoPowerTerrain(sda, power),
            "soilgrids_rest": lambda: SoilGridsRest(),
            "cropscape": lambda: CropScapeHistory(),
            "ornl_modis": lambda: OrnlModisVegetation(),
            "oni": lambda: NoaaOni(),
            "fcc": lambda: FccAdmin(fcc),
            "point_admin": lambda: PointAdmin(),
            "no_et": lambda: NoEvapotranspiration(),
            # Con clave de NASS QuickStats
            "nass": lambda: NassYieldStats(settings.nass_api_key),
            # Con Earth Engine (proyecto de Google Cloud registrado)
            "prism_power": lambda: PrismPowerClimate(ee, power),
            "power_imerg": lambda: PowerImergClimate(ee, power),
            "era5_land": lambda: Era5LandClimate(ee),
            "soilgrids": lambda: SoilGridsSoil(ee),
            "nasadem": lambda: NasademElevation(ee),
            "cdl": lambda: CdlCropHistory(ee),
            "hls_sentinel2": lambda: HlsSentinel2Vegetation(ee),
            "modis": lambda: ModisVegetation(ee),
            "smap_l4": lambda: SmapL4SoilMoisture(ee),
            "nldas": lambda: NldasSoilMoisture(ee),
            "openet": lambda: OpenEtEvapotranspiration(ee),
            "tiger_counties": lambda: TigerCounties(ee),
            "gaul": lambda: GaulAdmin(ee),
            # Con cuenta de Earthdata / planificados
            "ecostress": lambda: EcostressEvapotranspiration(),
            "icen": lambda: EnfenIcen(),
        }
        self._instances: dict[str, object] = {}

    @property
    def known(self) -> frozenset[str]:
        return frozenset(self._builders)

    def chain(self, provider_ids: Sequence[str]) -> object | None:
        if not provider_ids:
            return None
        adapters = [self._instance(p) for p in provider_ids]
        return Memo(adapters[0] if len(adapters) == 1 else Fallback(adapters))

    def country_locator(self) -> FccCountryLocator:
        return FccCountryLocator(self._fcc)

    def drought_layer(self) -> SmapDroughtLayer:
        return SmapDroughtLayer(self._ee)

    def _instance(self, provider_id: str) -> object:
        if provider_id not in self._instances:
            self._instances[provider_id] = self._builders[provider_id]()
        return self._instances[provider_id]
