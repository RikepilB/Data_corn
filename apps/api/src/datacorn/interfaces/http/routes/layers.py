# SI-assisted (Claude Code); reviewed by <name>
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from datacorn.application.ports import TileLayer
from datacorn.interfaces.http.dependencies import ContainerDep

router = APIRouter(tags=["layers"])


@router.get("/layers/drought/tiles", response_model=TileLayer)
def drought_tiles(
    container: ContainerDep,
    month: Annotated[str, Query(alias="date", pattern=r"^\d{4}-(0[1-9]|1[0-2])$")],
) -> TileLayer:
    """Teselas de la humedad del suelo frente a lo normal en un mes (AAAA-MM). Sin Earth Engine
    responde 422 `data_unavailable` y la web sigue con la capa de NASA GIBS."""
    year, month_number = map(int, month.split("-"))
    return container.drought_layer.execute(date(year, month_number, 1))
