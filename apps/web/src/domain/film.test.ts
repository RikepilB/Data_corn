// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { activeEvent, filmEvents, monthTicks, waterBand } from './film';
import type { SeasonRun } from './report';

const N = 60;

function run(over: Partial<SeasonRun> = {}): SeasonRun {
  return {
    year: 2012,
    observed_days: 0,
    enso_phase: null,
    start: '2026-04-20',
    water_pct: Array.from({ length: N }, () => 80),
    tmax_c: Array.from({ length: N }, () => 25),
    stages: [
      { stage: 'sowing', start: '2026-04-20', end: '2026-04-20' },
      { stage: 'emergence', start: '2026-04-25', end: '2026-04-25' },
      { stage: 'vegetative', start: '2026-04-26', end: '2026-05-19' },
      { stage: 'flowering', start: '2026-05-20', end: '2026-05-31' },
      { stage: 'grain_fill', start: '2026-06-01', end: '2026-06-18' },
    ],
    flowering_deficit_mm: 0,
    flowering_heat_days: 0,
    relative_yield: 1,
    stress_pct: 45,
    ...over,
  };
}

describe('waterBand', () => {
  it('gives the 10th and 90th percentile per day', () => {
    const runs = [10, 20, 30, 40, 50].map((v) => run({ water_pct: Array.from({ length: N }, () => v) }));
    const band = waterBand(runs, N);
    expect(band.lo).toHaveLength(N);
    expect(band.lo[0]).toBeCloseTo(14);
    expect(band.hi[0]).toBeCloseTo(46);
  });

  it('stops where fewer than three years have data', () => {
    const short = run({ water_pct: Array.from({ length: 10 }, () => 50) });
    const band = waterBand([run(), run(), short], N);
    expect(band.lo).toHaveLength(10);
  });
});

describe('monthTicks', () => {
  it('marks the first day of each month', () => {
    expect(monthTicks(run()).map((t) => t.iso)).toEqual(['2026-05-01', '2026-06-01']);
  });
});

describe('filmEvents', () => {
  it('finds nothing in a quiet season', () => {
    expect(filmEvents(run())).toEqual([]);
  });

  it('marks the stress start, the flowering loss, a heat wave and heavy rain', () => {
    const water = Array.from({ length: N }, (_, i) => (i < 30 ? 80 : 30));
    const tmax = Array.from({ length: N }, (_, i) => (i >= 33 && i < 37 ? 37 : 25));
    const rain = Array.from({ length: N }, (_, i) => (i === 10 ? 40 : 0));
    // Rendimiento: pierde 9 puntos en la floración (días 30-41)
    const yieldPct = Array.from({ length: N }, (_, i) => (i < 30 ? 100 : i <= 41 ? 100 - (i - 29) * 0.75 : 91));
    const events = filmEvents(run({ water_pct: water, tmax_c: tmax, rain_mm: rain, yield_pct: yieldPct }));
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain('stage_loss');
    expect(kinds).toContain('heavy_rain');
    expect(events.find((e) => e.kind === 'stage_loss')).toMatchObject({ stage: 'flowering', loss: 9 });
    // El inicio del estrés y el calor caen a menos de una semana de la pérdida: queda la pérdida
    expect(events.every((e, i) => i === 0 || e.day - events[i - 1]!.day >= 10)).toBe(true);
    expect(events.map((e) => e.day)).toEqual([...events.map((e) => e.day)].sort((a, b) => a - b));
  });

  it('marks the first irrigation day', () => {
    const irrigation = Array.from({ length: N }, (_, i) => (i === 20 ? 25 : 0));
    expect(filmEvents(run({ irrigation_mm: irrigation }))).toEqual([{ day: 20, kind: 'irrigation_start' }]);
  });
});

describe('activeEvent', () => {
  const events = [
    { day: 10, kind: 'heavy_rain' as const },
    { day: 30, kind: 'stress_start' as const },
  ];
  it('shows the last event for a while after it happens', () => {
    expect(activeEvent(events, 5)).toBeNull();
    expect(activeEvent(events, 12)?.day).toBe(10);
    expect(activeEvent(events, 29)).toBeNull();
    expect(activeEvent(events, 31)?.day).toBe(30);
  });
});
