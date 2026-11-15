// SI-assisted (Claude Code); reviewed by <name>
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COARSE_ACCURACY_M, failureOf, isCoarse, locate } from './locate';

type Answer = { coords: { longitude: number; latitude: number; accuracy: number } } | { code: number } | 'silent';

/** A geolocation that answers each call in turn and records the options it was given. */
function fakeGeo(answers: Answer[]) {
  const options: (PositionOptions | undefined)[] = [];
  const geo = {
    getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback | null, o?: PositionOptions) {
      options.push(o);
      const answer = answers[options.length - 1] ?? 'silent';
      if (answer === 'silent') return;
      if ('coords' in answer) ok(answer as unknown as GeolocationPosition);
      else fail?.(answer as unknown as GeolocationPositionError);
    },
  };
  return { geo, options };
}

const fix = (accuracy: number) => ({ coords: { longitude: -98, latitude: 40.88, accuracy } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('isCoarse', () => {
  it('accepts a GPS fix and rejects a Wi-Fi or IP one', () => {
    expect(isCoarse(8)).toBe(false);
    expect(isCoarse(COARSE_ACCURACY_M)).toBe(false);
    expect(isCoarse(COARSE_ACCURACY_M + 1)).toBe(true);
    expect(isCoarse(5000)).toBe(true);
  });

  it('treats a missing accuracy as coarse, never as exact', () => {
    expect(isCoarse(undefined)).toBe(true);
    expect(isCoarse(null)).toBe(true);
    expect(isCoarse(Number.NaN)).toBe(true);
  });
});

describe('failureOf', () => {
  it('tells the three browser errors apart', () => {
    expect(failureOf(1)).toBe('denied');
    expect(failureOf(2)).toBe('unavailable');
    expect(failureOf(3)).toBe('timeout');
  });
});

describe('locate', () => {
  it('reports no geolocation at all', async () => {
    expect(await locate(undefined)).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('returns the position as [lon, lat] and flags a coarse one', async () => {
    expect(await locate(fakeGeo([fix(20)]).geo)).toEqual({ ok: true, center: [-98, 40.88], coarse: false });
    expect(await locate(fakeGeo([fix(5000)]).geo)).toEqual({ ok: true, center: [-98, 40.88], coarse: true });
  });

  it('does not retry a denied permission or an unavailable position', async () => {
    const denied = fakeGeo([{ code: 1 }]);
    expect(await locate(denied.geo)).toEqual({ ok: false, reason: 'denied' });
    expect(denied.options).toHaveLength(1);
    const unavailable = fakeGeo([{ code: 2 }]);
    expect(await locate(unavailable.geo)).toEqual({ ok: false, reason: 'unavailable' });
    expect(unavailable.options).toHaveLength(1);
  });

  it('retries a timeout once, without high accuracy', async () => {
    const { geo, options } = fakeGeo([{ code: 3 }, fix(900)]);
    expect(await locate(geo)).toEqual({ ok: true, center: [-98, 40.88], coarse: false });
    expect(options.map((o) => o?.enableHighAccuracy)).toEqual([true, false]);
  });

  it('gives up after the second timeout', async () => {
    const { geo, options } = fakeGeo([{ code: 3 }, { code: 3 }]);
    expect(await locate(geo)).toEqual({ ok: false, reason: 'timeout' });
    expect(options).toHaveLength(2);
  });

  it('rejects a position that is not on Earth', async () => {
    const { geo } = fakeGeo([{ coords: { longitude: Number.NaN, latitude: 40, accuracy: 10 } }]);
    expect(await locate(geo)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('times out by itself when the browser never answers', async () => {
    const result = locate(fakeGeo(['silent']).geo, 30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await result).toEqual({ ok: false, reason: 'timeout' });
  });
});
