from fastapi import APIRouter

from datacorn.application.ports import DemoField
from datacorn.interfaces.http.dependencies import ContainerDep

router = APIRouter(tags=["demo"])


@router.get("/demo-fields", response_model=list[DemoField])
def list_demo_fields(container: ContainerDep) -> list[DemoField]:
    return list(container.list_demo_fields.execute())
