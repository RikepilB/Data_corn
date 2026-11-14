from fastapi import APIRouter

from datacorn.application.ports import RegionInfo
from datacorn.interfaces.http.dependencies import ContainerDep

router = APIRouter(tags=["regions"])


@router.get("/regions", response_model=list[RegionInfo])
def list_regions(container: ContainerDep) -> list[RegionInfo]:
    return list(container.list_regions.execute())
