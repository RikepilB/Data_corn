// SI-assisted (Claude Code); reviewed by <name>
// A camera flight that always ends, exactly once. MapLibre's `moveend` is not enough on its own:
// it fires early when a wheel, a drag or a window resize cuts the flight, and never when the tab
// is hidden (no animation frames) or the WebGL context is lost. So the flight also has a timer,
// and whatever ends it first puts the camera on the target before the caller moves on.

export type FlightEnd = 'landed' | 'superseded' | 'cancelled';

export interface FlightTarget {
  center: [number, number];
  zoom: number;
}

interface CameraView extends FlightTarget {
  pitch: number;
  bearing: number;
}

/** The part of a MapLibre map a flight needs; a fake stands in for it in the unit tests. */
export interface FlightMap {
  on(type: 'moveend', listener: () => void): unknown;
  off(type: 'moveend', listener: () => void): unknown;
  stop(): unknown;
  jumpTo(view: CameraView): unknown;
  flyTo(view: CameraView & { duration: number; curve: number; essential: boolean }): unknown;
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
}

export interface FlightOptions {
  /** False with reduced motion: a direct jump. */
  animate: boolean;
  durationMs: number;
  /** Extra wait after the animation should be over, before the timer ends the flight. */
  graceMs?: number;
}

const DEFAULT_GRACE_MS = 2500;
const ZOOM_TOLERANCE = 0.05;
const DEGREE_TOLERANCE = 1e-4;

/** True when the camera sits on the target (longitude compared around the antimeridian). */
export function arrived(at: { lng: number; lat: number; zoom: number }, target: FlightTarget): boolean {
  const dLng = Math.abs(((((at.lng - target.center[0]) % 360) + 540) % 360) - 180);
  return (
    Math.abs(at.zoom - target.zoom) <= ZOOM_TOLERANCE &&
    dLng <= DEGREE_TOLERANCE &&
    Math.abs(at.lat - target.center[1]) <= DEGREE_TOLERANCE
  );
}

// One flight per map: a new one supersedes the one in the air, so its caller does not go on.
const inFlight = new WeakMap<object, (end: FlightEnd) => void>();

/** Ends the flight in the air, if any, without landing: its caller gets 'cancelled'. */
export function cancelFlight(map: object): void {
  inFlight.get(map)?.('cancelled');
}

export function runFlight(map: FlightMap, target: FlightTarget, options: FlightOptions): Promise<FlightEnd> {
  inFlight.get(map)?.('superseded');
  return new Promise((resolve) => {
    const view: CameraView = { center: target.center, zoom: target.zoom, pitch: 0, bearing: 0 };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (end: FlightEnd) => {
      if (inFlight.get(map) !== finish) return;
      inFlight.delete(map);
      map.off('moveend', onMoveEnd);
      clearTimeout(timer);
      // Cut short or never animated: the person asked for this place, so land on it anyway.
      if (end === 'landed' && !arrived({ ...map.getCenter(), zoom: map.getZoom() }, target)) map.jumpTo(view);
      resolve(end);
    };
    const onMoveEnd = () => finish('landed');
    // Stopping first sends the `moveend` of whatever was moving before this flight listens.
    map.stop();
    inFlight.set(map, finish);
    map.on('moveend', onMoveEnd);
    const wait = options.animate ? options.durationMs + (options.graceMs ?? DEFAULT_GRACE_MS) : 0;
    timer = setTimeout(() => finish('landed'), wait);
    if (options.animate) map.flyTo({ ...view, duration: options.durationMs, curve: 1.6, essential: true });
    else map.jumpTo(view);
  });
}
