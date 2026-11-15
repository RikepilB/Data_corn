# SI-assisted (Claude Code); reviewed by <name>
"""Piezas compartidas por los adaptadores de Earth Engine: geometría y series por imagen.

No se ha corrido contra Earth Engine (falta registrar el proyecto): las pruebas cubren la lectura
de las respuestas con una sesión falsa. Los ID y las bandas salen del catálogo (2026-11-14).
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from datacorn.domain.geometry import centroid
from datacorn.domain.models import FieldGeometry
from datacorn.infrastructure.earthengine.session import EarthEngineSession

MAX_PIXELS = 1e9
CHUNK_YEARS = 5  # un pedido por tramo: cada uno queda lejos del límite de tiempo de Earth Engine

Row = tuple[date, dict[str, float]]


def polygon(ee: object, geometry: FieldGeometry) -> object:
    return ee.Geometry.Polygon([[p.lon, p.lat] for p in geometry.ring])  # type: ignore[attr-defined]


def center_point(ee: object, geometry: FieldGeometry) -> object:
    """Para grillas mucho más gruesas que el lote (4-11 km) basta el centro."""
    c = centroid(geometry)
    return ee.Geometry.Point([c.lon, c.lat])  # type: ignore[attr-defined]


def year_chunks(start: date, end: date, years: int = CHUNK_YEARS) -> Iterator[tuple[date, date]]:
    """Tramos [a, b) que cubren de `start` a `end` inclusive."""
    stop = end + timedelta(days=1)
    a = start
    while a < stop:
        b = min(date(a.year + years, 1, 1), stop)
        yield a, b
        a = b


def band_series(
    session: EarthEngineSession,
    source: str,
    collection: object,
    bands: Sequence[str],
    region: object,
    scale: float,
) -> list[Row]:
    """Una fila por imagen: su fecha y la media de cada banda sobre la región.

    Las imágenes sin dato en alguna banda (fuera de cobertura, nubes) no devuelven fila.
    """
    ee = session.ee()

    def row(image: object) -> object:
        stats = image.select(list(bands)).reduceRegion(  # type: ignore[attr-defined]
            reducer=ee.Reducer.mean(), geometry=region, scale=scale, maxPixels=MAX_PIXELS
        )
        return ee.Feature(None, stats).set("d", image.date().format("YYYY-MM-dd"))  # type: ignore[attr-defined]

    columns = ["d", *bands]
    table = ee.FeatureCollection(collection.map(row))  # type: ignore[attr-defined]
    raw = session.info(source, table.reduceColumns(ee.Reducer.toList(len(columns)), columns).get("list"))
    return parse_rows(raw, bands)


def parse_rows(raw: object, bands: Sequence[str]) -> list[Row]:
    out: list[Row] = []
    for item in raw or []:  # type: ignore[union-attr]
        day, *values = item
        if any(v is None for v in values):
            continue
        out.append((date.fromisoformat(day), dict(zip(bands, map(float, values), strict=True))))
    return sorted(out, key=lambda r: r[0])


def chunked_series(
    session: EarthEngineSession,
    source: str,
    collection_for: object,
    bands: Sequence[str],
    region: object,
    scale: float,
    start: date,
    end: date,
) -> list[Row]:
    """Serie larga (25 años diarios) pedida por tramos en paralelo.

    `collection_for(a, b)` devuelve la colección ya filtrada para el tramo [a, b).
    """
    session.ee()  # falla aquí, y no dentro de cada hilo, si Earth Engine está apagado
    chunks = list(year_chunks(start, end))
    with ThreadPoolExecutor(max_workers=min(len(chunks), 6) or 1) as pool:
        parts = pool.map(
            lambda c: band_series(session, source, collection_for(*c), bands, region, scale),  # type: ignore[operator]
            chunks,
        )
        return sorted((r for part in parts for r in part), key=lambda r: r[0])
