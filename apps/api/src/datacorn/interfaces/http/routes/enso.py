# SI-assisted (Claude Code); reviewed by <name>
from fastapi import APIRouter

from datacorn.application.dto import EnsoOverview
from datacorn.interfaces.http.dependencies import ContainerDep

router = APIRouter(tags=["enso"])


@router.get("/enso", response_model=EnsoOverview)
def enso_now(container: ContainerDep) -> EnsoOverview:
    """Índice ONI de NOAA: fase actual y últimos 3 años."""
    return container.enso_now.execute()
