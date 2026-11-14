"""Configuración por variables de entorno (prefijo DATACORN_)."""

from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DATACORN_", env_file=".env", extra="ignore")

    gcp_project: str | None = None
    earth_engine_enabled: bool = False

    cache_backend: Literal["memory", "gcs"] = "memory"
    cache_bucket: str | None = None

    nass_api_key: SecretStr | None = None
    allowed_origins: list[str] = ["http://localhost:4321"]

    # Reglas del contorno (RF-04)
    min_area_ha: float = 1.0
    max_area_ha: float = 2000.0
    max_vertices: int = 500

    # Historia climática usada para los escenarios
    history_start_year: int = 2001
