// Búsqueda de lugares: coordenadas escritas a mano o Nominatim (OpenStreetMap), poco volumen.
export interface Place {
  label: string;
  lon: number;
  lat: number;
}

// La licencia ODbL y la política de uso de Nominatim piden mostrar este crédito con los resultados.
export const NOMINATIM_ATTRIBUTION = '© OpenStreetMap contributors';
export const NOMINATIM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/** Why a search has no answer to show: typed coordinates off the globe, or the service did not answer. */
export type SearchFailure = 'out_of_range' | 'failed';
export class SearchError extends Error {
  constructor(readonly reason: SearchFailure) {
    super(`place search: ${reason}`);
  }
}

// Two numbers, each with an optional degree sign and hemisphere letter (O = oeste).
const NUMBER = String.raw`([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEWO])?`;
const COORDS = new RegExp(String.raw`^\s*${NUMBER}\s*[,;\s]\s*${NUMBER}\s*$`, 'i');

const onEarth = (lat: number, lon: number) => Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/**
 * Reads "lat, lon" (also "lat lon", "lat; lon", "40.88 N, 98 W"). A pair that only makes sense
 * as "lon lat" is read that way. Returns null when the text is not a pair of numbers, and
 * 'out_of_range' when it is one but no reading is a place on Earth.
 */
export function parseCoordinates(text: string): Place | 'out_of_range' | null {
  const m = COORDS.exec(text);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[3]);
  const ha = m[2]?.toUpperCase();
  const hb = m[4]?.toUpperCase();
  let lat = a;
  let lon = b;
  if (ha || hb) {
    const aIsLat = ha === 'N' || ha === 'S';
    const bIsLat = hb === 'N' || hb === 'S';
    // Letters must name one latitude and one longitude, on unsigned numbers; otherwise it is a name.
    if (!ha || !hb || aIsLat === bIsLat || a < 0 || b < 0) return null;
    const signed = (value: number, h: string) => (h === 'S' || h === 'W' || h === 'O' ? -value : value);
    lat = aIsLat ? signed(a, ha) : signed(b, hb);
    lon = aIsLat ? signed(b, hb) : signed(a, ha);
  } else if (!onEarth(a, b) && onEarth(b, a)) {
    lat = b;
    lon = a;
  }
  if (!onEarth(lat, lon)) return 'out_of_range';
  return { label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon };
}

// Nominatim's usage policy: at most one request per second, no autocomplete, and no repeated
// identical queries. Searches start only on submit; this spaces them and keeps the last answer.
const MIN_GAP_MS = 1100;
const REQUEST_TIMEOUT_MS = 12_000;
let lastRequestAt = Number.NEGATIVE_INFINITY;
let lastAnswer: { key: string; places: Place[] } | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Places for a typed name or coordinates. Throws SearchError; an empty list means no match. */
export async function searchPlaces(text: string, lang: string): Promise<Place[]> {
  const coords = parseCoordinates(text);
  if (coords === 'out_of_range') throw new SearchError('out_of_range');
  if (coords) return [coords];
  const q = text.trim();
  if (!q) return [];
  const key = `${lang}|${q.toLowerCase()}`;
  if (lastAnswer?.key === key) return lastAnswer.places;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');
  url.searchParams.set('accept-language', lang);
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  lastRequestAt = Date.now() + Math.max(wait, 0);
  if (wait > 0) await sleep(wait);

  let rows: unknown;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = await res.json();
  } catch (cause) {
    // Offline, blocked, too slow, 429 or a body that is not JSON: the person is told to try again.
    console.warn('place search failed', cause);
    throw new SearchError('failed');
  }
  if (!Array.isArray(rows)) throw new SearchError('failed');
  const places = (rows as { display_name?: unknown; lat?: unknown; lon?: unknown }[])
    .map((r) => ({ label: String(r.display_name ?? ''), lat: Number(r.lat), lon: Number(r.lon) }))
    .filter((p) => p.label !== '' && Number.isFinite(p.lat) && Number.isFinite(p.lon) && onEarth(p.lat, p.lon));
  lastAnswer = { key, places };
  return places;
}
