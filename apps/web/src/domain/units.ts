// Conversión de unidades solo para mostrar (RF-41). La API siempre trabaja en métrico.

export type UnitSystem = 'imperial' | 'metric';

export interface Quantity {
  value: number;
  unit: string;
}

const HA_PER_ACRE = 0.40468564224;
const MM_PER_INCH = 25.4;
const CORN_BU_AC_PER_T_HA = 15.93; // maíz, 56 lb por bushel

export const area = (ha: number, u: UnitSystem): Quantity =>
  u === 'metric' ? { value: ha, unit: 'ha' } : { value: ha / HA_PER_ACRE, unit: 'ac' };

export const depth = (mm: number, u: UnitSystem): Quantity =>
  u === 'metric' ? { value: mm, unit: 'mm' } : { value: mm / MM_PER_INCH, unit: 'in' };

export const dailyRate = (mmPerDay: number, u: UnitSystem): Quantity =>
  u === 'metric'
    ? { value: mmPerDay, unit: 'mm/d' }
    : { value: mmPerDay / MM_PER_INCH, unit: 'in/d' };

export const temperature = (c: number, u: UnitSystem): Quantity =>
  u === 'metric' ? { value: c, unit: '°C' } : { value: (c * 9) / 5 + 32, unit: '°F' };

export const cornYield = (tHa: number, u: UnitSystem): Quantity =>
  u === 'metric'
    ? { value: tHa, unit: 't/ha' }
    : { value: tHa * CORN_BU_AC_PER_T_HA, unit: 'bu/ac' };

// Del formulario (unidades del usuario) a métrico
export const dailyRateToMetric = (value: number, u: UnitSystem): number =>
  u === 'metric' ? value : value * MM_PER_INCH;

export const cornYieldToMetric = (value: number, u: UnitSystem): number =>
  u === 'metric' ? value : value / CORN_BU_AC_PER_T_HA;

export function format(q: Quantity, locale: string, digits = 1): string {
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(q.value);
  return `${n} ${q.unit}`;
}
