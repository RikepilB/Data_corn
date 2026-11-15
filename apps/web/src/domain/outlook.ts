// SI-assisted (Claude Code); reviewed by <name>
// Cómo va la campaña en dos números (docs/plan-probabilidad-bateria-naip.md):
// la probabilidad de buena cosecha (C1) y los días de agua antes del estrés (C2).
// Funciones puras sobre las series de `report.runs`: no piden nada nuevo a la API.
import { stressPct, yieldAt } from './film';
import { daysBetween } from './format';
import type { SeasonRun } from './report';

/** Buena cosecha: pérdida por agua < 15 %, el mismo corte del motor para un año con estrés. */
export const GOOD_YIELD = 85;
/** Escalas del parecido entre años: puntos de agua y puntos de rendimiento acumulado. */
const WATER_SCALE = 10;
const YIELD_SCALE = 4;
/** Peso del promedio de todos los años: evita 0 % o 100 % cuando hay pocos años parecidos. */
const PRIOR_WEIGHT = 1;
const WATER_WINDOW = 7;
const MIN_YEARS = 5;

export const finalYield = (run: SeasonRun): number => run.yield_pct?.at(-1) ?? 100 * run.relative_yield;
export const isGood = (run: SeasonRun): boolean => finalYield(run) >= GOOD_YIELD;

/** Agua media de los últimos `WATER_WINDOW` días, para cada día de la serie. */
function trailingWater(run: SeasonRun): number[] {
  const out: number[] = [];
  let sum = 0;
  run.water_pct.forEach((v, i) => {
    sum += v;
    if (i >= WATER_WINDOW) sum -= run.water_pct[i - WATER_WINDOW]!;
    out.push(sum / Math.min(i + 1, WATER_WINDOW));
  });
  return out;
}

/** Día de la película en que termina el llenado de grano (madurez), o null si no se sabe. */
function maturityDay(run: SeasonRun): number | null {
  const fill = run.stages.find((s) => s.stage === 'grain_fill');
  return fill ? daysBetween(run.start, fill.end) : null;
}

/**
 * Probabilidad (0-100) de terminar con buena cosecha, día a día, para el año `run`.
 * Cada uno de los otros años pesa según cuánto se parece ese mismo día (agua de la última semana y
 * rendimiento acumulado); la probabilidad es la parte del peso de los que terminaron bien.
 * Devuelve [] si hay menos de cinco años para comparar.
 */
export function harvestOdds(runs: SeasonRun[], run: SeasonRun): number[] {
  const others = runs.filter((r) => r.year !== run.year && r.water_pct.length > 0);
  if (others.length < MIN_YEARS) return [];
  const base = others.filter(isGood).length / others.length;
  const mine = trailingWater(run);
  const theirs = others.map((r) => ({ water: trailingWater(r), run: r, good: isGood(r) ? 1 : 0 }));
  const done = maturityDay(run);
  const good = isGood(run);

  return run.water_pct.map((_, i) => {
    const yNow = yieldAt(run, i);
    if (yNow != null && yNow < GOOD_YIELD) return 0; // el rendimiento solo baja: ya no puede ser buena
    if (done != null && i >= done) return good ? 100 : 0;
    let weight = 0;
    let hits = 0;
    for (const o of theirs) {
      const j = Math.min(i, o.water.length - 1);
      const dw = (mine[i]! - o.water[j]!) / WATER_SCALE;
      const yThem = yieldAt(o.run, Math.min(i, (o.run.yield_pct?.length ?? 1) - 1));
      const dy = yNow != null && yThem != null ? (yNow - yThem) / YIELD_SCALE : 0;
      const w = Math.exp(-(dw * dw + dy * dy) / 2);
      weight += w;
      hits += w * o.good;
    }
    return (100 * (hits + PRIOR_WEIGHT * base)) / (weight + PRIOR_WEIGHT);
  });
}

/** Tope de la batería: más de 30 días de agua se muestra como «30+». */
export const BATTERY_MAX_DAYS = 30;
const PACE_WINDOW = 10;
const MIN_DRY_DAYS = 3;
const WET_MM = 1;

/**
 * Días que aguanta el lote sin lluvia ni riego antes de entrar en estrés, al ritmo de consumo de los
 * últimos 10 días: (agua − umbral) / caída diaria media en los días secos. Es (RAW − Dr) / ETc en
 * milímetros, porque el agua y el umbral son porcentajes del mismo TAW. 0 en estrés; null mientras
 * no hay días secos suficientes para medir el ritmo.
 */
export function waterDays(run: SeasonRun): (number | null)[] {
  const w = run.water_pct;
  const threshold = stressPct(run);
  const hasRain = (run.rain_mm?.length ?? 0) > 0;
  const wet = (j: number) =>
    hasRain ? (run.rain_mm?.[j] ?? 0) + (run.irrigation_mm?.[j] ?? 0) >= WET_MM : w[j]! > w[j - 1]!;
  let pace: number | null = null;
  return w.map((v, i) => {
    const drops: number[] = [];
    for (let j = Math.max(1, i - PACE_WINDOW + 1); j <= i; j++) {
      if (!wet(j)) drops.push(Math.max(0, w[j - 1]! - w[j]!));
    }
    if (drops.length >= MIN_DRY_DAYS) pace = drops.reduce((a, b) => a + b, 0) / drops.length;
    const margin = v - threshold;
    if (margin <= 0) return 0;
    if (pace == null) return null;
    return pace <= margin / BATTERY_MAX_DAYS ? BATTERY_MAX_DAYS : Math.min(BATTERY_MAX_DAYS, margin / pace);
  });
}

/** Carga de la batería (0-1): el agua por encima del umbral de estrés, de vacía a capacidad de campo. */
export function batteryCharge(run: SeasonRun, i: number): number {
  const threshold = stressPct(run);
  const v = run.water_pct[i] ?? 0;
  return Math.max(0, Math.min(1, (v - threshold) / Math.max(100 - threshold, 1)));
}

export type BatteryLevel = 'good' | 'warn' | 'bad';
export const batteryLevel = (days: number): BatteryLevel => (days >= 10 ? 'good' : days >= 4 ? 'warn' : 'bad');
