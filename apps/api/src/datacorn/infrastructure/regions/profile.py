"""Perfiles de región: resources/regions/<id>.yaml.

Agregar un país = agregar su YAML (y, si una fuente es nueva, su adaptador en providers.py).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from importlib.resources import files

import yaml


@dataclass(frozen=True, slots=True)
class RegionProfile:
    id: str
    name: Mapping[str, str]
    status: str  # "active" | "planned"
    countries: tuple[str, ...]  # ISO 3166-1 alfa-2; vacío en el perfil global
    providers: Mapping[str, tuple[str, ...]]  # puerto → proveedores en orden de respaldo
    notes: str | None = None


def load_profiles() -> tuple[RegionProfile, ...]:
    root = files("datacorn.resources") / "regions"
    profiles = []
    for entry in sorted(root.iterdir(), key=lambda e: e.name):
        if not entry.name.endswith(".yaml"):
            continue
        data = yaml.safe_load(entry.read_text(encoding="utf-8"))
        profiles.append(
            RegionProfile(
                id=data["id"],
                name=data["name"],
                status=data["status"],
                countries=tuple(data.get("countries") or ()),
                providers={k: tuple(v or ()) for k, v in data["providers"].items()},
                notes=data.get("notes"),
            )
        )
    return tuple(profiles)
