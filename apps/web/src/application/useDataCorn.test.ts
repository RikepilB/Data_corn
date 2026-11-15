import { describe, expect, it } from 'vitest';
import type { FieldFormValues } from '../domain/inputs';
import type { PrecomputedReport } from '../infrastructure/precomputed';
import { matchesPrecomputed, pickPrecomputed } from './useDataCorn';

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

describe('pickPrecomputed', () => {
  const variants = ['pivot', 'furrow', 'drip'].map((irrigation) => ({ inputs: { ...inputs, irrigation } }));
  const withVariants = { analyze: { inputs }, variants } as unknown as PrecomputedReport;

  it('returns the default report for the untouched form', () => {
    expect(pickPrecomputed(form, withVariants)).toBe(withVariants.analyze);
  });

  it('picks the variant computed with the chosen irrigation', () => {
    expect(pickPrecomputed({ ...form, irrigation: 'pivot' }, withVariants)).toBe(variants[0]);
    expect(pickPrecomputed({ ...form, irrigation: 'drip' }, withVariants)).toBe(variants[2]);
  });

  it('returns null when another value changed too', () => {
    expect(pickPrecomputed({ ...form, irrigation: 'pivot', planting_date: '2027-05-01' }, withVariants)).toBeNull();
    expect(pickPrecomputed({ ...form, irrigation: 'pivot', irrigation_capacity_mm_day: 8 }, withVariants)).toBeNull();
  });

  it('still works with a file written without variants', () => {
    expect(pickPrecomputed(form, pre)).toBe(pre.analyze);
    expect(pickPrecomputed({ ...form, irrigation: 'pivot' }, pre)).toBeNull();
  });
});
