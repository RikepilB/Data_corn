"""Zonas estables dentro del lote (RF-18)."""

from __future__ import annotations

from collections.abc import Mapping

from datacorn.domain.report import Confidence, Evidence, Indicator, IndicatorId, Message, RiskLevel

ZONES = ("low", "medium", "high")
# Qué parte del lote puede ser zona baja antes de llamarlo desparejo · verificar con un agrónomo
EVEN_BELOW_PCT = 10
UNEVEN_FROM_PCT = 25
SEASONS_FOR_HIGH_CONFIDENCE = 4


def _no_data() -> Indicator:
    return Indicator(
        id=IndicatorId.FIELD_ZONES,
        risk=RiskLevel.NO_DATA,
        message=Message("field_zones.needs_ee"),
        value=None,
        unit=None,
        evidence=Evidence(sources=(), years=None, method="method.field_zones"),
        confidence=Confidence.LOW,
    )


def _classes(zones_geojson: Mapping[str, object]) -> dict[str, tuple[int, float | None]]:
    """Clase → (porcentaje del lote, NDVI medio). Todos los parches de una clase traen lo mismo."""
    out: dict[str, tuple[int, float | None]] = {}
    for feature in zones_geojson.get("features") or ():  # type: ignore[union-attr]
        props = feature.get("properties") or {}
        if props.get("zone") in ZONES:
            out[props["zone"]] = (int(props.get("area_pct") or 0), props.get("ndvi"))
    return out


def field_zones(zones_geojson: Mapping[str, object] | None) -> Indicator:
    """Resume el mapa de zonas: cuánto del lote rinde siempre por debajo del resto.

    Sin imágenes de 10 a 30 m (Earth Engine) no hay mapa: SIN DATOS.
    """
    classes = _classes(zones_geojson) if zones_geojson else {}
    if not classes:
        return _no_data()
    meta: Mapping[str, object] = zones_geojson.get("meta") or {}  # type: ignore[union-attr,assignment]
    low_pct, low_ndvi = classes.get("low", (0, None))
    high_pct, high_ndvi = classes.get("high", (0, None))
    # Diferencia entre la mejor zona presente y la baja. Con la copa cerrada el NDVI se satura
    # y la clase alta suele faltar: entonces se compara con la media. Sin zona baja, 0.
    best = high_ndvi if high_ndvi is not None else classes.get("medium", (0, None))[1]
    spread = round(best - low_ndvi, 2) if low_ndvi is not None and best is not None else 0.0
    if low_pct < EVEN_BELOW_PCT:
        risk = RiskLevel.LOW
    elif low_pct < UNEVEN_FROM_PCT:
        risk = RiskLevel.MEDIUM
    else:
        risk = RiskLevel.HIGH
    seasons = int(meta.get("seasons") or 0)  # type: ignore[call-overload]
    first, last = meta.get("first_year"), meta.get("last_year")
    if seasons >= SEASONS_FOR_HIGH_CONFIDENCE:
        confidence = Confidence.HIGH
    else:
        confidence = Confidence.MEDIUM if seasons >= 2 else Confidence.LOW
    return Indicator(
        id=IndicatorId.FIELD_ZONES,
        risk=risk,
        message=Message(
            f"field_zones.{risk.value}",
            {"low_pct": low_pct, "high_pct": high_pct, "seasons": seasons, "spread": spread},
        ),
        value=spread,
        unit="ndvi",
        evidence=Evidence(
            sources=(str(meta["source"]),) if meta.get("source") else (),
            years=(int(first), int(last)) if first and last else None,  # type: ignore[call-overload]
            method="method.field_zones",
        ),
        confidence=confidence,
        field_check=Message("check.scout_field"),
    )
