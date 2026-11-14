"""Esquemas de entrada de la API. Las respuestas usan los dataclasses del dominio directamente."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from datacorn.application.dto import AnalyzeFieldCommand
from datacorn.domain.models import (
    Crop,
    FieldGeometry,
    FieldInputs,
    IrrigationSystem,
    LonLat,
    Tillage,
)


class PolygonGeometry(BaseModel):
    """GeoJSON Polygon. Solo el anillo exterior (sin huecos)."""

    type: Literal["Polygon"]
    coordinates: list[list[list[float]]] = Field(min_length=1, max_length=1)

    @field_validator("coordinates")
    @classmethod
    def _check_ring(cls, rings: list[list[list[float]]]) -> list[list[list[float]]]:
        ring = rings[0]
        if len(ring) < 4:
            raise ValueError("the ring needs at least 4 positions (closed)")
        for position in ring:
            if len(position) not in (2, 3):
                raise ValueError("each position is [lon, lat] or [lon, lat, alt]")
            lon, lat = position[0], position[1]
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise ValueError("coordinates out of range")
        return rings

    def to_domain(self) -> FieldGeometry:
        return FieldGeometry(ring=tuple(LonLat(p[0], p[1]) for p in self.coordinates[0]))


class DescribeFieldRequest(BaseModel):
    geometry: PolygonGeometry
    season: int = Field(ge=2001, le=2100)


class AnalyzeFieldRequest(BaseModel):
    """Los 7 datos del formulario (RF-06), en unidades métricas."""

    geometry: PolygonGeometry
    season: int = Field(ge=2001, le=2100)
    planting_date: date
    hybrid_rm_days: int = Field(ge=80, le=120)
    irrigation: IrrigationSystem = IrrigationSystem.NONE
    irrigation_capacity_mm_day: float | None = Field(default=None, gt=0, le=15)
    tillage: Tillage = Tillage.CONVENTIONAL
    yield_goal_t_ha: float | None = Field(default=None, gt=0, le=25)
    previous_crop: Crop | None = None

    def to_command(self) -> AnalyzeFieldCommand:
        return AnalyzeFieldCommand(
            geometry=self.geometry.to_domain(),
            inputs=FieldInputs(
                season=self.season,
                planting_date=self.planting_date,
                hybrid_rm_days=self.hybrid_rm_days,
                irrigation=self.irrigation,
                irrigation_capacity_mm_day=self.irrigation_capacity_mm_day,
                tillage=self.tillage,
                yield_goal_t_ha=self.yield_goal_t_ha,
                previous_crop=self.previous_crop,
            ),
        )
