"""Parámetros de cultivo desde resources/crops/<cultivo>.yaml."""

from __future__ import annotations

from importlib.resources import files

import yaml

from datacorn.domain.crops import CropParameters, KcCurve, YieldResponse
from datacorn.domain.models import Crop


class YamlCropCatalog:
    def __init__(self) -> None:
        self._loaded: dict[Crop, CropParameters] = {}

    def get(self, crop: Crop) -> CropParameters:
        if crop not in self._loaded:
            self._loaded[crop] = _load(crop)
        return self._loaded[crop]


def _load(crop: Crop) -> CropParameters:
    path = files("datacorn.resources") / "crops" / f"{crop.value}.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return CropParameters(
        crop=crop,
        base_temp_c=float(data["base_temp_c"]),
        upper_temp_c=float(data["upper_temp_c"]),
        heat_stress_c=float(data["heat_stress_c"]),
        frost_c=float(data["frost_c"]),
        kc=KcCurve(**data["kc"]),
        ky=YieldResponse(**data["ky"]),
        root_depth_min_m=float(data["root_depth_m"]["min"]),
        root_depth_max_m=float(data["root_depth_m"]["max"]),
        depletion_fraction_p=float(data["depletion_fraction_p"]),
        gdd_maturity_by_rm=tuple(
            (int(rm), float(gdd)) for rm, gdd in data.get("gdd_maturity_by_rm") or ()
        ),
        gdd_flowering_fraction=float(data["gdd_flowering_fraction"]),
        references=tuple(data["references"]),
    )
