"""Utilidades comunes de los indicadores."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from datacorn.domain.report import Confidence, Evidence, RiskLevel

if TYPE_CHECKING:
    from datacorn.domain.agronomy.scenarios import ScenarioOutcome

SEVERITY = {RiskLevel.NO_DATA: -1, RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1, RiskLevel.HIGH: 2}


def by_fraction(value: float, *, medium: float, high: float) -> RiskLevel:
    """Bajo si value < medium, medio si < high, alto si no."""
    if value < medium:
        return RiskLevel.LOW
    if value < high:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH


def worst(*levels: RiskLevel) -> RiskLevel:
    return max(levels, key=lambda r: SEVERITY[r])


def years_of(outcomes: Sequence[ScenarioOutcome]) -> tuple[int, int] | None:
    years = [o.scenario.analog_year for o in outcomes]
    return (min(years), max(years)) if years else None


def sources_of(outcomes: Sequence[ScenarioOutcome], *extra: str) -> tuple[str, ...]:
    found = {s for o in outcomes[:1] for s in o.scenario.climate.sources}
    return tuple(sorted(found | set(extra)))


def evidence(
    outcomes: Sequence[ScenarioOutcome], method: str, *extra_sources: str
) -> Evidence:
    """`method` es una clave i18n (method.<indicador>) que la web traduce."""
    return Evidence(
        sources=sources_of(outcomes, *extra_sources), years=years_of(outcomes), method=method
    )


def confidence_by_sample(n: int) -> Confidence:
    if n >= 20:
        return Confidence.HIGH
    if n >= 10:
        return Confidence.MEDIUM
    return Confidence.LOW
