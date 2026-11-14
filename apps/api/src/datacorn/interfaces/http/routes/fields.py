from fastapi import APIRouter

from datacorn.application.dto import DescribeFieldResult
from datacorn.domain.report import FieldReport
from datacorn.interfaces.http.dependencies import ContainerDep
from datacorn.interfaces.http.schemas import AnalyzeFieldRequest, DescribeFieldRequest

router = APIRouter(prefix="/fields", tags=["fields"])


@router.post("/describe", response_model=DescribeFieldResult)
def describe_field(body: DescribeFieldRequest, container: ContainerDep) -> DescribeFieldResult:
    """Contexto del lote y valores por defecto del formulario (RF-05, RF-06)."""
    return container.describe_field.execute(body.geometry.to_domain(), season=body.season)


@router.post("/analyze", response_model=FieldReport)
def analyze_field(body: AnalyzeFieldRequest, container: ContainerDep) -> FieldReport:
    """Reporte completo para la pantalla única."""
    return container.analyze_field.execute(body.to_command())
