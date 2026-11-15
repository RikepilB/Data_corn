// SI-assisted (Claude Code); reviewed by <name>
// "Go to my location": one position from the browser, used only to move the map. It is not
// stored and not sent anywhere.

export type LocateFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout';
/** What the person is told: why there is no position, or that the position is only approximate. */
export type LocateIssue = LocateFailure | 'coarse';

export type LocateResult =
  | { ok: true; center: [number, number]; coarse: boolean }
  | { ok: false; reason: LocateFailure };

/** Desktop browsers locate by Wi-Fi or IP, often kilometres off: beyond this it is not the field. */
export const COARSE_ACCURACY_M = 1000;
/** Zoom for an approximate position: the town and its surroundings, not one field. */
export const COARSE_ZOOM = 11;

const ATTEMPT_TIMEOUT_MS = 12_000;
// Some browsers never answer when the permission prompt is dismissed; the button must come back.
const GIVE_UP_MS = 30_000;
const MAX_AGE_MS = 60_000;

/** A missing or non-numeric accuracy counts as coarse: never pretend it is the field. */
export function isCoarse(accuracyM: number | null | undefined): boolean {
  return typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM > COARSE_ACCURACY_M;
}

/** GeolocationPositionError codes: 1 permission denied, 2 position unavailable, 3 timeout. */
export function failureOf(code: number): LocateFailure {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

type Geo = Pick<Geolocation, 'getCurrentPosition'>;

const browserGeo = (): Geo | undefined =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator ? navigator.geolocation : undefined;

/**
 * Asks once with high accuracy; on a timeout, once more without it (GPS can be slow or absent,
 * the network position usually answers). Always resolves, exactly once.
 */
export function locate(geo: Geo | undefined = browserGeo(), giveUpMs = GIVE_UP_MS): Promise<LocateResult> {
  if (!geo) return Promise.resolve({ ok: false, reason: 'unsupported' });
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: LocateResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(giveUp);
      resolve(result);
    };
    const giveUp = setTimeout(() => settle({ ok: false, reason: 'timeout' }), giveUpMs);
    const ask = (enableHighAccuracy: boolean) =>
      geo.getCurrentPosition(
        ({ coords }) => {
          const { longitude, latitude } = coords;
          const valid =
            Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
          if (valid) settle({ ok: true, center: [longitude, latitude], coarse: isCoarse(coords.accuracy) });
          else settle({ ok: false, reason: 'unavailable' });
        },
        (error) => {
          const reason = failureOf(error.code);
          if (reason === 'timeout' && enableHighAccuracy && !settled) ask(false);
          else settle({ ok: false, reason });
        },
        { enableHighAccuracy, timeout: ATTEMPT_TIMEOUT_MS, maximumAge: MAX_AGE_MS },
      );
    ask(true);
  });
}
