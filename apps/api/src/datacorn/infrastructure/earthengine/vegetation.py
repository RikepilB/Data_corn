"""NDVI del lote y zonas estables (VegetationPort)."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta
from statistics import mean

from datacorn.application.errors import DataUnavailable
from datacorn.domain.geometry import centroid
from datacorn.domain.models import FieldGeometry, VegetationObservation
from datacorn.infrastructure.earthengine._common import MAX_PIXELS, Row, band_series, polygon
from datacorn.infrastructure.earthengine.session import EarthEngineSession

HLS_L30 = "NASA/HLS/HLSL30/v002"  # Landsat armonizado, 30 m: rojo B4, infrarrojo B5
HLS_S30 = "NASA/HLS/HLSS30/v002"  # Sentinel-2 armonizado, 30 m: rojo B4, infrarrojo B8A
HLS_SENSOR = "NASA HLS v2 (Landsat + Sentinel-2, 30 m)"
FMASK_BAD = 0b11111  # bits 0-4: cirro, nube, borde de nube, sombra, nieve o hielo
MIN_CLEAR_FRACTION = 0.6  # una escena cuenta si al menos el 60 % del lote se ve despejado
GREENUP_MONTHS = (5, 7)  # el verdeo del maíz; el mismo tramo que pide el respaldo de ORNL

MODIS_VI = "MODIS/061/MOD13Q1"  # 250 m, 16 días, desde 2000 (historia larga)
MODIS_SENSOR = "NASA MODIS MOD13Q1 (Earth Engine)"
MODIS_SCALE = 0.0001

SENTINEL2_SR = "COPERNICUS/S2_SR_HARMONIZED"  # 10 m, para zonas dentro del lote
CLOUD_SCORE = "GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED"  # banda cs: 0 nube, 1 despejado
CLEAR_SCORE = 0.6
S2_SOURCE = "Copernicus Sentinel-2 SR (Earth Engine)"
S2_SCALE_M = 10
PEAK_MONTHS = {True: (7, 8), False: (1, 2)}  # copa cerrada del maíz: hemisferio norte / sur
ZONE_BAND = 0.05  # zona baja o alta: más de 5 % bajo o sobre la mediana del lote · verificar
ZONE_NAMES = {1: "low", 2: "medium", 3: "high"}
MIN_PATCH_M2 = 300.0  # parches de menos de 3 píxeles son ruido
EDGE_M = 15  # franja del borde que no se clasifica (un píxel y medio)


def ndvi_by_day(rows: list[Row], sensor: str) -> tuple[VegetationObservation, ...]:
    """Promedia las escenas del mismo día y descarta las que vieron poco del lote."""
    by_day: dict[date, list[float]] = {}
    for day, v in rows:
        if v.get("valid", 1.0) >= MIN_CLEAR_FRACTION:
            by_day.setdefault(day, []).append(v["ndvi"])
    return tuple(VegetationObservation(d, mean(vals), sensor) for d, vals in sorted(by_day.items()))


def build_zone_map(raw: Mapping[str, object], first_year: int, last_year: int) -> dict[str, object]:
    """Vectores de Earth Engine → el GeoJSON del reporte: una clase por parche, con su NDVI medio
    y el porcentaje del lote que ocupa esa clase."""
    patches = []
    for f in (raw.get("zones") or {}).get("features") or []:  # type: ignore[union-attr]
        props, geometry = f.get("properties") or {}, f.get("geometry") or {}
        zone, area = props.get("zone"), props.get("area_m2") or 0.0
        is_patch = geometry.get("type") in ("Polygon", "MultiPolygon")
        if zone in ZONE_NAMES and area >= MIN_PATCH_M2 and is_patch:
            patches.append((int(zone), float(area), props.get("mean"), geometry))
    total = sum(p[1] for p in patches)
    if total <= 0:
        raise DataUnavailable("sentinel2", "no clear peak-season imagery for this field")
    stats: dict[int, tuple[float, float | None]] = {}
    for zone in ZONE_NAMES:
        mine = [(a, n) for z, a, n, _ in patches if z == zone and n is not None]
        weight = sum(a for a, _ in mine)
        area = sum(a for z, a, _, _ in patches if z == zone)
        stats[zone] = (area, sum(a * n for a, n in mine) / weight if weight else None)
    features = [
        {
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "zone": ZONE_NAMES[zone],
                "ndvi": None if stats[zone][1] is None else round(stats[zone][1], 3),
                "area_pct": round(100 * stats[zone][0] / total),
            },
        }
        for zone, _, _, geometry in patches
    ]
    return {
        "type": "FeatureCollection",
        "meta": {
            "source": S2_SOURCE,
            "first_year": first_year,
            "last_year": last_year,
            "seasons": int(raw.get("seasons") or 0),  # type: ignore[call-overload]
            "resolution_m": S2_SCALE_M,
        },
        "features": features,
    }


class HlsSentinel2Vegetation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def _hls(self, collection: str, nir: str, region: object, start: date, end: date) -> object:
        ee = self._ee.ee()

        def ndvi(image: object) -> object:
            clear = image.select("Fmask").bitwiseAnd(FMASK_BAD).eq(0)  # type: ignore[attr-defined]
            return (
                image.normalizedDifference([nir, "B4"])  # type: ignore[attr-defined]
                .updateMask(clear)
                .rename("ndvi")
                .addBands(clear.unmask(0).rename("valid"))
                .set("system:time_start", image.get("system:time_start"))  # type: ignore[attr-defined]
            )

        return (
            ee.ImageCollection(collection)
            .filterBounds(region)
            .filterDate(start.isoformat(), (end + timedelta(days=1)).isoformat())
            .filter(ee.Filter.calendarRange(*GREENUP_MONTHS, "month"))
            .map(ndvi)
        )

    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]:
        ee = self._ee.ee()
        field = polygon(ee, geometry)
        scenes = self._hls(HLS_L30, "B5", field, start, end).merge(  # type: ignore[attr-defined]
            self._hls(HLS_S30, "B8A", field, start, end)
        )
        obs = ndvi_by_day(band_series(self._ee, "hls", scenes, ("ndvi", "valid"), field, 30), HLS_SENSOR)
        if not obs:
            raise DataUnavailable("hls", "no clear HLS scenes over this field")
        return obs

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]:
        """Mediana del NDVI de la copa cerrada en varias campañas, a 10 m. Cada píxel se compara
        con la mediana del propio lote: baja, media o alta.

        Con la copa cerrada el NDVI se satura cerca de 0,9, así que casi nunca hay zona alta: lo
        que el mapa separa bien es la zona baja.
        """
        ee = self._ee.ee()
        field = polygon(ee, geometry)
        # Los píxeles del borde mezclan lote con camino o lote vecino: quedan fuera, para no
        # contarlos como zona baja
        inner = field.buffer(-EDGE_M)
        images = (
            ee.ImageCollection(SENTINEL2_SR)
            .filterBounds(field)
            .filterDate(f"{first_year}-01-01", f"{last_year + 1}-01-01")
            .filter(ee.Filter.calendarRange(*PEAK_MONTHS[centroid(geometry).lat >= 0], "month"))
        )
        grid = images.first().select("B8").projection()  # la grilla UTM de 10 m de Sentinel-2

        def ndvi(image: object) -> object:
            clear = image.select("cs").gte(CLEAR_SCORE)  # type: ignore[attr-defined]
            value = image.normalizedDifference(["B8", "B4"]).updateMask(clear).rename("ndvi")  # type: ignore[attr-defined]
            seen = value.reduceRegion(
                reducer=ee.Reducer.count(), geometry=inner, scale=20, maxPixels=MAX_PIXELS
            ).get("ndvi")
            return value.set("year", image.date().get("year"), "clear_px", seen)  # type: ignore[attr-defined]

        # Solo cuentan las escenas que vieron el lote despejado: así `seasons` dice cuántas
        # campañas respaldan el mapa, no cuántas veces pasó el satélite
        scenes = (
            images.linkCollection(ee.ImageCollection(CLOUD_SCORE), ["cs"])
            .map(ndvi)
            .filter(ee.Filter.gt("clear_px", 0))
        )
        stable = scenes.median().clip(inner)
        median = ee.Number(
            stable.reduceRegion(
                reducer=ee.Reducer.median(),
                geometry=inner,
                crs=grid,
                scale=S2_SCALE_M,
                maxPixels=MAX_PIXELS,
            ).get("ndvi")
        )
        relative = stable.divide(median)
        zone = (
            relative.gt(1 - ZONE_BAND)
            .add(relative.gt(1 + ZONE_BAND))
            .add(1)  # 1 baja, 2 media, 3 alta
            .focalMode(radius=1, kernelType="square", units="pixels")  # quita píxeles sueltos
            .clip(inner)
            .toByte()
            .rename("zone")
        )
        vectors = zone.addBands(stable).reduceToVectors(
            geometry=inner,
            crs=grid,
            scale=S2_SCALE_M,
            geometryType="polygon",
            eightConnected=True,
            labelProperty="zone",
            reducer=ee.Reducer.mean(),
            maxPixels=MAX_PIXELS,
            bestEffort=True,
        )
        raw = self._ee.info(
            "sentinel2",
            ee.Dictionary(
                {
                    "zones": vectors.map(lambda f: f.set("area_m2", f.geometry().area(1))),
                    "seasons": scenes.aggregate_array("year").distinct().size(),
                }
            ),
        )
        return build_zone_map(raw, first_year, last_year)  # type: ignore[arg-type]


class ModisVegetation:
    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def ndvi_series(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[VegetationObservation, ...]:
        ee = self._ee.ee()

        def ndvi(image: object) -> object:
            good = image.select("SummaryQA").lte(1)  # type: ignore[attr-defined]  # 0 bueno, 1 marginal
            return (
                image.select("NDVI")  # type: ignore[attr-defined]
                .multiply(MODIS_SCALE)
                .updateMask(good)
                .rename("ndvi")
                .set("system:time_start", image.get("system:time_start"))  # type: ignore[attr-defined]
            )

        scenes = (
            ee.ImageCollection(MODIS_VI)
            .filterDate(start.isoformat(), (end + timedelta(days=1)).isoformat())
            .filter(ee.Filter.calendarRange(*GREENUP_MONTHS, "month"))
            .map(ndvi)
        )
        rows = band_series(self._ee, "modis", scenes, ("ndvi",), polygon(ee, geometry), 250)
        obs = ndvi_by_day(rows, MODIS_SENSOR)
        if not obs:
            raise DataUnavailable("modis", "no MODIS NDVI for this field")
        return obs

    def zone_map(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> Mapping[str, object]:
        raise DataUnavailable("modis", "250 m is too coarse for in-field zones")
