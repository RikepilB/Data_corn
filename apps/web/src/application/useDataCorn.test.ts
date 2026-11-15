import { describe, expect, it } from 'vitest';
import type { FieldFormValues } from '../domain/inputs';
import type { PrecomputedReport } from '../infrastructure/precomputed';
import { matchesPrecomputed } from './useDataCorn';

const inputs = {
  season: 2027,
  planting_date: '2027-04-20',
  hybrid_rm_days: 105,
  irrigation: 'none',
  irrigation_capacity_mm_day: null,
  tillage: 'conventional',
  yield_goal_t_ha: null,
  previous_crop: 'maize',
};
const pre = { analyze: { inputs } } as unknown as PrecomputedReport;
const form = { ...inputs, previous_crop: null } as unknown as FieldFormValues;

describe('matchesPrecomputed', () => {
  it('accepts the untouched form, where previous_crop is null and the report recorded the engine choice', () => {
    expect(matchesPrecomputed(form, pre)).toBe(true);
  });

  it('accepts a previous crop equal to the recorded one', () => {
    expect(matchesPrecomputed({ ...form, previous_crop: 'maize' }, pre)).toBe(true);
  });

  it('rejects a different previous crop', () => {
    expect(matchesPrecomputed({ ...form, previous_crop: 'soybean' }, pre)).toBe(false);
  });

  it('rejects any other changed value', () => {
    expect(matchesPrecomputed({ ...form, irrigation: 'pivot' }, pre)).toBe(false);
    expect(matchesPrecomputed({ ...form, planting_date: '2027-05-01' }, pre)).toBe(false);
  });
});
