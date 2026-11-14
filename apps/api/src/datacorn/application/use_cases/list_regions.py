from __future__ import annotations

from datacorn.application.ports import RegionInfo, RegionResolverPort


class ListRegions:
    """Regiones con perfil de datos (activas y planificadas)."""

    def __init__(self, regions: RegionResolverPort) -> None:
        self._regions = regions

    def execute(self) -> tuple[RegionInfo, ...]:
        return self._regions.catalog()
