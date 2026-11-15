// SI-assisted (Claude Code); reviewed by <name>
// Real engine results computed in advance (apps/api: python -m datacorn.interfaces.cli.precompute)
// and shipped as static JSON. They let the site without an API show real numbers for a few demo
// fields. They are not live: each file records when and with which engine commit it was computed.
import type { DescribeFieldResult, FieldReport } from '../domain/report';

/** The demo field behind the globe's “See an example” button (same polygon as SAMPLE_FIELD). */
export const SAMPLE_FIELD_ID = 'hamilton-ne';

export interface PrecomputedReport {
  id: string;
  generated_at: string;
  engine_commit: string | null;
  season: number;
  describe: DescribeFieldResult;
  /** The report for the untouched form (rainfed: irrigation 'none'). */
  analyze: FieldReport;
  /**
   * The same form with each other irrigation system (pivot, furrow, drip), so switching the
   * irrigation still shows real numbers. Missing in files written before variants existed.
   */
  variants?: FieldReport[];
}

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data/reports`;

function isReport(value: unknown): value is FieldReport {
  const v = value as Partial<FieldReport> | null;
  return !!v && typeof v === 'object' && !!v.summary && !!v.inputs;
}

function isPrecomputed(value: unknown): value is PrecomputedReport {
  const v = value as Partial<PrecomputedReport> | null;
  return (
    !!v &&
    typeof v.generated_at === 'string' &&
    typeof v.season === 'number' &&
    !!v.describe?.context &&
    !!v.describe.defaults &&
    isReport(v.analyze) &&
    (v.variants === undefined || (Array.isArray(v.variants) && v.variants.every(isReport)))
  );
}

/** The precomputed report of a demo field, or null when it is missing or unreadable. */
export async function loadPrecomputed(id: string, fetcher: typeof fetch = fetch): Promise<PrecomputedReport | null> {
  try {
    const response = await fetcher(`${BASE}/${encodeURIComponent(id)}.json`);
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isPrecomputed(body) ? body : null;
  } catch {
    return null;
  }
}
