from __future__ import annotations

from datacorn.config import Settings
from datacorn.domain.models import LonLat
from datacorn.infrastructure.providers import ProviderFactory
from datacorn.infrastructure.regions import ProfileRegionResolver, load_profiles
from tests.conftest import FakeCountries

NEBRASKA = LonLat(-98.0, 40.9)
LIMA = LonLat(-77.0, -12.0)


def _resolver() -> ProfileRegionResolver:
    return ProfileRegionResolver(
        load_profiles(), ProviderFactory(Settings(_env_file=None)), FakeCountries()
    )


def test_profiles_include_active_and_planned_regions() -> None:
    status = {p.id: p.status for p in load_profiles()}
    assert status["us"] == "active"
    assert status["global"] == "active"
    assert {status["pe"], status["br"], status["ar"]} == {"planned"}


def test_point_in_us_uses_us_profile() -> None:
    sources = _resolver().resolve(NEBRASKA)
    assert sources.region_id == "us"
    assert sources.crop_history is not None
    assert sources.yield_stats is not None


def test_point_without_active_profile_falls_back_to_global() -> None:
    sources = _resolver().resolve(LIMA)
    assert sources.region_id == "global"
    assert sources.crop_history is None
    assert sources.yield_stats is None


def test_planned_profiles_are_not_validated_until_active() -> None:
    # pe/br/ar citan proveedores que aún no existen; el resolutor arranca igual.
    assert {r.id for r in _resolver().catalog()} >= {"us", "global", "pe", "br", "ar"}
