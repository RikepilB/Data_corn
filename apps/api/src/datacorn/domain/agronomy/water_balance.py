"""Gemelo de agua del suelo: balance diario FAO-56 en la zona de raíces (RF-12, RF-15)."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import date

from datacorn.domain.agronomy.et0 import et0_fao56
from datacorn.domain.agronomy.phenology import Phenology
from datacorn.domain.crops import CropParameters, YieldResponse
from datacorn.domain.models import (
    ClimateSeries,
    FieldInputs,
    IrrigationSystem,
    SoilProfile,
    Tillage,
)

# Número de curva SCS para cultivo en hileras, buen estado, por grupo hidrológico
CURVE_NUMBER = {"A": 67, "B": 78, "C": 85, "D": 89}
TILLAGE_CN_ADJUST = {Tillage.CONVENTIONAL: 0, Tillage.REDUCED: -2, Tillage.NO_TILL: -4}
# Capacidad por defecto (mm/día) y eficiencia de aplicación por sistema de riego
IRRIGATION_DEFAULTS = {
    IrrigationSystem.PIVOT: (6.35, 0.85),
    IrrigationSystem.FURROW: (8.0, 0.65),
    IrrigationSystem.DRIP: (6.0, 0.92),
}
IRRIGATION_TRIGGER = 0.5  # se riega cuando el agotamiento llega al 50 % del agua fácilmente disponible


@dataclass(frozen=True, slots=True)
class WaterBalanceDay:
    day: date
    et0_mm: float
    kc: float
    etc_mm: float  # ETc ajustada (Ks · Kc · ET0)
    ks: float  # coeficiente de estrés hídrico
    depletion_mm: float  # Dr
    taw_mm: float  # agua total disponible
    raw_mm: float  # agua fácilmente disponible
    rain_mm: float
    irrigation_mm: float  # lámina neta aplicada
    runoff_mm: float  # número de curva SCS
    deep_percolation_mm: float

    @property
    def etc_potential_mm(self) -> float:
        return self.kc * self.et0_mm

    @property
    def available_pct(self) -> float:
        return 0.0 if self.taw_mm <= 0 else max(0.0, 100 * (1 - self.depletion_mm / self.taw_mm))


def irrigation_capacity(inputs: FieldInputs) -> tuple[float, float]:
    """(capacidad bruta mm/día, eficiencia). Sin riego → (0, 1)."""
    if inputs.irrigation is IrrigationSystem.NONE:
        return 0.0, 1.0
    default_cap, eff = IRRIGATION_DEFAULTS[inputs.irrigation]
    return inputs.irrigation_capacity_mm_day or default_cap, eff


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * min(max(t, 0.0), 1.0)


def _kc_curve(p: Phenology, params: CropParameters) -> Callable[[int], float]:
    """Curva Kc de FAO-56 (inicial → desarrollo → media → final), por ordinal del día."""
    kc = params.kc
    e, fs = p.emergence.toordinal(), p.flowering_start.toordinal()
    fe, m = p.flowering_end.toordinal(), (p.maturity or p.last_day).toordinal()
    dev = e + round((fs - e) * 0.3)
    late = fe + round((m - fe) * 0.5)

    def kc_of(o: int) -> float:
        if o < dev:
            return kc.ini
        if o < fs:
            return _lerp(kc.ini, kc.mid, (o - dev) / max(fs - dev, 1))
        if o < late:
            return kc.mid
        if o <= m:
            return _lerp(kc.mid, kc.end, (o - late) / max(m - late, 1))
        return kc.ini  # después de la madurez solo evapora el suelo

    return kc_of


def _root_curve(p: Phenology, params: CropParameters) -> Callable[[int], float]:
    start = p.planting.toordinal()
    span = max(p.flowering_start.toordinal() - start, 1)
    return lambda o: _lerp(params.root_depth_min_m, params.root_depth_max_m, (o - start) / span)


def _runoff(rain: float, cn: float) -> float:
    s = 25400 / cn - 254
    ia = 0.2 * s
    return (rain - ia) ** 2 / (rain + 0.8 * s) if rain > ia else 0.0


def simulate(
    climate: ClimateSeries,
    *,
    phen: Phenology,
    soil: SoilProfile,
    inputs: FieldInputs,
    params: CropParameters,
    lat_deg: float,
    elevation_m: float,
    initial_depletion_fraction: float = 0.15,  # perfil casi lleno tras la recarga de primavera
    et0_by_day: Mapping[date, float] | None = None,
) -> tuple[WaterBalanceDay, ...]:
    """Balance diario desde la siembra hasta la cosecha. Con riego, repone al llegar al umbral.

    `et0_by_day` evita recalcular la ET0 cuando se simulan varias fechas de siembra.
    """
    end = phen.harvest or phen.last_day
    cap, eff = irrigation_capacity(inputs)
    irrigation_stop = phen.maturity or phen.last_day
    cn = CURVE_NUMBER.get(soil.hydrologic_group or "B", 78) + TILLAGE_CN_ADJUST[inputs.tillage]
    aw = soil.available_water_mm_per_m
    kc_of, root_of = _kc_curve(phen, params), _root_curve(phen, params)

    days = [d for d in climate.days if phen.planting <= d.day <= end]
    out: list[WaterBalanceDay] = []
    depletion = None
    for d in days:
        o = d.day.toordinal()
        taw = aw * root_of(o)
        if depletion is None:
            depletion = initial_depletion_fraction * taw
        et0 = (
            et0_by_day[d.day]
            if et0_by_day is not None and d.day in et0_by_day
            else et0_fao56(d, lat_deg=lat_deg, elevation_m=elevation_m)
        )
        kc = kc_of(o)
        p = min(max(params.depletion_fraction_p + 0.04 * (5 - kc * et0), 0.1), 0.8)
        raw = p * taw
        ks = 1.0 if depletion <= raw else max(0.0, (taw - depletion) / ((1 - p) * taw))
        etc = ks * kc * et0

        rain = d.precip_mm
        runoff = _runoff(rain, cn)
        irrigation = 0.0
        if cap > 0 and d.day <= irrigation_stop and depletion >= IRRIGATION_TRIGGER * raw:
            irrigation = min(depletion, cap * eff)

        depletion = depletion - (rain - runoff) - irrigation + etc
        deep = 0.0
        if depletion < 0:
            deep, depletion = -depletion, 0.0
        depletion = min(depletion, taw)
        out.append(
            WaterBalanceDay(
                day=d.day,
                et0_mm=et0,
                kc=kc,
                etc_mm=etc,
                ks=ks,
                depletion_mm=depletion,
                taw_mm=taw,
                raw_mm=raw,
                rain_mm=rain,
                irrigation_mm=irrigation,
                runoff_mm=runoff,
                deep_percolation_mm=deep,
            )
        )
    return tuple(out)


def flowering_deficit_mm(balance: tuple[WaterBalanceDay, ...], phen: Phenology) -> float:
    """Transpiración que faltó en la floración (ETc potencial − ETc ajustada)."""
    return sum(
        b.etc_potential_mm - b.etc_mm
        for b in balance
        if phen.flowering_start <= b.day <= phen.flowering_end
    )


def relative_yield_loss(
    balance: tuple[WaterBalanceDay, ...], phen: Phenology, ky: YieldResponse
) -> float:
    """FAO-33 con Ky estacional: 1 − Ya/Ym = Ky · (1 − ΣETa/ΣETm), de la siembra a la madurez.

    El producto por etapas (Stewart) castiga de más cuando hay estrés leve en varias etapas;
    la sensibilidad de la floración se muestra aparte, con su propio indicador.
    """
    maturity = phen.maturity or phen.last_day
    eta = sum(b.etc_mm for b in balance if b.day <= maturity)
    etm = sum(b.etc_potential_mm for b in balance if b.day <= maturity)
    if etm <= 0:
        return 0.0
    return min(1.0, max(0.0, ky.total * (1 - eta / etm)))
