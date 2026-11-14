"""Zonas estables dentro del lote (RF-18)."""

from __future__ import annotations

from collections.abc import Mapping

from datacorn.domain.report import Indicator


def field_zones(zones_geojson: Mapping[str, object] | None) -> Indicator:
    """Resume el mapa de zonas (alta, media, baja) que calcula Earth Engine por píxel."""
    raise NotImplementedError("F5: zonas del lote")
