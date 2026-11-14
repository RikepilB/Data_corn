"""Claves de caché estables: mismo contorno y mismos datos → misma clave."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, is_dataclass

from datacorn.domain.models import FieldGeometry


def _canonical(value: object) -> object:
    if is_dataclass(value) and not isinstance(value, type):
        return _canonical(asdict(value))
    if isinstance(value, dict):
        return {str(k): _canonical(v) for k, v in sorted(value.items())}
    if isinstance(value, list | tuple):
        return [_canonical(v) for v in value]
    if isinstance(value, float):
        return round(value, 6)  # ~10 cm: evita claves distintas por ruido de redondeo
    return value if isinstance(value, str | int | bool | None) else str(value)


def cache_key(kind: str, geometry: FieldGeometry, *parts: object) -> str:
    payload = json.dumps([kind, _canonical(geometry), *(_canonical(p) for p in parts)])
    return f"{kind}/{hashlib.sha256(payload.encode()).hexdigest()}"
