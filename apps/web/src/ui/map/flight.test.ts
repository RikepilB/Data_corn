// SI-assisted (Claude Code); reviewed by <name>
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FlightMap, type FlightTarget, arrived, cancelFlight, runFlight } from './flight';

const TARGET: FlightTarget = { center: [-98, 40.88], zoom: 14.5 };
const OPTIONS = { animate: true, durationMs: 4600, graceMs: 2500 };

/** A map that records calls and lets the test decide when `moveend` fires. */
function fakeMap() {
  const listeners = new Set<() => void>();
  const state = { lng: -75, lat: 12, zoom: 1.5 };
  const calls: string[] = [];
  const fire = () => [...listeners].forEach((fn) => fn());
  const map: FlightMap = {
    on: (_type, fn) => listeners.add(fn),
    off: (_type, fn) => listeners.delete(fn),
    stop: () => calls.push('stop'),
    jumpTo: (view) => {
      calls.push('jumpTo');
      Object.assign(state, { lng: view.center[0], lat: view.center[1], zoom: view.zoom });
      fire();
    },
    flyTo: () => calls.push('flyTo'),
    getCenter: () => ({ lng: state.lng, lat: state.lat }),
    getZoom: () => state.zoom,
  };
  const land = () => {
    Object.assign(state, { lng: TARGET.center[0], lat: TARGET.center[1], zoom: TARGET.zoom });
    fire();
  };
  return { map, state, calls, fire, land, listeners };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('arrived', () => {
  it('accepts the target and rejects a camera stopped half way', () => {
    expect(arrived({ lng: -98, lat: 40.88, zoom: 14.5 }, TARGET)).toBe(true);
    expect(arrived({ lng: -98, lat: 40.88, zoom: 9 }, TARGET)).toBe(false);
    expect(arrived({ lng: -97.5, lat: 40.88, zoom: 14.5 }, TARGET)).toBe(false);
  });

  it('compares longitudes around the antimeridian', () => {
    expect(arrived({ lng: 262, lat: 40.88, zoom: 14.5 }, TARGET)).toBe(true);
    expect(arrived({ lng: -180, lat: 0, zoom: 3 }, { center: [180, 0], zoom: 3 })).toBe(true);
  });
});

describe('runFlight', () => {
  it('lands once when the animation ends, and ignores later moves and the timer', async () => {
    const { map, calls, land, fire, listeners } = fakeMap();
    const ended = vi.fn();
    const flight = runFlight(map, TARGET, OPTIONS).then(ended);
    land();
    fire();
    await vi.advanceTimersByTimeAsync(10_000);
    await flight;
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith('landed');
    expect(calls).toEqual(['stop', 'flyTo']);
    expect(listeners.size).toBe(0);
  });

  it('puts the camera on the target when a wheel or a resize cuts the flight short', async () => {
    const { map, state, calls, fire } = fakeMap();
    const flight = runFlight(map, TARGET, OPTIONS);
    Object.assign(state, { lng: -90, lat: 30, zoom: 6 });
    fire();
    expect(await flight).toBe('landed');
    expect(calls).toEqual(['stop', 'flyTo', 'jumpTo']);
    expect(state).toEqual({ lng: -98, lat: 40.88, zoom: 14.5 });
  });

  it('lands by timer when `moveend` never comes (hidden tab, lost WebGL context)', async () => {
    const { map, state } = fakeMap();
    const ended = vi.fn();
    void runFlight(map, TARGET, OPTIONS).then(ended);
    await vi.advanceTimersByTimeAsync(7000);
    expect(ended).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith('landed');
    expect(state.zoom).toBe(14.5);
  });

  it('jumps without animation under reduced motion', async () => {
    const { map, calls } = fakeMap();
    expect(await runFlight(map, TARGET, { ...OPTIONS, animate: false })).toBe('landed');
    expect(calls).toEqual(['stop', 'jumpTo']);
  });

  it('a second flight supersedes the first, which never lands', async () => {
    const { map, land, state } = fakeMap();
    const first = runFlight(map, TARGET, OPTIONS);
    const second = runFlight(map, { center: [-96, 41.25], zoom: 14.5 }, OPTIONS);
    expect(await first).toBe('superseded');
    expect(state.zoom).toBe(1.5);
    land();
    expect(await second).toBe('landed');
    expect(state).toEqual({ lng: -96, lat: 41.25, zoom: 14.5 });
  });

  it('a cancelled flight ends without moving the camera', async () => {
    const { map, calls } = fakeMap();
    const flight = runFlight(map, TARGET, OPTIONS);
    cancelFlight(map);
    cancelFlight(map);
    expect(await flight).toBe('cancelled');
    expect(calls).toEqual(['stop', 'flyTo']);
  });
});
