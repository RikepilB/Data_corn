import { describe, expect, it } from 'vitest';
import type { FieldReport, SeasonRun } from './report';
import { DRY, NEUTRAL, WET, analogDate, pickRun, positionOf, stageAt, waterColor, worstRisk } from './season';

function run(year: number, relative_yield: number, enso_phase: SeasonRun['enso_phase'] = null): SeasonRun {
  return {
    year,
    observed_days: 0,
    enso_phase,
    start: '2026-04-20',
    water_pct: Array.from({ length: 11 }, () => 50),
    tmax_c: Array.from({ length: 11 }, () => 25),
    stages: [
      { stage: 'sowing', start: '2026-04-20', end: '2026-04-22' },
      { stage: 'emergence', start: '2026-04-23', end: '2026-04-30' },
    ],
    flowering_deficit_mm: 0,
    flowering_heat_days: 0,
    relative_yield,
  };
}

const report = (runs: SeasonRun[], typical_year?: number) =>
  ({ runs, typical_year }) as unknown as FieldReport;

describe('pickRun', () => {
  const runs = [run(2012, 0.6, 'la_nina'), run(2015, 0.9, 'el_nino'), run(2018, 1.0, 'el_nino'), run(2020, 0.8)];

  it('uses the typical year when the report names one', () => {
    expect(pickRun(report(runs, 2020), { kind: 'typical' })?.year).toBe(2020);
  });

  it('falls back to the median run by yield', () => {
    expect(pickRun(report(runs), { kind: 'typical' })?.year).toBe(2020);
  });

  it('takes the median of one ENSO phase only', () => {
    expect(pickRun(report(runs), { kind: 'el_nino' })?.year).toBe(2015);
    expect(pickRun(report(runs), { kind: 'la_nina' })?.year).toBe(2012);
  });

  it('returns null for a missing year or an empty report', () => {
    expect(pickRun(report(runs), { kind: 'year', year: 1999 })).toBeNull();
    expect(pickRun(report([]), { kind: 'typical' })).toBeNull();
  });
});

describe('film helpers', () => {
  const r = run(2012, 0.6);

  it('maps a film day to the same calendar day of the analog year', () => {
    expect(analogDate(r, 0)).toBe('2012-04-20');
  });

  it('knows the stage of each day', () => {
    expect(stageAt(r, 0)).toBe('sowing');
    expect(stageAt(r, 5)).toBe('emergence');
  });

  it('clamps a position to 0..1', () => {
    expect(positionOf(r, '2026-04-25')).toBeCloseTo(0.5);
    expect(positionOf(r, '2026-01-01')).toBe(0);
    expect(positionOf(r, '2026-12-31')).toBe(1);
  });
});

describe('colours and risk', () => {
  // The palette lives in season.ts (rust, neutral, blue); the test checks the ramp, not the hex.
  it('ramps water from dry to neutral to wet, and clamps above 100', () => {
    expect(waterColor(0)).toBe(DRY);
    expect(waterColor(50)).toBe(NEUTRAL);
    expect(waterColor(100)).toBe(WET);
    expect(waterColor(150)).toBe(WET);
  });

  it('picks the worst risk and treats missing as no data', () => {
    expect(worstRisk('low', 'high', 'medium')).toBe('high');
    expect(worstRisk(undefined, 'low')).toBe('low');
    expect(worstRisk()).toBe('no_data');
  });
});
