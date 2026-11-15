// SI-assisted (Claude Code); reviewed by <name>
// Película de la campaña: qué se dibuja y qué se cuenta (docs/plan-pelicula-y-globo.md §A).
// Funciones puras: reciben las series de la API y devuelven rangos, meses y momentos clave.
import { addDays } from './format';
import type { SeasonRun, Stage } from './report';

/** Si la API no envía el umbral, el de FAO-56 para maíz (p ≈ 0.55 → estrés bajo 45 %). */
export const DEFAULT_STRESS_PCT = 45;
export const HEAT_C = 35;
export const HEAVY_RAIN_MM = 25;
/** Pérdida mínima (puntos de rendimiento) para contar una etapa como momento clave. */
export const MIN_STAGE_LOSS = 2;
const MAX_EVENTS = 5;
const MIN_GAP_DAYS = 10;

export const stressPct = (run: SeasonRun) => run.stress_pct ?? DEFAULT_STRESS_PCT;

/** Rendimiento acumulado (%) del día i, o null si la API no lo envía. */
export const yieldAt = (run: SeasonRun, i: number): number | null => run.yield_pct?.[i] ?? null;

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const pos = q * (sorted.length - 1);
  const a = Math.floor(pos);
  const b = Math.min(a + 1, sorted.length - 1);
  return sorted[a]! + (sorted[b]! - sorted[a]!) * (pos - a);
}

export interface Band {
  lo: number[];
  hi: number[];
}

/**
 * Rango del agua en el suelo de todos los años (percentiles 10-90), día a día desde la siembra.
 * Termina donde quedan menos de 3 años con datos.
 */
export function waterBand(runs: SeasonRun[], length: number, lo = 0.1, hi = 0.9): Band {
  const band: Band = { lo: [], hi: [] };
  for (let i = 0; i < length; i++) {
    const values = runs.map((r) => r.water_pct[i]).filter((v): v is number => v != null);
    if (values.length < 3) break;
    values.sort((a, b) => a - b);
    band.lo.push(quantile(values, lo));
    band.hi.push(quantile(values, hi));
  }
  return band;
}

/** Días de la película que caen el 1 de cada mes (para el eje). */
export function monthTicks(run: SeasonRun): { day: number; iso: string }[] {
  const out: { day: number; iso: string }[] = [];
  for (let i = 0; i < run.water_pct.length; i++) {
    const iso = addDays(run.start, i);
    if (iso.endsWith('-01')) out.push({ day: i, iso });
  }
  return out;
}

export type FilmEventKind = 'stress_start' | 'stage_loss' | 'heat_wave' | 'heavy_rain' | 'irrigation_start';

export interface FilmEvent {
  day: number;
  kind: FilmEventKind;
  stage?: Stage;
  /** Puntos de rendimiento perdidos en la etapa. */
  loss?: number;
  /** Días seguidos (ola de calor). */
  days?: number;
  /** Máxima de la ola de calor (°C). */
  max_c?: number;
  /** Lluvia del día (mm). */
  mm?: number;
}

const PRIORITY: Record<FilmEventKind, number> = {
  stage_loss: 4,
  stress_start: 3,
  heat_wave: 3,
  irrigation_start: 2,
  heavy_rain: 1,
};

function dayOf(run: SeasonRun, iso: string): number {
  const start = new Date(`${run.start}T00:00:00`).getTime();
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - start) / 86_400_000);
}

function stageLoss(run: SeasonRun, stage: Stage): FilmEvent | null {
  const y = run.yield_pct;
  const window = run.stages.find((s) => s.stage === stage);
  if (!y || !window) return null;
  const n = y.length;
  const a = Math.max(0, Math.min(dayOf(run, window.start), n - 1));
  const b = Math.max(0, Math.min(dayOf(run, window.end), n - 1));
  const before = a > 0 ? y[a - 1]! : 100;
  const drop = before - y[b]!;
  if (drop < MIN_STAGE_LOSS) return null;
  // El momento se marca donde la etapa ya perdió la mitad: ahí es donde «duele»
  let day = a;
  while (day < b && before - y[day]! < drop / 2) day++;
  return { day, kind: 'stage_loss', stage, loss: Math.round(drop) };
}

/** Momentos clave de una campaña, en orden: como mucho 5 y separados al menos 10 días. */
export function filmEvents(run: SeasonRun): FilmEvent[] {
  const found: FilmEvent[] = [];
  const n = run.water_pct.length;
  const emergence = run.stages.find((s) => s.stage === 'emergence');
  const from = emergence ? Math.max(1, dayOf(run, emergence.start)) : 1;
  const threshold = stressPct(run);

  for (const stage of ['flowering', 'grain_fill', 'vegetative'] as Stage[]) {
    const e = stageLoss(run, stage);
    if (e) found.push(e);
  }

  for (let i = from; i < n; i++) {
    if (run.water_pct[i]! < threshold && run.water_pct[i - 1]! >= threshold) {
      found.push({ day: i, kind: 'stress_start' });
      break;
    }
  }

  let best: { start: number; len: number; max: number } | null = null;
  for (let i = 0; i < n; ) {
    if (run.tmax_c[i]! < HEAT_C) {
      i++;
      continue;
    }
    let j = i;
    let max = -Infinity;
    while (j < n && run.tmax_c[j]! >= HEAT_C) max = Math.max(max, run.tmax_c[j++]!);
    if (j - i >= 3 && (!best || j - i > best.len)) best = { start: i, len: j - i, max };
    i = j;
  }
  if (best) found.push({ day: best.start, kind: 'heat_wave', days: best.len, max_c: best.max });

  const irrigation = run.irrigation_mm?.findIndex((v) => v > 0) ?? -1;
  if (irrigation >= 0) found.push({ day: irrigation, kind: 'irrigation_start' });

  if (run.rain_mm?.length) {
    let top = -1;
    run.rain_mm.forEach((v, i) => {
      if (v >= HEAVY_RAIN_MM && (top < 0 || v > run.rain_mm![top]!)) top = i;
    });
    if (top >= 0) found.push({ day: top, kind: 'heavy_rain', mm: run.rain_mm[top]! });
  }

  const ranked = [...found].sort(
    (x, y) => PRIORITY[y.kind] - PRIORITY[x.kind] || (y.loss ?? 0) - (x.loss ?? 0) || x.day - y.day,
  );
  const kept: FilmEvent[] = [];
  for (const e of ranked) {
    if (kept.length >= MAX_EVENTS) break;
    if (kept.every((k) => Math.abs(k.day - e.day) >= MIN_GAP_DAYS)) kept.push(e);
  }
  return kept.sort((x, y) => x.day - y.day);
}

/** El momento clave que se muestra en el día i: el último que pasó hace menos de `span` días. */
export function activeEvent(events: FilmEvent[], day: number, span = 18): FilmEvent | null {
  let current: FilmEvent | null = null;
  for (const e of events) if (e.day <= day && day - e.day < span) current = e;
  return current;
}
