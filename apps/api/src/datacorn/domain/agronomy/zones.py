"""Zonas estables dentro del lote (RF-18)."""

from __future__ import annotations

from collections.abc import Mapping

from datacorn.domain.report import Confidence, Evidence, Indicator, IndicatorId, Message, RiskLevel


def field_zones(zones_geojson: Mapping[str, object] | None) -> Indicator:
    """Resume el mapa de zonas. Sin Earth Engine (10-30 m) no hay mapa: SIN DATOS."""
    if not zones_geojson:
        return Indicator(
            id=IndicatorId.FIELD_ZONES,
            risk=RiskLevel.NO_DATA,
            message=Message("field_zones.needs_ee"),
            value=None,
            unit=None,
            evidence=Evidence(sources=(), years=None, method="method.field_zones"),
            confidence=Confidence.LOW,
        )
    raise NotImplementedError("F5: resumen del mapa de zonas de Earth Engine")
