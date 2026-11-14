// Los 7 datos del formulario (RF-06). Siempre en unidades métricas; la UI convierte.
import type { Crop, DescribeFieldResult } from './report';

export type IrrigationSystem = 'none' | 'pivot' | 'furrow' | 'drip';
export type Tillage = 'conventional' | 'reduced' | 'no_till';

export const IRRIGATION_SYSTEMS: IrrigationSystem[] = ['none', 'pivot', 'furrow', 'drip'];
export const TILLAGE_OPTIONS: Tillage[] = ['conventional', 'reduced', 'no_till'];
export const HYBRID_RM_RANGE = { min: 80, max: 120, step: 5 } as const;

export interface FieldFormValues {
  season: number;
  planting_date: string; // ISO yyyy-mm-dd
  hybrid_rm_days: number;
  irrigation: IrrigationSystem;
  irrigation_capacity_mm_day: number | null;
  tillage: Tillage;
  yield_goal_t_ha: number | null;
  previous_crop: Crop | null;
}

export function valuesFromDefaults(described: DescribeFieldResult, season: number): FieldFormValues {
  return {
    season,
    planting_date: withYear(described.defaults.planting_date, season),
    hybrid_rm_days: described.defaults.hybrid_rm_days,
    irrigation: 'none',
    irrigation_capacity_mm_day: null,
    tillage: 'conventional',
    yield_goal_t_ha: described.defaults.yield_goal_t_ha,
    previous_crop: null,
  };
}

/** Cambia el año de una fecha ISO (29-feb → 28-feb si hace falta). */
export function withYear(iso: string, year: number): string {
  const md = iso.slice(5, 10);
  return `${year}-${md === '02-29' ? '02-28' : md}`;
}

/** Campaña por defecto en el hemisferio norte: desde julio se planifica la del año siguiente. */
export function defaultSeason(today = new Date()): number {
  return today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
}
