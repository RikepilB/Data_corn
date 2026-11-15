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

const current = new WeakMap<MapLibreMap, string>();

/**
 * Muestra una capa de GIBS en una fecha; null la oculta. En el lote (zoom alto) va más
 * transparente: a esa escala la capa es casi un solo color y no debe tapar la imagen satelital.
 */
export function setClimate(
  map: MapLibreMap,
  layer: ClimateLayer | null,
  time: string | null,
  opacity = 0.72,
): void {
  if (!layer || !time) {
    if (map.getLayer('climate')) map.setLayoutProperty('climate', 'visibility', 'none');
    return;
  }
  const url = tileUrl(layer, time);
  const source = map.getSource('climate') as RasterTileSource | undefined;
  if (source && current.get(map) === layer.id) {
    source.setTiles([url]);
  } else {
    if (map.getLayer('climate')) map.removeLayer('climate');
    if (map.getSource('climate')) map.removeSource('climate');
    map.addSource('climate', {
      type: 'raster',
      tiles: [url],
      tileSize: 256,
      maxzoom: layer.maxzoom,
      attribution: GIBS_ATTRIBUTION,
    });
    map.addLayer(
      {
        id: 'climate',
        type: 'raster',
        source: 'climate',
        paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 250 },
      },
      'field-fill',
    );
    current.set(map, layer.id);
  }
  map.setPaintProperty('climate', 'raster-opacity', opacity);
  map.setLayoutProperty('climate', 'visibility', 'visible');
}
