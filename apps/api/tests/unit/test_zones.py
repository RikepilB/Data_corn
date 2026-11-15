# SI-assisted (Claude Code); reviewed by <name>
from __future__ import annotations

from datacorn.domain.agronomy.zones import field_zones
from datacorn.domain.report import Confidence, IndicatorId, RiskLevel


def _zones(shares: dict[str, tuple[int, float]], seasons: int = 5) -> dict[str, object]:
    return {
        "type": "FeatureCollection",
        "meta": {"source": "Sentinel-2", "first_year": 2021, "last_year": 2025, "seasons": seasons},
        "features": [
            {"type": "Feature", "geometry": None, "properties": {"zone": z, "area_pct": a, "ndvi": n}}
            for z, (a, n) in shares.items()
        ],
    }


def test_without_a_zone_map_the_indicator_says_no_data() -> None:
    for missing in (None, {}, {"type": "FeatureCollection", "features": []}):
        indicator = field_zones(missing)
        assert indicator.id is IndicatorId.FIELD_ZONES
        assert indicator.risk is RiskLevel.NO_DATA
        assert indicator.message.key == "field_zones.needs_ee"
        assert indicator.value is None


def test_an_uneven_field_reports_how_much_is_consistently_weaker() -> None:
    indicator = field_zones(_zones({"low": (31, 0.62), "medium": (34, 0.74), "high": (35, 0.76)}))
    assert indicator.risk is RiskLevel.HIGH
    assert indicator.message.key == "field_zones.high"
    assert indicator.message.params == {"low_pct": 31, "high_pct": 35, "seasons": 5, "spread": 0.14}
    assert (indicator.value, indicator.unit) == (0.14, "ndvi")
    assert indicator.evidence.sources == ("Sentinel-2",)
    assert indicator.evidence.years == (2021, 2025)
    assert indicator.confidence is Confidence.HIGH
    assert indicator.field_check is not None


def test_share_of_low_zone_sets_the_level_and_few_seasons_lower_confidence() -> None:
    watch = field_zones(_zones({"low": (12, 0.70), "medium": (80, 0.78), "high": (8, 0.84)}, seasons=2))
    assert (watch.risk, watch.confidence) == (RiskLevel.MEDIUM, Confidence.MEDIUM)
    # Con la copa cerrada el NDVI se satura y la zona alta suele faltar: se compara con la media
    no_high = field_zones(_zones({"low": (30, 0.70), "medium": (70, 0.86)}))
    assert no_high.message.params["spread"] == 0.16 and no_high.message.params["high_pct"] == 0
    even = field_zones(_zones({"medium": (100, 0.8)}, seasons=1))  # sin zona baja ni alta
    assert (even.risk, even.confidence) == (RiskLevel.LOW, Confidence.LOW)
    assert even.message.params["low_pct"] == 0 and even.message.params["spread"] == 0.0
