"""Reglas del contorno del lote (RF-04). Cálculo puro sobre la esfera, sin librerías GIS."""

from __future__ import annotations

from datacorn.domain.errors import InvalidFieldGeometry
from datacorn.domain.models import FieldGeometry, LonLat


def centroid(geometry: FieldGeometry) -> LonLat:
    """Centroide del lote."""
    raise NotImplementedError("F1: centroide del contorno")


def area_ha(geometry: FieldGeometry) -> float:
    """Área geodésica en hectáreas (exceso esférico, radio terrestre medio)."""
    raise NotImplementedError("F1: área geodésica del contorno")


def is_simple(geometry: FieldGeometry) -> bool:
    """True si ningún lado se cruza con otro (≤ 500 vértices: basta O(n²))."""
    raise NotImplementedError("F1: detección de cruces entre lados")


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
    if not min_area_ha <= area <= max_area_ha:
        raise InvalidFieldGeometry("area_out_of_range")
    return area
