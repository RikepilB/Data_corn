// SI-assisted (Claude Code); reviewed by <name>
// Colour-blind-safe palette (Okabe-Ito hues) for what is drawn in JS: the water and yield ramp,
// and the risk levels. Keep the three risk hexes in step with --risk-* in styles/tokens.css.
// Colour never stands alone: every use here sits beside a word, an icon, a height or a pattern.
import type { RiskLevel } from '../../domain/report';

export const DRY = '#d55e00'; // vermillion: dry, poor
export const NEUTRAL = '#efeae0';
export const WET = '#0072b2'; // blue: wet, good

type RGB = [number, number, number];
const hex = (c: string): RGB => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function ramp(stops: [number, string][], v: number): string {
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  if (v <= first[0]) return first[1];
  if (v >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]!;
    const [b, cb] = stops[i + 1]!;
    if (v >= a && v <= b) {
      const k = (v - a) / (b - a);
      const A = hex(ca);
      const B = hex(cb);
      return toHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
    }
  }
  return last[1];
}

/** Available water 0-100 %: vermillion (dry), neutral, blue (wet). */
export const waterColor = (pct: number) =>
  ramp(
    [
      [0, DRY],
      [50, NEUTRAL],
      [100, WET],
    ],
    pct,
  );

/** Relative yield: 1.0 blue, 0.85 neutral, 0.7 or less vermillion. */
export const yieldColor = (rel: number) =>
  ramp(
    [
      [0.7, DRY],
      [0.85, NEUTRAL],
      [1.0, WET],
    ],
    rel,
  );

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#0072b2',
  medium: '#e69f00',
  high: '#d55e00',
  no_data: '#767680',
};

/** Text colour that passes AA on each risk hue. */
export const RISK_INK: Record<RiskLevel, string> = {
  low: '#ffffff',
  medium: '#111113',
  high: '#111113',
  no_data: '#ffffff',
};
