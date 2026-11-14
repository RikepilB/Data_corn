"""Rotación: maíz tras maíz vs maíz tras soya (RF-20).

Sin rendimientos por lote, la comparación usa lo que sí se mide: el historial real del lote
(CDL), el riesgo de erosión por residuos según pendiente y labranza, y el ciclo de plagas.
"""

from __future__ import annotations

from collections.abc import Sequence

from datacorn.domain.agronomy._common import worst
from datacorn.domain.agronomy.scenarios import ScenarioOutcome
from datacorn.domain.models import Crop, FieldContext, FieldInputs, Tillage
from datacorn.domain.report import Message, RiskLevel, RotationComparison, RotationOption

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


def compare(
    *, context: FieldContext, inputs: FieldInputs, outcomes: Sequence[ScenarioOutcome]
) -> RotationComparison:
    history = tuple(sorted(context.crop_history, key=lambda c: c.year))
    pairs = list(zip(history, history[1:], strict=False))
    after_soy = sum(1 for a, b in pairs if b.crop is Crop.MAIZE and a.crop is Crop.SOYBEAN)
    after_corn = sum(1 for a, b in pairs if b.crop is Crop.MAIZE and a.crop is Crop.MAIZE)
    pattern = " ".join(LETTER[c.crop] for c in history[-8:])
    slope = context.terrain.mean_slope_pct if context.terrain else 0.0

    corn_corn = RotationOption(
        previous_crop=Crop.MAIZE,
        relative_yield=None,
        planting_soil_water_mm=None,
        residue_erosion_risk=_erosion(slope, residue_high=True, tillage=inputs.tillage),
        notes=(Message("rotation.note.rootworm"), Message("rotation.note.residue")),
    )
    soy_corn = RotationOption(
        previous_crop=Crop.SOYBEAN,
        relative_yield=None,
        planting_soil_water_mm=None,
        residue_erosion_risk=_erosion(slope, residue_high=False, tillage=inputs.tillage),
        notes=(Message("rotation.note.residue"),),
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
        options=(corn_corn, soy_corn),
        recommended=recommended,
        field_history=history,
        message=Message(
            "rotation.soy_first" if recommended is Crop.SOYBEAN else "rotation.corn_on_slopes",
            {"pattern": pattern, "after_soy": after_soy, "after_corn": after_corn},
        ),
    )
