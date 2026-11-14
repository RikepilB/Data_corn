import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatParams,
  isoDate,
  messageText,
  num,
  parseIsoDate,
  patternText,
} from './format';

const en = { locale: 'en' as const, units: 'imperial' as const };
const esMetric = { locale: 'es' as const, units: 'metric' as const };

describe('dates', () => {
  it('parses an ISO date as a local date, with no time-zone shift', () => {
    const d = parseIsoDate('2026-04-23');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 23]);
    expect(isoDate(d)).toBe('2026-04-23');
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between dates, including across the US DST change', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-05-01', '2026-04-01')).toBe(-30);
  });
});

describe('numbers', () => {
  it('never groups thousands, so years read as 2027', () => {
    expect(num(2027, 'en')).toBe('2027');
    expect(num(1.25, 'en', 1)).toBe('1.3');
  });
});

describe('formatParams', () => {
  it('formats by suffix: _mm, _c and _pct', () => {
    const out = formatParams({ deficit_mm: 50.8, peak_c: 35, delta_yield_pct: 12, share_pct: 0.4 }, en);
    expect(out.deficit_mm).toBe('2 in');
    expect(out.peak_c).toBe('95 °F');
    expect(out.delta_yield_pct).toBe('+12 %');
    expect(out.share_pct).toBe('40 %');
  });

  it('keeps metric units in metric mode', () => {
    expect(formatParams({ deficit_mm: 50.8 }, esMetric).deficit_mm).toBe('51 mm');
  });

  it('shows a negative percentage with a real minus sign', () => {
    expect(formatParams({ delta_yield_pct: -7 }, en).delta_yield_pct).toBe('−7 %');
  });
});

describe('text', () => {
  it('turns the API rotation pattern into localized letters', () => {
    expect(patternText('M S M S', 'en')).toBe('C S C S');
    expect(patternText('M  B', 'en')).toBe('C F');
  });

  it('shows "no data" for an unknown message key instead of the raw key', () => {
    const text = messageText({ key: 'msg.does_not_exist', params: {} }, en);
    expect(text).not.toBe('msg.does_not_exist');
    expect(text.length).toBeGreaterThan(0);
  });

  it('returns an empty string when there is no message', () => {
    expect(messageText(null, en)).toBe('');
  });
});
