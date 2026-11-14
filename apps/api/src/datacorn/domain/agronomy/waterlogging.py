"""Riesgo de encharcamiento (RF-17)."""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import SoilMoistureObservation, SoilProfile, Terrain
from datacorn.domain.report import Indicator


def waterlogging(
    *,
    outcomes: Sequence[ScenarioOutcome],
    soil: SoilProfile | None,
    terrain: Terrain | None,
    soil_moisture: Sequence[SoilMoistureObservation],
) -> Indicator:
    """Suelo saturado + lluvias extremas + drenaje + zonas bajas."""
    raise NotImplementedError("F5: encharcamiento")
