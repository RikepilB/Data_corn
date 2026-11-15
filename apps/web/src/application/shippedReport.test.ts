// SI-assisted (Claude Code); reviewed by <name>
// The example field's shipped report (public/data/reports/hamilton-ne.json): without an API,
// every irrigation option in the form must still find a real report computed in advance.
import { describe, expect, it } from 'vitest';
import shipped from '../../public/data/reports/hamilton-ne.json';
import { IRRIGATION_SYSTEMS, valuesFromDefaults } from '../domain/inputs';
import { type PrecomputedReport, loadPrecomputed } from '../infrastructure/precomputed';
import { pickPrecomputed } from './useDataCorn';

const pre = shipped as unknown as PrecomputedReport;
const untouched = valuesFromDefaults(pre.describe, pre.season);

describe('the shipped example report', () => {
  it('passes the loader check', async () => {
    const fetcher = (async () => ({ ok: true, json: async () => shipped })) as unknown as typeof fetch;
    expect(await loadPrecomputed('hamilton-ne', fetcher)).not.toBeNull();
  });

  it('answers the untouched form with the default report', () => {
    expect(pickPrecomputed(untouched, pre)).toBe(pre.analyze);
  });

  it.each(IRRIGATION_SYSTEMS)('has a real report for irrigation %s', (irrigation) => {
    expect(pickPrecomputed({ ...untouched, irrigation }, pre)?.inputs.irrigation).toBe(irrigation);
  });
});
