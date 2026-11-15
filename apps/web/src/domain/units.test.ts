import { describe, expect, it } from 'vitest';
import {
  area,
  cornYield,
  cornYieldToMetric,
  dailyRate,
  dailyRateToMetric,
  depth,
  format,
  temperature,
} from './units';

describe('units (display only, the API stays metric)', () => {
  it('converts depth: 25.4 mm is 1 inch, metric passes through', () => {
    expect(depth(25.4, 'imperial')).toEqual({ value: 1, unit: 'in' });
    expect(depth(254, 'imperial').value).toBeCloseTo(10);
    expect(depth(12, 'metric')).toEqual({ value: 12, unit: 'mm' });
  });

  it('converts area: 1 ha is about 2.471 acres', () => {
    expect(area(1, 'imperial').value).toBeCloseTo(2.4711, 4);
    expect(area(1, 'imperial').unit).toBe('ac');
    expect(area(3, 'metric')).toEqual({ value: 3, unit: 'ha' });
  });

  it('converts temperature: 0 °C is 32 °F and 30 °C is 86 °F', () => {
    expect(temperature(0, 'imperial')).toEqual({ value: 32, unit: '°F' });
    expect(temperature(30, 'imperial').value).toBeCloseTo(86);
    expect(temperature(-40, 'imperial').value).toBeCloseTo(-40);
  });

  it('converts corn yield with 56 lb bushels', () => {
    expect(cornYield(10, 'imperial').value).toBeCloseTo(159.3);
    expect(cornYield(10, 'imperial').unit).toBe('bu/ac');
  });

  it('round-trips form input back to metric', () => {
    expect(dailyRateToMetric(dailyRate(6, 'imperial').value, 'imperial')).toBeCloseTo(6);
    expect(cornYieldToMetric(cornYield(11.2, 'imperial').value, 'imperial')).toBeCloseTo(11.2);
    expect(dailyRateToMetric(6, 'metric')).toBe(6);
  });

  it('formats with the locale decimal separator', () => {
    expect(format({ value: 1.25, unit: 'in' }, 'en-US', 1)).toBe('1.3 in');
    expect(format({ value: 1.25, unit: 'in' }, 'es-PE', 2)).toBe('1.25 in');
    expect(format({ value: 2.5, unit: 'ha' }, 'de-DE')).toBe('2,5 ha');
  });
});
