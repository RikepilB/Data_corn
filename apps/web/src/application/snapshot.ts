// Modo instantánea (?snapshot=1 o PUBLIC_SNAPSHOT=1 al compilar): informes REALES calculados antes
// por el motor (scripts/snapshot_reports.py) para el campo de ejemplo. Sirve para la demo hospedada
// sin API. Solo cubre el campo de ejemplo y las cuatro opciones de riego; el resto pide el motor.
import { ApiError } from '../infrastructure/apiClient';
import { SAMPLE_FIELD } from '../infrastructure/mapStyle';
import type { FieldFormValues, IrrigationSystem } from '../domain/inputs';
import type { DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';
import { ringOf } from '../domain/geo';

interface SnapshotFile {
  generated_at: string;
  season: number;
  describe: DescribeFieldResult;
  reports: Record<IrrigationSystem, FieldReport>;
}

export const isSnapshot = (): boolean =>
  import.meta.env.PUBLIC_SNAPSHOT === '1' ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('snapshot') === '1');

let cache: Promise<SnapshotFile> | null = null;

function load(): Promise<SnapshotFile> {
  cache ??= fetch('/data/snapshots/sample.json').then((r) => {
    if (!r.ok) throw new ApiError(r.status, { detail: 'No se pudo cargar el informe precalculado.' });
    return r.json() as Promise<SnapshotFile>;
  });
  return cache;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EPS = 1e-4;

function isSampleField(geometry: PolygonGeometry): boolean {
  const ring = ringOf(geometry);
  return SAMPLE_FIELD.every(([lon, lat]) =>
    ring.some(([x, y]) => Math.abs(x - lon) < EPS && Math.abs(y - lat) < EPS),
  );
}

function assertSample(geometry: PolygonGeometry): void {
  if (!isSampleField(geometry)) {
    throw new ApiError(503, {
      detail: 'Esta demo sin servidor solo muestra el campo de ejemplo. Para otros campos hace falta el motor.',
    });
  }
}

export async function snapshotDescribe(geometry: PolygonGeometry): Promise<DescribeFieldResult> {
  assertSample(geometry);
  const [file] = await Promise.all([load(), sleep(1800)]);
  return file.describe;
}

export async function snapshotReport(geometry: PolygonGeometry, values: FieldFormValues): Promise<FieldReport> {
  assertSample(geometry);
  const file = await load();
  return file.reports[values.irrigation] ?? file.reports.none;
}

export async function snapshotDate(): Promise<string> {
  return (await load()).generated_at;
}
