// SI-assisted (Claude Code); reviewed by <name>
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCoordinates } from './geocode';

describe('parseCoordinates', () => {
  it('reads "lat, lon" with a comma, a semicolon or a space', () => {
    const place = { label: '40.8800, -98.0000', lat: 40.88, lon: -98 };
    expect(parseCoordinates('40.88, -98.0')).toEqual(place);
    expect(parseCoordinates('40.88;-98')).toEqual(place);
    expect(parseCoordinates('  40.88 -98.0  ')).toEqual(place);
    expect(parseCoordinates('+40.88,-98')).toEqual(place);
  });

  it('reads a pair that only fits as "lon lat" the other way round', () => {
    expect(parseCoordinates('-98.0 40.88')).toEqual({ label: '40.8800, -98.0000', lat: 40.88, lon: -98 });
    expect(parseCoordinates('120, 15')).toEqual({ label: '15.0000, 120.0000', lat: 15, lon: 120 });
  });

  it('keeps "lat, lon" when both readings are valid', () => {
    expect(parseCoordinates('-13.5, -72')).toMatchObject({ lat: -13.5, lon: -72 });
    expect(parseCoordinates('-72, -13.5')).toMatchObject({ lat: -72, lon: -13.5 });
  });

  it('reads hemisphere letters in either order, in English and Spanish', () => {
    expect(parseCoordinates('40.88 N, 98.0 W')).toMatchObject({ lat: 40.88, lon: -98 });
    expect(parseCoordinates('98°W 40.88°N')).toMatchObject({ lat: 40.88, lon: -98 });
    expect(parseCoordinates('13.5 S 72 O')).toMatchObject({ lat: -13.5, lon: -72 });
    expect(parseCoordinates('13.5s, 72e')).toMatchObject({ lat: -13.5, lon: 72 });
  });

  it('accepts the limits and rejects what is off the globe', () => {
    expect(parseCoordinates('90, 180')).toMatchObject({ lat: 90, lon: 180 });
    expect(parseCoordinates('-90, -180')).toMatchObject({ lat: -90, lon: -180 });
    expect(parseCoordinates('95, 200')).toBe('out_of_range');
    expect(parseCoordinates('90.01, 100')).toBe('out_of_range');
    expect(parseCoordinates('40, 180.5')).toBe('out_of_range');
    expect(parseCoordinates('95 N, 20 W')).toBe('out_of_range');
  });

  it('leaves names and half-labelled pairs to the place search', () => {
    expect(parseCoordinates('Lincoln, Nebraska')).toBeNull();
    expect(parseCoordinates('40.88')).toBeNull();
    expect(parseCoordinates('40.88, -98, 3')).toBeNull();
    expect(parseCoordinates('40 N, 98')).toBeNull();
    expect(parseCoordinates('40 N, 41 S')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
  });
});

describe('searchPlaces', () => {
  const rows = [{ display_name: 'Lincoln, Nebraska', lat: '40.8', lon: '-96.7' }];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  // The spacing between requests is module state: each test loads a fresh module.
  async function fresh(fetchMock: ReturnType<typeof vi.fn>) {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    return import('./geocode');
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('answers typed coordinates without the network', async () => {
    const fetchMock = vi.fn();
    const { searchPlaces } = await fresh(fetchMock);
    expect(await searchPlaces('40.88, -98.0', 'en')).toEqual([{ label: '40.8800, -98.0000', lat: 40.88, lon: -98 }]);
    expect(await searchPlaces('   ', 'en')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses coordinates off the globe instead of searching them as a name', async () => {
    const fetchMock = vi.fn();
    const { searchPlaces } = await fresh(fetchMock);
    await expect(searchPlaces('95, 200', 'en')).rejects.toMatchObject({ reason: 'out_of_range' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps Nominatim rows and drops the ones without a position', async () => {
    const fetchMock = vi.fn(async (_url: URL) => json([...rows, { display_name: 'Nowhere', lat: 'x', lon: '1' }]));
    const { searchPlaces } = await fresh(fetchMock);
    expect(await searchPlaces(' Lincoln ', 'es')).toEqual([{ label: 'Lincoln, Nebraska', lat: 40.8, lon: -96.7 }]);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Lincoln');
    expect(url.searchParams.get('accept-language')).toBe('es');
  });

  it('returns an empty list for no match, and fails on 429, a network error or a bad body', async () => {
    const empty = await fresh(vi.fn(async () => json([])));
    expect(await empty.searchPlaces('zzqq', 'en')).toEqual([]);

    const limited = await fresh(vi.fn(async () => json('Too Many Requests', 429)));
    await expect(limited.searchPlaces('Lincoln', 'en')).rejects.toMatchObject({ reason: 'failed' });

    const offline = await fresh(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(offline.searchPlaces('Lincoln', 'en')).rejects.toMatchObject({ reason: 'failed' });

    const odd = await fresh(vi.fn(async () => json({ error: 'x' })));
    await expect(odd.searchPlaces('Lincoln', 'en')).rejects.toMatchObject({ reason: 'failed' });
  });

  it('does not ask again for the same text, and retries after a failure', async () => {
    const fetchMock = vi.fn(async () => json(rows));
    const { searchPlaces } = await fresh(fetchMock);
    await searchPlaces('Lincoln', 'en');
    await searchPlaces('lincoln ', 'en');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const flaky = vi.fn().mockResolvedValueOnce(json('busy', 503)).mockResolvedValueOnce(json(rows));
    const again = await fresh(flaky);
    await expect(again.searchPlaces('Lincoln', 'en')).rejects.toMatchObject({ reason: 'failed' });
    const retry = again.searchPlaces('Lincoln', 'en');
    await vi.advanceTimersByTimeAsync(1100);
    expect(await retry).toHaveLength(1);
    expect(flaky).toHaveBeenCalledTimes(2);
  });

  it('keeps at least one second between two requests', async () => {
    const fetchMock = vi.fn(async () => json(rows));
    const { searchPlaces } = await fresh(fetchMock);
    await searchPlaces('Lincoln', 'en');
    const second = searchPlaces('Cusco', 'en');
    await vi.advanceTimersByTimeAsync(900);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
