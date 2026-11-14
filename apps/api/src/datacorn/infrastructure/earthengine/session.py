"""Sesión de Earth Engine: se inicializa una vez, con la cuenta de servicio de Cloud Run."""

from __future__ import annotations

import threading
from types import ModuleType

from datacorn.application.errors import DataUnavailable

SCOPES = (
    "https://www.googleapis.com/auth/earthengine",
    "https://www.googleapis.com/auth/cloud-platform",
)


class EarthEngineSession:
    def __init__(self, *, project: str | None, enabled: bool) -> None:
        self._project = project
        self._enabled = enabled
        self._ready = False
        self._lock = threading.Lock()

    def ee(self) -> ModuleType:
        """Devuelve el módulo `ee` inicializado. Local: `earthengine authenticate` antes."""
        if not self._enabled:
            raise DataUnavailable("earth_engine", "disabled (DATACORN_EARTH_ENGINE_ENABLED=false)")
        with self._lock:
            if not self._ready:
                import ee
                import google.auth

                credentials, _ = google.auth.default(scopes=list(SCOPES))
                ee.Initialize(credentials, project=self._project)
                self._ready = True
        import ee

        return ee
