"""Sesión de Earth Engine: se inicializa una vez, con la cuenta de servicio de Cloud Run."""

from __future__ import annotations

import logging
import threading
import time
from types import ModuleType

from datacorn.application.errors import DataUnavailable

SCOPES = (
    "https://www.googleapis.com/auth/earthengine",
    "https://www.googleapis.com/auth/cloud-platform",
)
DEADLINE_MS = 120_000  # igual que el tiempo máximo de Cloud Run: después responde el respaldo
RETRY_AFTER_S = 300  # si no se pudo iniciar, no se reintenta en cada pedido

log = logging.getLogger(__name__)


def request_errors(ee: ModuleType) -> tuple[type[BaseException], ...]:
    """Lo que puede fallar al hablar con Earth Engine: el servicio, la red o el token."""
    from google.auth.exceptions import GoogleAuthError

    return (ee.EEException, OSError, GoogleAuthError)


class EarthEngineSession:
    def __init__(self, *, project: str | None, enabled: bool) -> None:
        self._project = project
        self._enabled = enabled
        self._ready = False
        self._failed_at: float | None = None
        self._lock = threading.Lock()

    def ee(self) -> ModuleType:
        """Devuelve el módulo `ee` inicializado.

        Usa las credenciales por defecto de Google (la cuenta de servicio en Cloud Run; en local,
        `gcloud auth application-default login`).
        """
        if not self._enabled:
            raise DataUnavailable("earth_engine", "disabled (DATACORN_EARTH_ENGINE_ENABLED=false)")
        with self._lock:
            if not self._ready:
                if self._failed_at is not None and time.monotonic() - self._failed_at < RETRY_AFTER_S:
                    raise DataUnavailable("earth_engine", "could not initialize; retrying later")
                import ee
                import google.auth
                from googleapiclient.errors import Error as ApiClientError

                try:
                    credentials, detected = google.auth.default(scopes=list(SCOPES))
                    ee.Initialize(credentials, project=self._project or detected)
                    ee.data.setDeadline(DEADLINE_MS)
                except (*request_errors(ee), ApiClientError) as exc:
                    # Sin credenciales o sin el proyecto registrado: la cadena usa la fuente siguiente
                    self._failed_at = time.monotonic()
                    log.warning("Earth Engine is not available: %s", exc)
                    raise DataUnavailable("earth_engine", f"cannot initialize: {exc}") from exc
                self._ready = True
        import ee

        return ee

    def info(self, source: str, computed: object) -> object:
        """Calcula en el servidor y trae el resultado.

        Un error de Earth Engine (colección sin acceso, cuota, tiempo agotado, red, token) cuenta
        como "sin datos" de esa fuente: la cadena de respaldo de la región prueba la siguiente.
        """
        ee = self.ee()
        try:
            return computed.getInfo()  # type: ignore[attr-defined]
        except request_errors(ee) as exc:
            log.warning("Earth Engine request failed (%s): %s", source, exc)
            raise DataUnavailable(source, f"Earth Engine: {exc}") from exc
