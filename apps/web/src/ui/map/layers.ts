import type { Feature, FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, RasterTileSource } from 'maplibre-gl';
import type { LngLat } from '../../domain/geo';
import type { ZonesGeoJSON } from '../../domain/report';
import { ZONE_COLOR } from '../../domain/zones';
import { type ClimateLayer, GIBS_ATTRIBUTION, tileUrl } from '../../infrastructure/gibs';

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
// Blanco y negro: contorno blanco con halo negro, se lee sobre cualquier imagen satelital
const LINE = '#ffffff';
const HALO = '#000000';

/** Fuentes y capas propias: lote, zonas del lote, borrador del dibujo y capa de clima. */
export function installLayers(map: MapLibreMap): void {
  map.addSource('field', { type: 'geojson', data: EMPTY });
  map.addSource('zones', { type: 'geojson', data: EMPTY });
  map.addSource('draft', { type: 'geojson', data: EMPTY });
  map.addLayer({
    id: 'field-fill',
    type: 'fill',
    source: 'field',
    paint: { 'fill-color': LINE, 'fill-opacity': 0.18, 'fill-color-transition': { duration: 120 } },
  });
  // Zonas: encima del relleno del lote y debajo de su contorno. Una clase desconocida no se pinta.
  map.addLayer({
    id: 'zones-fill',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': [
        'match',
        ['get', 'zone'],
        'low',
        ZONE_COLOR.low,
        'medium',
        ZONE_COLOR.medium,
        'high',
        ZONE_COLOR.high,
        'rgba(0, 0, 0, 0)',
      ],
      'fill-opacity': 0.72,
    },
  });
  map.addLayer({
    id: 'zones-line',
    type: 'line',
    source: 'zones',
    paint: { 'line-color': LINE, 'line-width': 0.75, 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: 'field-glow',
    type: 'line',
    source: 'field',
    paint: { 'line-color': HALO, 'line-width': 6, 'line-opacity': 0.55 },
  });
  map.addLayer({
    id: 'field-line',
    type: 'line',
    source: 'field',
    paint: { 'line-color': LINE, 'line-width': 2.5 },
  });
  map.addLayer({
    id: 'draft-fill',
    type: 'fill',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': LINE, 'fill-opacity': 0.15 },
  });
  map.addLayer({
    id: 'draft-line',
    type: 'line',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-dasharray': [2, 1.4] },
  });
  map.addLayer({
    id: 'draft-vertices',
    type: 'circle',
    source: 'draft',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': ['case', ['get', 'first'], 10, 7],
      'circle-color': ['case', ['get', 'first'], HALO, LINE],
      'circle-stroke-color': ['case', ['get', 'first'], LINE, HALO],
      'circle-stroke-width': 2.5,
    },
  });
}

function setData(map: MapLibreMap, id: string, data: FeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

export function setDraft(map: MapLibreMap, points: LngLat[]): void {
  const features: Feature[] = points.map((p, i) => ({
    type: 'Feature',
    properties: { first: i === 0 && points.length >= 3, idx: i },
    geometry: { type: 'Point', coordinates: p },
  }));
  if (points.length >= 2) {
    const line = points.length >= 3 ? [...points, points[0]!] : points;
    features.unshift({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } });
  }
  if (points.length >= 3) {
    features.unshift({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]!]] },
    });
  }
  setData(map, 'draft', { type: 'FeatureCollection', features });
}

export function setField(map: MapLibreMap, ring: LngLat[] | null): void {
  if (!ring || ring.length < 3) {
    setData(map, 'field', EMPTY);
    return;
  }
  setData(map, 'field', {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]!]] },
      },
    ],
  });
}

/** Dibuja las zonas tal como las manda la API; null las quita. */
export function setZones(map: MapLibreMap, zones: ZonesGeoJSON | null): void {
  setData(map, 'zones', zones ?? EMPTY);
}

export function setFieldFill(map: MapLibreMap, color: string | null, opacity = 0.4): void {
  if (!map.getLayer('field-fill')) return;
  map.setPaintProperty('field-fill', 'fill-color', color ?? LINE);
  map.setPaintProperty('field-fill', 'fill-opacity', color ? opacity : 0.18);
}

