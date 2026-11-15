// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { BATTERY_MAX_DAYS, batteryCharge, batteryLevel, harvestOdds, waterDays } from './outlook';
import type { SeasonRun } from './report';

const N = 60;
const flat = (v: number) => Array.from({ length: N }, () => v);

function run(over: Partial<SeasonRun> = {}): SeasonRun {
  return {
    year: 2000,
    observed_days: 0,
    enso_phase: null,
    start: '2026-04-20',
    water_pct: flat(80),
    tmax_c: flat(25),
    stages: [
      { stage: 'sowing', start: '2026-04-20', end: '2026-04-20' },
      { stage: 'vegetative', start: '2026-04-21', end: '2026-05-19' },
      { stage: 'flowering', start: '2026-05-20', end: '2026-05-31' },
      { stage: 'grain_fill', start: '2026-06-01', end: '2026-06-14' }, // madurez: día 55
    ],
    flowering_deficit_mm: 0,
    flowering_heat_days: 0,
    relative_yield: 1,
    yield_pct: flat(100),
    stress_pct: 45,
    ...over,
  };
}

/** Año seco: el agua cae desde el día 20 y el rendimiento baja hasta 60 %. */
function dry(year: number): SeasonRun {
  const water = Array.from({ length: N }, (_, i) => (i < 20 ? 80 : Math.max(20, 80 - 3 * (i - 20))));
  const yieldPct = Array.from({ length: N }, (_, i) => (i < 30 ? 100 : Math.max(60, 100 - 2 * (i - 30))));
  return run({ year, water_pct: water, yield_pct: yieldPct, relative_yield: 0.6 });
}

const wet = (year: number) => run({ year });
const years = [...[1, 2, 3, 4, 5].map((k) => wet(2000 + k)), ...[1, 2, 3, 4, 5].map((k) => dry(2010 + k))];

describe('harvestOdds', () => {
  it('needs at least five other years', () => {
    expect(harvestOdds(years.slice(0, 5), years[0]!)).toEqual([]);
  });

  it('starts near the share of good years and splits as the years part ways', () => {
    const good = harvestOdds(years, wet(2020));
    const bad = harvestOdds(years, dry(2021));
    expect(good).toHaveLength(N);
    expect(good[0]).toBeGreaterThan(30);
    expect(good[0]).toBeLessThan(70);
    expect(bad[0]).toBeCloseTo(good[0]!, 0);
    expect(good[35]).toBeGreaterThan(85);
    expect(bad[35]).toBeLessThan(15);
  });

  it('is 0 once the year has lost more than 15 % and certain after maturity', () => {
    const bad = harvestOdds(years, dry(2021));
    expect(bad[40]).toBe(0); // rendimiento 80 %
    const good = harvestOdds(years, wet(2020));
    expect(good[55]).toBe(100);
  });

  it('leaves the year itself out', () => {
    const self = years[0]!;
    const withSelf = harvestOdds(years, self);
    const without = harvestOdds(years.filter((r) => r !== self), self);
    expect(withSelf).toEqual(without);
  });
});

describe('waterDays', () => {
  const drying = run({ water_pct: Array.from({ length: N }, (_, i) => Math.max(0, 90 - 2 * i)), rain_mm: flat(0) });

  it('divides the water above the stress line by the daily drop', () => {
    const days = waterDays(drying);
    expect(days[1]).toBeNull(); // todavía no hay tres días secos para medir el ritmo
    expect(days[10]).toBeCloseTo(12.5); // (70 − 45) / 2
    expect(days[23]).toBe(0); // 44 % < 45 %: en estrés
  });

  it('leaves rainy days out of the pace and caps at 30 days', () => {
    const rain = flat(0);
    rain[5] = 30;
    const water = Array.from({ length: N }, (_, i) => (i < 5 ? 90 - i : i === 5 ? 95 : 95 - (i - 5)));
    const days = waterDays(run({ water_pct: water, rain_mm: rain, stress_pct: 85 }));
    expect(days[8]).toBeCloseTo(7); // (92 − 85) / 1; con el día de lluvia el ritmo bajaría a 0,875

    expect(waterDays(run({ water_pct: flat(80), rain_mm: flat(0) }))[10]).toBe(BATTERY_MAX_DAYS);
  });

  it('reads a rise in water as rain when the report has no rain series', () => {
    const water = Array.from({ length: N }, (_, i) => (i < 6 ? 80 - i : 90 - (i - 6)));
    const days = waterDays(run({ water_pct: water, rain_mm: undefined }));
    expect(days[9]).not.toBeNull();
  });
});

describe('battery', () => {
  it('is empty at the stress line and full at field capacity', () => {
    const r = run({ water_pct: [45, 100, 72.5] });
    expect(batteryCharge(r, 0)).toBe(0);
    expect(batteryCharge(r, 1)).toBe(1);
    expect(batteryCharge(r, 2)).toBeCloseTo(0.5);
  });

  it('turns amber under ten days and red under four', () => {
    expect(batteryLevel(12)).toBe('good');
    expect(batteryLevel(6)).toBe('warn');
    expect(batteryLevel(2)).toBe('bad');
  });
});
