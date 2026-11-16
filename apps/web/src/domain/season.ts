// Película y franjas (docs/app/arquitectura-y-api.md §B5): qué campaña mostrar, colores y fechas.
import { addDays, daysBetween } from './format';
import type { FieldReport, RiskLevel, SeasonRun, Stage } from './report';

export type FilmMode =
  | { kind: 'typical' }
  | { kind: 'el_nino' }
  | { kind: 'la_nina' }
  | { kind: 'year'; year: number };

function medianRun(runs: SeasonRun[]): SeasonRun | null {
  if (runs.length === 0) return null;
  const sorted = [...runs].sort((a, b) => a.relative_yield - b.relative_yield);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
}

export function pickRun(report: FieldReport, mode: FilmMode): SeasonRun | null {
  const runs = report.runs ?? [];
  if (runs.length === 0) return null;
  switch (mode.kind) {
    case 'year':
      return runs.find((r) => r.year === mode.year) ?? null;
    case 'el_nino':
    case 'la_nina':
      return medianRun(runs.filter((r) => r.enso_phase === mode.kind));
    default:
      return (
        runs.find((r) => r.year === report.typical_year) ?? medianRun(runs) ?? runs[0] ?? null
      );
  }
}

export function hasPhase(report: FieldReport, phase: 'el_nino' | 'la_nina'): boolean {
  return (report.runs ?? []).some((r) => r.enso_phase === phase);
}

export const filmLength = (run: SeasonRun) => run.water_pct.length;

/** Fecha (en la campaña) del día i de la película. */
export const filmDate = (run: SeasonRun, i: number) => addDays(run.start, i);

/** La misma fecha del calendario, pero en el año análogo (para las capas de GIBS). */
export function analogDate(run: SeasonRun, i: number): string {
  const d = filmDate(run, i);
  const md = d.slice(5);
  const safe = md === '02-29' ? '02-28' : md;
  return `${run.year}-${safe}`;
}

export function stageAt(run: SeasonRun, i: number): Stage | 'before' {
  const d = filmDate(run, i);
  let current: Stage | 'before' = 'before';
  for (const s of run.stages) {
    if (s.start <= d) current = s.stage;
  }
  return current;
}

/** Posición (0-1) de una fecha dentro de la película. */
export function positionOf(run: SeasonRun, iso: string): number {
  const n = Math.max(filmLength(run) - 1, 1);
  return Math.min(Math.max(daysBetween(run.start, iso) / n, 0), 1);
}

// --- Colores ---------------------------------------------------------------------------------

type RGB = [number, number, number];
const hex = (c: string): RGB => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB;
const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function ramp(stops: [number, string][], v: number): string {
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  if (v <= first[0]) return first[1];
  if (v >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]!;
    const [b, cb] = stops[i + 1]!;
    if (v >= a && v <= b) {
      const t = (v - a) / (b - a);
      const A = hex(ca);
      const B = hex(cb);
      return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
    }
  }
  return last[1];
}

export const WATER_STOPS: [number, string][] = [
  [0, '#d64545'],
  [50, '#f2b632'],
  [100, '#2f80ed'],
];

/** Agua disponible 0-100 % → rojo, ámbar, azul. */
export const waterColor = (pct: number) => ramp(WATER_STOPS, pct);

/** Rendimiento relativo: 1.0 azul, 0.85 ámbar, ≤ 0.7 rojo. */
export const yieldColor = (rel: number) =>
  ramp(
    [
      [0.7, '#d64545'],
      [0.85, '#f2b632'],
      [1.0, '#2f80ed'],
    ],
    rel,
  );

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#2fa86a',
  medium: '#e0a020',
  high: '#e5484d',
  no_data: '#8a94a6',
};

export const SEVERITY: Record<RiskLevel, number> = { no_data: 0, low: 1, medium: 2, high: 3 };

export function worstRisk(...risks: (RiskLevel | undefined)[]): RiskLevel {
  return risks.reduce<RiskLevel>(
    (worst, r) => (r && SEVERITY[r] > SEVERITY[worst] ? r : worst),
    'no_data',
  );
}
