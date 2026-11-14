// Geometría del lote en el navegador. Misma proyección que la API (domain/geometry.py):
// sinusoidal local, equivalente en área, así el área que ve el usuario es la misma que valida la API.
import type { PolygonGeometry } from './report';

export type LngLat = [number, number];

const R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export const LIMITS = { minHa: 1, maxHa: 2000, maxVertices: 500 } as const;

function project(points: LngLat[]): [number, number][] {
  const lon0 = points.reduce((s, p) => s + p[0], 0) / points.length;
  return points.map(([lon, lat]) => [R * rad(lon - lon0) * Math.cos(rad(lat)), R * rad(lat)]);
}

function signedArea(xy: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x0, y0] = xy[i]!;
    const [x1, y1] = xy[(i + 1) % xy.length]!;
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/** Área en hectáreas de un anillo abierto (sin repetir el primer punto). */
export function areaHa(points: LngLat[]): number {
  if (points.length < 3) return 0;
  return Math.abs(signedArea(project(points))) / 10_000;
}

export function centroid(points: LngLat[]): LngLat {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

function orient(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(
  p1: [number, number],
  p2: [number, number],
  q1: [number, number],
  q2: [number, number],
): boolean {
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}

/** True si ningún lado se cruza con otro no contiguo. */
export function isSimple(points: LngLat[]): boolean {
  const xy = project(points);
  const n = xy.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if ((i + 1) % n === j || (j + 1) % n === i) continue;
      if (segmentsCross(xy[i]!, xy[(i + 1) % n]!, xy[j]!, xy[(j + 1) % n]!)) return false;
    }
  }
  return true;
}

export type FieldCheck = 'ok' | 'too_few' | 'too_many' | 'self_intersection' | 'too_small' | 'too_large';

export function checkField(points: LngLat[]): { status: FieldCheck; areaHa: number } {
  const area = areaHa(points);
  if (points.length < 3) return { status: 'too_few', areaHa: area };
  if (points.length > LIMITS.maxVertices) return { status: 'too_many', areaHa: area };
  if (!isSimple(points)) return { status: 'self_intersection', areaHa: area };
  if (area < LIMITS.minHa) return { status: 'too_small', areaHa: area };
  if (area > LIMITS.maxHa) return { status: 'too_large', areaHa: area };
  return { status: 'ok', areaHa: area };
}

export function toPolygon(points: LngLat[]): PolygonGeometry {
  const ring = points.map((p) => [round6(p[0]), round6(p[1])]);
  const first = ring[0];
  if (first) ring.push([first[0]!, first[1]!]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function ringOf(geometry: PolygonGeometry): LngLat[] {
  const ring = (geometry.coordinates[0] ?? []).map((p) => [p[0]!, p[1]!] as LngLat);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && ring.length > 1 && first[0] === last[0] && first[1] === last[1]) ring.pop();
  return ring;
}

export function bounds(points: LngLat[]): [[number, number], [number, number]] {
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
