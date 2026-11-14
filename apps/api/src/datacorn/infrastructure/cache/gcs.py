"""Caché en Cloud Storage: un JSON por clave. Si falla, la API sigue sin caché."""

from __future__ import annotations

import logging
from typing import TypeVar

from pydantic import TypeAdapter

T = TypeVar("T")
log = logging.getLogger(__name__)


class GcsCache:
    def __init__(self, bucket: str, prefix: str = "cache/") -> None:
        from google.cloud import storage

        self._bucket = storage.Client().bucket(bucket)
        self._prefix = prefix

    def _blob(self, key: str):  # noqa: ANN202
        return self._bucket.blob(f"{self._prefix}{key}.json")

    def get(self, key: str, type_: type[T]) -> T | None:
        from google.api_core.exceptions import NotFound

        try:
            data = self._blob(key).download_as_bytes()
        except NotFound:
            return None
        except Exception:  # la caché nunca debe tumbar la API
            log.warning("gcs cache get failed", exc_info=True)
            return None
        return TypeAdapter(type_).validate_json(data)

    def put(self, key: str, value: object) -> None:
        try:
            data = TypeAdapter(type(value)).dump_json(value)
            self._blob(key).upload_from_string(data, content_type="application/json")
        except Exception:
            log.warning("gcs cache put failed", exc_info=True)
