import { describe, expect, it } from 'vitest';
import type { FieldFormValues } from '../domain/inputs';
import type { FieldReport } from '../domain/report';
import type { PrecomputedReport } from '../infrastructure/precomputed';
import { type LngLat, toPolygon } from '../domain/geo';
import {
  type Step,
  backDepth,
  formMatchesReport,
  matchesPrecomputed,
  pickPrecomputed,
  previousStep,
  sameField,
} from './useDataCorn';

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

describe('formMatchesReport', () => {
  const report = { inputs } as unknown as FieldReport;

  it('accepts the untouched form, so → can show the same results again', () => {
    expect(formMatchesReport(form, report)).toBe(true);
  });

  it('rejects a changed form, so → never shows results computed with other inputs', () => {
    expect(formMatchesReport({ ...form, irrigation: 'pivot' }, report)).toBe(false);
  });

  it('rejects a missing form, report or report inputs', () => {
    expect(formMatchesReport(null, report)).toBe(false);
    expect(formMatchesReport(form, null)).toBe(false);
    expect(formMatchesReport(form, {} as unknown as FieldReport)).toBe(false);
  });
});

describe('previousStep', () => {
  it('goes one screen back for a drawn field: results, details, corners, globe', () => {
    const path: Step[] = [];
    for (let s: Step = 'results'; s !== 'globe'; s = previousStep(s, false)) path.push(s);
    expect(path).toEqual(['results', 'form', 'draw']);
  });

  it('skips the drawing for the example, which was never drawn', () => {
    expect(previousStep('results', true)).toBe('form');
    expect(previousStep('form', true)).toBe('globe');
    expect(previousStep('calculating', true)).toBe('globe');
  });

  it('goes back to the corners while a drawn field is being read', () => {
    expect(previousStep('calculating', false)).toBe('draw');
  });
});

describe('backDepth', () => {
  it('counts the Back presses that reach the globe', () => {
    expect(backDepth('globe', false)).toBe(0);
    expect(backDepth('draw', false)).toBe(1);
    expect(backDepth('calculating', false)).toBe(2);
    expect(backDepth('form', false)).toBe(2);
    expect(backDepth('results', false)).toBe(3);
    expect(backDepth('form', true)).toBe(1);
    expect(backDepth('results', true)).toBe(2);
  });
});

describe('sameField', () => {
  const ring: LngLat[] = [
    [-97.5, 41.2],
    [-97.49, 41.2],
    [-97.49, 41.21],
  ];

  it('recognises the corners of the field already read, so closing it again keeps the work', () => {
    expect(sameField(ring, toPolygon(ring))).toBe(true);
  });

  it('rejects a moved, added or removed corner', () => {
    expect(sameField([ring[0]!, ring[1]!, [-97.49, 41.22]], toPolygon(ring))).toBe(false);
    expect(sameField([...ring, [-97.5, 41.21]], toPolygon(ring))).toBe(false);
    expect(sameField(ring.slice(0, 2), toPolygon(ring))).toBe(false);
  });

  it('rejects when no field has been read yet', () => {
    expect(sameField(ring, null)).toBe(false);
  });
});
