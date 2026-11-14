"""Lotes de ejemplo desde resources/demo/fields.json (RF-03).

Sus reportes precalculados se guardan en la caché (Cloud Storage) en el paso F9.
"""

from __future__ import annotations

import json
from importlib.resources import files

from datacorn.application.ports import DemoField
from datacorn.domain.models import IrrigationSystem


class PackagedDemoFields:
    def list(self) -> tuple[DemoField, ...]:
        path = files("datacorn.resources") / "demo" / "fields.json"
        raw = json.loads(path.read_text(encoding="utf-8"))
        return tuple(
            DemoField(
                id=item["id"],
                name=item["name"],
                region_id=item["region_id"],
                irrigation=IrrigationSystem(item["irrigation"]),
                geometry=item["geometry"],
            )
            for item in raw
        )
