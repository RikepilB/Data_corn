from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from datacorn.bootstrap import build_container
from datacorn.config import Settings
from datacorn.domain.models import LonLat
from datacorn.interfaces.http.app import create_app


class FakeCountries:
    """Sin Earth Engine: EE. UU. continental por caja aproximada, el resto sin país."""

    def country(self, point: LonLat) -> str | None:
        if -125 <= point.lon <= -66.9 and 31 <= point.lat <= 49.5:
            return "US"
        return None


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None)


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(build_container(settings, countries=FakeCountries())))
