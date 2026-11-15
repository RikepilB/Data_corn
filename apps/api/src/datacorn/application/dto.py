"""Entradas y salidas de los casos de uso."""

from __future__ import annotations

from dataclasses import dataclass

from datacorn.domain.models import (
    EnsoState,
    FieldContext,
    FieldDefaults,
    FieldGeometry,
    FieldInputs,
)


@dataclass(frozen=True, slots=True)
class DescribeFieldResult:
    context: FieldContext
    defaults: FieldDefaults


@dataclass(frozen=True, slots=True)
class AnalyzeFieldCommand:
    geometry: FieldGeometry
    inputs: FieldInputs


@dataclass(frozen=True, slots=True)
class EnsoOverview:
    """El Niño / La Niña ahora y los últimos trimestres, para el globo."""

    current: EnsoState
    recent: tuple[EnsoState, ...]  # trimestres móviles, del más antiguo al más reciente
