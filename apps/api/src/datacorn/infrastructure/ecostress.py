"""ECOSTRESS: temperatura de superficie y ET a 70 m.

No está en el catálogo oficial de Earth Engine: se baja con AppEEARS (requiere cuenta de
Earthdata). Por definir en F4/F5.
"""

from __future__ import annotations

from datetime import date

from datacorn.domain.models import EvapotranspirationObservation, FieldGeometry


class EcostressEvapotranspiration:
    def actual(
        self, geometry: FieldGeometry, start: date, end: date
    ) -> tuple[EvapotranspirationObservation, ...]:
        raise NotImplementedError("F4: ET de ECOSTRESS vía AppEEARS")