export interface Overlay {
  /** Identifica la capa: si cambia, se reemplaza; si es la misma, solo cambia la hora. */
  key: string;
  parts: { url: string; maxzoom: number }[];
}

interface OverlayState {
  key: string;
  slot: 0 | 1;
  urls: string[];
  count: number;
  token: number;
  opacity: number;
}

const overlays = new WeakMap<MapLibreMap, OverlayState>();
const slotId = (slot: number, i: number) => `gibs-${slot}-${i}`;
const SWAP_TIMEOUT_MS = 4000;

function removeOverlay(map: MapLibreMap, count: number): void {
  for (const slot of [0, 1]) {
    for (let i = 0; i < count; i++) {
      const id = slotId(slot, i);
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
  }
}

function slotOpacity(map: MapLibreMap, slot: number, count: number, opacity: number): void {
  for (let i = 0; i < count; i++) {
    const id = slotId(slot, i);
    if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', opacity);
  }
}

function addPart(map: MapLibreMap, id: string, url: string, maxzoom: number, opacity: number, first: boolean): void {
  map.addSource(id, {
    type: 'raster',
    tiles: [url],
    tileSize: 256,
    maxzoom,
    attribution: first ? GIBS_ATTRIBUTION : undefined,
  });
  map.addLayer(
    {
      id,
      type: 'raster',
      source: id,
      paint: {
        'raster-opacity': opacity,
        'raster-opacity-transition': { duration: 260, delay: 0 },
        'raster-fade-duration': 0,
      },
    },
    'field-fill',
  );
}

/**
 * Capa de datos de NASA GIBS sobre el mapa (null la quita). Doble búfer: la hora nueva se carga
 * en una copia oculta y se muestra cuando sus teselas llegaron, así la animación no parpadea.
 */
export function setOverlay(map: MapLibreMap, overlay: Overlay | null, opacity = 0.72): void {
  const st = overlays.get(map);
  if (!overlay) {
    if (st) removeOverlay(map, st.count);
    overlays.delete(map);
    return;
  }
  const urls = overlay.parts.map((p) => p.url);
  const count = overlay.parts.length;
  if (!st || st.key !== overlay.key) {
    if (st) removeOverlay(map, st.count);
    overlay.parts.forEach((p, i) => addPart(map, slotId(0, i), p.url, p.maxzoom, opacity, i === 0));
    overlays.set(map, { key: overlay.key, slot: 0, urls, count, token: 0, opacity });
    return;
  }
  st.opacity = opacity;
  if (urls.every((u, i) => u === st.urls[i])) {
    slotOpacity(map, st.slot, count, opacity);
    return;
  }
  st.urls = urls;
  const target = st.slot === 0 ? 1 : 0;
  const token = ++st.token;
  overlay.parts.forEach((p, i) => {
    const id = slotId(target, i);
    const source = map.getSource(id) as RasterTileSource | undefined;
    if (source) {
      map.setPaintProperty(id, 'raster-opacity', 0);
      source.setTiles([p.url]);
    } else {
      addPart(map, id, p.url, p.maxzoom, 0, false);
    }
  });
  const ids = overlay.parts.map((_, i) => slotId(target, i));
  let timer = 0;
  const done = () => {
    map.off('sourcedata', check);
    window.clearTimeout(timer);
  };
  const swap = () => {
    done();
    if (st.token !== token || overlays.get(map) !== st) return;
    slotOpacity(map, target, count, st.opacity);
    slotOpacity(map, 1 - target, count, 0);
    st.slot = target;
  };
  function check() {
    if (st!.token !== token) return done();
    if (ids.every((id) => map.getSource(id) && map.isSourceLoaded(id))) swap();
  }
  map.on('sourcedata', check);
  timer = window.setTimeout(swap, SWAP_TIMEOUT_MS);
}

/**
 * Capa de clima histórica en una fecha; null la quita. En el lote (zoom alto) va más
 * transparente: a esa escala la capa es casi un solo color y no debe tapar la imagen satelital.
 */
export function setClimate(
  map: MapLibreMap,
  layer: ClimateLayer | null,
  time: string | null,
  opacity = 0.72,
): void {
  setOverlay(
    map,
    layer && time ? { key: layer.id, parts: [{ url: tileUrl(layer, time), maxzoom: layer.maxzoom }] } : null,
    opacity,
  );
}
