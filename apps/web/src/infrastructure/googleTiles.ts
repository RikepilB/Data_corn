// Imagen satelital de Google (Map Tiles API, teselas 2D) para MapLibre. Opcional: solo se usa si
// hay clave en PUBLIC_GOOGLE_MAPS_KEY; si no hay clave o la sesión falla, queda Sentinel-2 (EOX).
// La clave es de navegador: restrínjala por referente HTTP (dominio de la web) en Google Cloud.
import type { Map as MapLibreMap } from 'maplibre-gl';

const KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY;
const API = 'https://tile.googleapis.com';

export const hasGoogleTiles = (): boolean => Boolean(KEY);

async function createSession(language: string): Promise<string | null> {
  try {
    const response = await fetch(`${API}/v1/createSession?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapType: 'satellite', language, region: 'US' }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { session?: string };
    return body.session ?? null;
  } catch {
    return null;
  }
}

/** Créditos que Google exige para la vista actual (endpoint viewport). */
async function viewportCopyright(map: MapLibreMap, session: string): Promise<string | null> {
  const b = map.getBounds();
  const params = new URLSearchParams({
    session,
    key: KEY ?? '',
    zoom: String(Math.round(map.getZoom())),
    north: b.getNorth().toFixed(5),
    south: b.getSouth().toFixed(5),
    east: b.getEast().toFixed(5),
    west: b.getWest().toFixed(5),
  });
  try {
    const response = await fetch(`${API}/tile/v1/viewport?${params}`);
    if (!response.ok) return null;
    return ((await response.json()) as { copyright?: string }).copyright ?? null;
  } catch {
    return null;
  }
}

/**
 * Agrega la capa de Google debajo de las capas propias y oculta la de EOX. Devuelve true si quedó
 * activa. `onCredit` recibe el texto de créditos que hay que mostrar sobre el mapa.
 */
export async function addGoogleSatellite(
  map: MapLibreMap,
  language: string,
  onCredit: (text: string | null) => void,
): Promise<boolean> {
  if (!KEY) return false;
  const session = await createSession(language);
  if (!session) return false;
  map.addSource('google-satellite', {
    type: 'raster',
    tiles: [`${API}/v1/2dtiles/{z}/{x}/{y}?session=${session}&key=${KEY}`],
    tileSize: 256,
    maxzoom: 20,
  });
  map.addLayer(
    {
      id: 'google-satellite',
      type: 'raster',
      source: 'google-satellite',
      minzoom: 5,
      paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 1] },
    },
    map.getLayer('field-fill') ? 'field-fill' : undefined,
  );
  for (const id of ['eox', 'naip']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  const refresh = async () => onCredit(map.getZoom() >= 5 ? await viewportCopyright(map, session) : null);
  map.on('moveend', refresh);
  void refresh();
  return true;
}
