"""Reglas del contorno del lote (RF-04).

Se proyecta a la sinusoidal (equivalente en área sobre la esfera), así el área es exacta para
lotes de cualquier tamaño razonable sin librerías GIS.
"""

from __future__ import annotations

import math

from datacorn.domain.errors import InvalidFieldGeometry
from datacorn.domain.models import FieldGeometry, LonLat

EARTH_RADIUS_M = 6_371_008.8


def _open_ring(geometry: FieldGeometry) -> list[LonLat]:
    pts = list(geometry.ring)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def _project(points: list[LonLat]) -> tuple[list[tuple[float, float]], float]:
    lon0 = sum(p.lon for p in points) / len(points)
    xy = [
        (
            EARTH_RADIUS_M * math.radians(p.lon - lon0) * math.cos(math.radians(p.lat)),
            EARTH_RADIUS_M * math.radians(p.lat),
        )
        for p in points
    ]
    return xy, lon0


def _signed_area(xy: list[tuple[float, float]]) -> float:
    n = len(xy)
    return 0.5 * sum(xy[i][0] * xy[(i + 1) % n][1] - xy[(i + 1) % n][0] * xy[i][1] for i in range(n))


def area_ha(geometry: FieldGeometry) -> float:
    """Área en hectáreas."""
    xy, _ = _project(_open_ring(geometry))
    return abs(_signed_area(xy)) / 10_000


def centroid(geometry: FieldGeometry) -> LonLat:
    """Centroide del polígono."""
    pts = _open_ring(geometry)
    xy, lon0 = _project(pts)
    a = _signed_area(xy)
    if abs(a) < 1e-9:
        return LonLat(sum(p.lon for p in pts) / len(pts), sum(p.lat for p in pts) / len(pts))
    n = len(xy)
    cx = cy = 0.0
    for i in range(n):
        x0, y0 = xy[i]
        x1, y1 = xy[(i + 1) % n]
        cross = x0 * y1 - x1 * y0
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    cx /= 6 * a
    cy /= 6 * a
    lat = math.degrees(cy / EARTH_RADIUS_M)
    lon = lon0 + math.degrees(cx / (EARTH_RADIUS_M * math.cos(math.radians(lat))))
    return LonLat(lon, lat)


def _orient(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _on_segment(a: tuple[float, float], b: tuple[float, float], p: tuple[float, float]) -> bool:
    return min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])


def _segments_cross(p1, p2, q1, q2) -> bool:  # noqa: ANN001
    d1, d2 = _orient(q1, q2, p1), _orient(q1, q2, p2)
    d3, d4 = _orient(p1, p2, q1), _orient(p1, p2, q2)
    if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)) and 0 not in (d1, d2, d3, d4):
        return True
    return (
        (d1 == 0 and _on_segment(q1, q2, p1))
        or (d2 == 0 and _on_segment(q1, q2, p2))
        or (d3 == 0 and _on_segment(p1, p2, q1))
        or (d4 == 0 and _on_segment(p1, p2, q2))
    )


def is_simple(geometry: FieldGeometry) -> bool:
    """True si ningún lado se cruza con otro no contiguo."""
    xy, _ = _project(_open_ring(geometry))
    n = len(xy)
    for i in range(n):
        a1, a2 = xy[i], xy[(i + 1) % n]
        for j in range(i + 1, n):
            if j == i or (j + 1) % n == i or (i + 1) % n == j:
                continue  # lados contiguos comparten un vértice
            if _segments_cross(a1, a2, xy[j], xy[(j + 1) % n]):
                return False
    return True


def validate(
    geometry: FieldGeometry, *, min_area_ha: float, max_area_ha: float, max_vertices: int
) -> float:
    """Valida el contorno y devuelve su área en ha. Lanza InvalidFieldGeometry si no cumple."""
    if geometry.vertex_count < 3:
        raise InvalidFieldGeometry("too_few_vertices")
    if geometry.vertex_count > max_vertices:
        raise InvalidFieldGeometry("too_many_vertices")
    if not is_simple(geometry):
        raise InvalidFieldGeometry("self_intersection")
    area = area_ha(geometry)
    if area < min_area_ha:
        raise InvalidFieldGeometry("area_too_small")
    if area > max_area_ha:
        raise InvalidFieldGeometry("area_too_large")
    return area
