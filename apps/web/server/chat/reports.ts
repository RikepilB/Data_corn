// SI-assisted (Claude Code); reviewed by <name>
// Where the assistant's numbers come from: the reports computed in advance and shipped as static
// JSON (public/data/reports). The server loads them itself from one fixed origin. The client only
// names a report by id, and the id must be in the shipped index.
import type { FieldReport } from '../../src/domain/report';
import type { PrecomputedReport } from '../../src/infrastructure/precomputed';
import { type ChatIrrigation, REPORT_ID } from './limits';

/** Reads `index` or one report id (already checked against REPORT_ID). Null when it is missing. */
export type FetchReport = (name: string) => Promise<unknown>;

export interface LoadedReport {
  id: string;
  generatedAt: string;
  engineCommit: string | null;
  /** The report on the person's screen. */
  report: FieldReport;
  /** Every report computed in advance for this field: the default first, then the irrigation variants. */
  all: FieldReport[];
}

export type LoadResult =
  | { ok: true; loaded: LoadedReport }
  /** `unknown_report`: not a result computed in advance. `report_unavailable`: the files could not be read. */
  | { ok: false; code: 'unknown_report' | 'report_unavailable' };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isReport(value: unknown): value is FieldReport {
  return isRecord(value) && isRecord(value.summary) && isRecord(value.inputs) && Array.isArray(value.indicators);
}

function isPrecomputed(value: unknown): value is PrecomputedReport {
  return (
    isRecord(value) &&
    typeof value.generated_at === 'string' &&
    isReport(value.analyze) &&
    (value.variants === undefined || (Array.isArray(value.variants) && value.variants.every(isReport)))
  );
}

/** The ids listed in public/data/reports/index.json. */
function allowedIds(index: unknown): string[] {
  if (!isRecord(index) || !Array.isArray(index.fields)) return [];
  return index.fields
    .map((f: unknown) => (isRecord(f) ? f.id : null))
    .filter((id): id is string => typeof id === 'string' && REPORT_ID.test(id));
}

/**
 * The precomputed report for `id` with the given irrigation. Sample data, a field somebody drew,
 * or an irrigation that was not computed in advance is `unknown_report`: there is nothing real to explain.
 */
export async function loadReport(fetchReport: FetchReport, id: string, irrigation: ChatIrrigation): Promise<LoadResult> {
  if (!REPORT_ID.test(id)) return { ok: false, code: 'unknown_report' };
  let index: unknown;
  let file: unknown;
  try {
    index = await fetchReport('index');
    if (!allowedIds(index).includes(id)) {
      return { ok: false, code: index == null ? 'report_unavailable' : 'unknown_report' };
    }
    file = await fetchReport(id);
  } catch {
    return { ok: false, code: 'report_unavailable' };
  }
  if (!isPrecomputed(file)) return { ok: false, code: 'report_unavailable' };
  const all = [file.analyze, ...(file.variants ?? [])];
  const report = all.find((r) => r.inputs.irrigation === irrigation);
  if (!report) return { ok: false, code: 'unknown_report' };
  return {
    ok: true,
    loaded: { id, generatedAt: file.generated_at, engineCommit: file.engine_commit ?? null, report, all },
  };
}

const CACHE_MS = 60_000;

/**
 * Fetches the shipped JSON from `origin` (the site itself). The path is built here from a checked
 * name; nothing the client sends is ever used as a URL. The files are public and static, so a
 * short in-memory cache is safe.
 */
export function createReportFetcher(origin: string, fetcher: typeof fetch = fetch): FetchReport {
  const base = new URL('/data/reports/', origin);
  if (base.protocol !== 'http:' && base.protocol !== 'https:') throw new Error('CHAT_SITE_ORIGIN must be http(s)');
  const cache = new Map<string, { at: number; body: unknown }>();
  return async (name) => {
    if (name !== 'index' && !REPORT_ID.test(name)) throw new Error('invalid report name');
    const hit = cache.get(name);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
    const response = await fetcher(new URL(`${name}.json`, base), { redirect: 'error' });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    cache.set(name, { at: Date.now(), body });
    return body;
  };
}
