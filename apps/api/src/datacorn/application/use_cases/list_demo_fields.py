from __future__ import annotations

from datacorn.application.ports import DemoField, DemoFieldsPort


class ListDemoFields:
    """Lotes de ejemplo precalculados (RF-03)."""

    def __init__(self, demo: DemoFieldsPort) -> None:
        self._demo = demo

    def execute(self) -> tuple[DemoField, ...]:
        return self._demo.list()
