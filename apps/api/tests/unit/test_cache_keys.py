from datacorn.application.cache_keys import cache_key
from datacorn.domain.models import FieldGeometry, LonLat

RING = (LonLat(-98.0, 40.9), LonLat(-97.99, 40.9), LonLat(-97.99, 40.91), LonLat(-98.0, 40.9))


def test_same_field_same_key() -> None:
    assert cache_key("x", FieldGeometry(RING), 2027) == cache_key("x", FieldGeometry(RING), 2027)


def test_different_inputs_different_key() -> None:
    assert cache_key("x", FieldGeometry(RING), 2027) != cache_key("x", FieldGeometry(RING), 2026)
