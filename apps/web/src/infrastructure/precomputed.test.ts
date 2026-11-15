// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { loadPrecomputed } from './precomputed';

const valid = {
  id: 'hamilton-ne',
  generated_at: '2026-11-15T15:25:02+00:00',
  engine_commit: null,
  season: 2027,
  describe: { context: {}, defaults: {} },
  analyze: { summary: {}, inputs: {} },
};

const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('loadPrecomputed', () => {
  it('returns the report when the file is valid', async () => {
    expect((await loadPrecomputed('hamilton-ne', reply(valid)))?.season).toBe(2027);
  });
  it('returns null when the file is missing', async () => {
    expect(await loadPrecomputed('x', reply(null, false))).toBeNull();
  });
  it('returns null when the file has the wrong shape', async () => {
    expect(await loadPrecomputed('x', reply({ season: 2027 }))).toBeNull();
  });
  it('accepts a file without variants, written before they existed', async () => {
    const pre = await loadPrecomputed('hamilton-ne', reply(valid));
    expect(pre).not.toBeNull();
    expect(pre?.variants).toBeUndefined();
  });
  it('accepts a file with one report per other irrigation', async () => {
    const variants = ['pivot', 'furrow', 'drip'].map((irrigation) => ({ summary: {}, inputs: { irrigation } }));
    expect((await loadPrecomputed('hamilton-ne', reply({ ...valid, variants })))?.variants).toHaveLength(3);
  });
  it('returns null when variants is not an array of reports', async () => {
    for (const variants of [null, {}, 'pivot', [null], [{ summary: {} }], [{ inputs: {} }]]) {
      expect(await loadPrecomputed('x', reply({ ...valid, variants }))).toBeNull();
    }
  });
  it('returns null when the fetch fails', async () => {
    const boom = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await loadPrecomputed('x', boom)).toBeNull();
  });
});
