"""Cultivo de cada año en el lote (CropHistoryPort)."""

from __future__ import annotations

from collections.abc import Mapping

from datacorn.application.errors import DataUnavailable
from datacorn.domain.models import Crop, CropYear, FieldGeometry
from datacorn.infrastructure.cropscape import FALLOW, FIRST_CDL_YEAR, MAIZE, SOYBEAN
from datacorn.infrastructure.earthengine._common import MAX_PIXELS, polygon
from datacorn.infrastructure.earthengine.session import EarthEngineSession

CDL = "USDA/NASS/CDL"  # banda 'cropland', 30 m, EE. UU. completo desde 2008
CDL_SOURCE = "USDA NASS Cropland Data Layer (Earth Engine)"
BACKGROUND = 0


def _crop(value: int) -> Crop:
    if value in MAIZE:
        return Crop.MAIZE
    if value in SOYBEAN:
        return Crop.SOYBEAN
    if value in FALLOW:
        return Crop.FALLOW
    return Crop.OTHER


def majority_by_year(years: list[int], histograms: list[Mapping[str, float]]) -> tuple[CropYear, ...]:
    """La clase que ocupa más píxeles del lote en cada año."""
    out: dict[int, CropYear] = {}
    for year, histogram in zip(years, histograms, strict=True):
        counts = {int(k): v for k, v in (histogram or {}).items() if int(k) != BACKGROUND}
        if counts:
            winner = max(counts, key=lambda k: counts[k])
            out[int(year)] = CropYear(year=int(year), crop=_crop(winner), source=CDL_SOURCE)
    return tuple(out[year] for year in sorted(out))


class CdlCropHistory:
    """Todos los años en un solo pedido: no depende del servicio de CropScape, que a veces omite
    años."""

    def __init__(self, ee: EarthEngineSession) -> None:
        self._ee = ee

    def history(
        self, geometry: FieldGeometry, first_year: int, last_year: int
    ) -> tuple[CropYear, ...]:
        ee = self._ee.ee()
        field = polygon(ee, geometry)

        def classes(image: object) -> object:
            histogram = image.select("cropland").reduceRegion(  # type: ignore[attr-defined]
                reducer=ee.Reducer.frequencyHistogram(), geometry=field, scale=30, maxPixels=MAX_PIXELS
            )
            return ee.Feature(None, {"year": image.date().get("year"), "h": histogram.get("cropland")})  # type: ignore[attr-defined]

        first = max(first_year, FIRST_CDL_YEAR)
        table = ee.FeatureCollection(
            ee.ImageCollection(CDL).filterDate(f"{first}-01-01", f"{last_year + 1}-01-01").map(classes)
        ).filter(ee.Filter.notNull(["h"]))
        raw = self._ee.info(
            "cdl",
            ee.Dictionary({"years": table.aggregate_array("year"), "h": table.aggregate_array("h")}),
        )
        found = majority_by_year(raw["years"], raw["h"])  # type: ignore[index]
        if not found:
            raise DataUnavailable("cdl", "no CDL classes for this field (outside the United States)")
        return found
