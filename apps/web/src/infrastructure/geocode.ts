// Búsqueda de lugares: coordenadas escritas a mano o Nominatim (OpenStreetMap), poco volumen.
export interface Place {
  label: string;
  lon: number;
  lat: number;
}

const COORDS = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

export function parseCoordinates(text: string): Place | null {
  const m = COORDS.exec(text);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon };
}

export async function searchPlaces(text: string, lang: string): Promise<Place[]> {
  const coords = parseCoordinates(text);
  if (coords) return [coords];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', text);
  url.searchParams.set('limit', '5');
  url.searchParams.set('accept-language', lang);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }));
}
