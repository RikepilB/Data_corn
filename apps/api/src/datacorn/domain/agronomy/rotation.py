"""Rotación: maíz tras maíz vs maíz tras soya (RF-20).

Sin rendimientos por lote, la comparación usa lo que sí se mide: el historial real del lote
(CDL), el riesgo de erosión por residuos según pendiente y labranza, y el ciclo de plagas.
"""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy._common import worst
from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import Crop, CropYear, FieldContext, FieldInputs, Tillage
from datacorn.domain.report import (
    Message,
    RiskLevel,
    RotationComparison,
    RotationOption,
    RotationStrategy,
)

LETTER = {Crop.MAIZE: "M", Crop.SOYBEAN: "S", Crop.FALLOW: "B", Crop.OTHER: "O"}
LOWER = {RiskLevel.HIGH: RiskLevel.MEDIUM, RiskLevel.MEDIUM: RiskLevel.LOW}


def _erosion(slope_pct: float, residue_high: bool, tillage: Tillage) -> RiskLevel:
    if residue_high:
        risk = RiskLevel.MEDIUM if slope_pct >= 6 else RiskLevel.LOW
    else:
        risk = (
            RiskLevel.HIGH if slope_pct >= 4 else RiskLevel.MEDIUM if slope_pct >= 2 else RiskLevel.LOW
        )
    if tillage is Tillage.NO_TILL:
        risk = LOWER.get(risk, risk)
    return risk


def current_strategy(history: Sequence[CropYear]) -> RotationStrategy | None:
    """Qué estrategia coincide con el historial CDL (últimos 4 años); misma regla que la web.

    Maíz los 4 años = maíz tras maíz; maíz y soya alternando = maíz-soya. La cobertura de
    centeno no se ve en el mapa CDL, así que nunca se infiere.
    """
    last = sorted(history, key=lambda c: c.year)[-4:]
    if len(last) < 4:
        return None
    if all(c.crop is Crop.MAIZE for c in last):
        return RotationStrategy.CONTINUOUS_CORN
    in_pair = all(c.crop in (Crop.MAIZE, Crop.SOYBEAN) for c in last)
    if in_pair and all(a.crop is not b.crop for a, b in zip(last, last[1:], strict=False)):
        return RotationStrategy.CORN_SOYBEAN
    return None


def compare(
    *, context: FieldContext, inputs: FieldInputs, outcomes: Sequence[ScenarioOutcome]
) -> RotationComparison:
    history = tuple(sorted(context.crop_history, key=lambda c: c.year))
    pairs = list(zip(history, history[1:], strict=False))
    after_soy = sum(1 for a, b in pairs if b.crop is Crop.MAIZE and a.crop is Crop.SOYBEAN)
    after_corn = sum(1 for a, b in pairs if b.crop is Crop.MAIZE and a.crop is Crop.MAIZE)
    pattern = " ".join(LETTER[c.crop] for c in history[-8:])
    # Sin pendiente conocida se asume terreno llano; el informe lo declara en sus fuentes.
    slope = (context.terrain.mean_slope_pct if context.terrain else None) or 0.0
    current = current_strategy(history)

    corn_corn = RotationOption(
        previous_crop=Crop.MAIZE,
        relative_yield=None,
        planting_soil_water_mm=None,
        residue_erosion_risk=_erosion(slope, residue_high=True, tillage=inputs.tillage),
        notes=(Message("rotation.note.rootworm"), Message("rotation.note.residue")),
        strategy=RotationStrategy.CONTINUOUS_CORN,
        current=current is RotationStrategy.CONTINUOUS_CORN,
    )
    soy_corn = RotationOption(
        previous_crop=Crop.SOYBEAN,
        relative_yield=None,
        planting_soil_water_mm=None,
        residue_erosion_risk=_erosion(slope, residue_high=False, tillage=inputs.tillage),
        notes=(Message("rotation.note.residue"),),
        strategy=RotationStrategy.CORN_SOYBEAN,
        current=current is RotationStrategy.CORN_SOYBEAN,
    )
    # Sin regla documentada de erosión con cobertura de centeno: no_data, no un valor inventado.
    corn_soy_rye = RotationOption(
        previous_crop=Crop.SOYBEAN,
        relative_yield=None,
        planting_soil_water_mm=None,
        residue_erosion_risk=RiskLevel.NO_DATA,
        notes=(),
        strategy=RotationStrategy.CORN_SOYBEAN_RYE,
        current=False,
    )
    # La soya corta el ciclo del gusano de la raíz y deja nitrógeno; si el lote tiene mucha
    # pendiente y labranza convencional, el poco residuo de soya sube la erosión.
    recommended = (
        Crop.MAIZE
        if worst(soy_corn.residue_erosion_risk) is RiskLevel.HIGH
        and corn_corn.residue_erosion_risk is RiskLevel.LOW
        else Crop.SOYBEAN
    )
    return RotationComparison(
        options=(corn_corn, soy_corn, corn_soy_rye),
        recommended=recommended,
        field_history=history,
        message=Message(
            "rotation.soy_first" if recommended is Crop.SOYBEAN else "rotation.corn_on_slopes",
            {"pattern": pattern, "after_soy": after_soy, "after_corn": after_corn},
        ),
    )
