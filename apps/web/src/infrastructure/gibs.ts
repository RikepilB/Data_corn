// Capas de clima de NASA GIBS (sin clave). Disponibilidad tomada de WMTSCapabilities
// (epsg3857/best) el 2026-11-14.
import { isoDate, parseIsoDate } from '../domain/format';

export type ClimateLayerId = 'soil_moisture' | 'rain' | 'heat' | 'vegetation';

export interface ClimateLayer {
  id: ClimateLayerId;
  gibs: string;
  tms: string;
  maxzoom: number;
  ext: 'png' | 'jpeg';
  cadence: 'daily' | 'monthly';
  ranges: [string, string][];
  /** Colores de la leyenda (de los colormaps de GIBS), de bajo a alto. */
  stops: string[];
}

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

export const CLIMATE_LAYERS: Record<ClimateLayerId, ClimateLayer> = {
  soil_moisture: {
    id: 'soil_moisture',
    gibs: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    tms: 'GoogleMapsCompatible_Level6',
    maxzoom: 6,
    ext: 'png',
    cadence: 'daily',
    ranges: [
      ['2015-03-31', '2025-07-06'],
      ['2025-07-08', '2025-07-09'],
      ['2025-07-11', '2025-07-20'],
      ['2025-07-22', '2025-08-03'],
      ['2025-08-05', '2025-08-22'],
      ['2025-08-24', '2025-08-25'],
      ['2025-08-27', '2025-09-04'],
      ['2025-09-06', '2025-09-30'],
      ['2025-10-02', '2025-10-09'],
      ['2025-12-12', '2026-03-16'],
      ['2026-03-18', '2026-05-10'],
      ['2026-05-12', '2026-05-16'],
      ['2026-05-19', '2026-08-09'],
      ['2026-08-16', '2026-08-30'],
      ['2026-09-01', '2026-11-06'],
      ['2026-11-08', '2026-11-10'],
    ],
    stops: ['#ffa200', '#fff800', '#47a300', '#00ca95', '#009aff', '#0000db', '#080864'],
  },
  rain: {
    id: 'rain',
    gibs: 'IMERG_Precipitation_Rate',
    tms: 'GoogleMapsCompatible_Level6',
    maxzoom: 6,
    ext: 'png',
    cadence: 'daily',
    ranges: [
      ['2000-06-01', '2025-10-22'],
      ['2025-10-30', '2026-01-07'],
      ['2026-01-09', '2026-02-02'],
      ['2026-02-04', '2026-02-09'],
      ['2026-02-12', '2026-05-24'],
      ['2026-05-27', '2026-11-13'],
    ],
    stops: ['#00764e', '#68cb00', '#ffd400', '#ff5f25', '#900000'],
  },
  heat: {
    id: 'heat',
    gibs: 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day',
    tms: 'GoogleMapsCompatible_Level6',
    maxzoom: 6,
    ext: 'png',
    cadence: 'monthly',
    ranges: [['2000-03-01', '2026-10-01']],
    stops: ['#c900ff', '#3900ff', '#0075ff', '#24ffab', '#a4ff00', '#ffdc00', '#ff6d00', '#ff0100'],
  },
  vegetation: {
    id: 'vegetation',
    gibs: 'MODIS_Terra_L3_NDVI_Monthly',
    tms: 'GoogleMapsCompatible_Level7',
    maxzoom: 7,
    ext: 'png',
    cadence: 'monthly',
    ranges: [
      ['2000-03-01', '2025-03-01'],
      ['2025-05-01', '2026-10-01'],
    ],
    stops: ['#f1ecec', '#ddc9bc', '#b19883', '#bfde77', '#78ad01', '#3e8a01', '#086701', '#001801'],
  },
};

export const LAYER_ORDER: ClimateLayerId[] = ['soil_moisture', 'rain', 'heat', 'vegetation'];

export function tileUrl(layer: Pick<ClimateLayer, 'gibs' | 'tms' | 'ext'>, time: string): string {
  return `${GIBS}/${layer.gibs}/default/${time}/${layer.tms}/{z}/{y}/{x}.${layer.ext}`;
}

// --- Capas en vivo del globo («Hoy en el mundo», docs/plan-pelicula-y-globo.md §B) -------------

export type LiveLayerId = 'clouds' | 'rain_now' | 'sea_temp';
export type LayerId = ClimateLayerId | LiveLayerId;

interface GibsPart {
  gibs: string;
  tms: string;
  maxzoom: number;
  ext: 'png' | 'jpeg';
}

export interface LiveLayer {
  id: LiveLayerId;
  /** Capas GIBS que se dibujan juntas (de abajo hacia arriba), todas con la misma hora. */
  parts: GibsPart[];
  /** Cuadros de la animación: cada `stepMinutes` hacia atrás desde el último, o mensuales. */
  frames: { count: number; stepMinutes: number } | { count: number; monthly: true };
  /** Retraso típico si no se puede leer la hora real (minutos). */
  fallbackLagMinutes: number;
  stops?: string[];
}

const GOES_WEST: GibsPart = { gibs: 'GOES-West_ABI_GeoColor', tms: 'GoogleMapsCompatible_Level7', maxzoom: 7, ext: 'png' };
const GOES_EAST: GibsPart = { gibs: 'GOES-East_ABI_GeoColor', tms: 'GoogleMapsCompatible_Level7', maxzoom: 7, ext: 'png' };

export const LIVE_LAYERS: Record<LiveLayerId, LiveLayer> = {
  clouds: {
    id: 'clouds',
    parts: [GOES_WEST, GOES_EAST],
    frames: { count: 25, stepMinutes: 30 },
    fallbackLagMinutes: 60,
  },
  rain_now: {
    id: 'rain_now',
    parts: [{ gibs: 'IMERG_Precipitation_Rate_30min', tms: 'GoogleMapsCompatible_Level6', maxzoom: 6, ext: 'png' }],
    frames: { count: 25, stepMinutes: 30 },
    fallbackLagMinutes: 8 * 60,
    stops: ['#00764e', '#68cb00', '#ffd400', '#ff5f25', '#900000'],
  },
  sea_temp: {
    id: 'sea_temp',
    parts: [
      {
        gibs: 'GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies',
        tms: 'GoogleMapsCompatible_Level7',
        maxzoom: 7,
        ext: 'png',
      },
    ],
    frames: { count: 13, monthly: true },
    fallbackLagMinutes: 2 * 24 * 60,
    // Colormap GHRSST_Sea_Surface_Temperature_Anomalies de GIBS: −3 °C … 0 … +3 °C
    stops: ['#6b00db', '#00e3ff', '#97ff8b', '#c2cab8', '#ffde43', '#ff7100', '#e60067', '#800000'],
  },
};

export const GLOBE_LAYERS: LayerId[] = ['clouds', 'rain_now', 'sea_temp', 'soil_moisture', 'heat', 'vegetation'];
export const isLive = (id: string | null): id is LiveLayerId => id != null && id in LIVE_LAYERS;

/** URL de cada parte de una capa en vivo para un cuadro (GIBS ajusta la hora a la imagen más cercana). */
export const liveUrls = (layer: LiveLayer, time: string): string[] => layer.parts.map((p) => tileUrl(p, time));

const latestCache = new Map<LiveLayerId, Promise<string>>();

/**
 * Hora de la imagen más reciente: GIBS responde `Layer-Time-Actual` al pedir `default`.
 * Si falla, se estima con el retraso típico de la capa.
 */
export function latestTime(layer: LiveLayer): Promise<string> {
  const cached = latestCache.get(layer.id);
  if (cached) return cached;
  const part = layer.parts[layer.parts.length - 1]!;
  const probe = fetch(`${GIBS}/${part.gibs}/default/default/${part.tms}/0/0/0.${part.ext}`)
    .then((r) => r.headers.get('layer-time-actual'))
    .catch(() => null)
    .then((actual) => {
      if (actual) return actual.replace(/\.\d+Z$/, 'Z');
      const d = new Date(Date.now() - layer.fallbackLagMinutes * 60_000);
      d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 30) * 30, 0, 0);
      return d.toISOString().replace(/\.\d+Z$/, 'Z');
    });
  latestCache.set(layer.id, probe);
  return probe;
}

/** Cuadros de la animación, del más antiguo al más reciente. */
export function liveFrames(layer: LiveLayer, latest: string): string[] {
  const end = new Date(latest);
  const out: string[] = [];
  if ('monthly' in layer.frames) {
    for (let k = layer.frames.count - 1; k >= 1; k--) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - k, 15));
      out.push(d.toISOString().slice(0, 10));
    }
    out.push(latest.slice(0, 10));
    return out;
  }
  for (let k = layer.frames.count - 1; k >= 0; k--) {
    const d = new Date(end.getTime() - k * layer.frames.stepMinutes * 60_000);
    out.push(d.toISOString().replace(/\.\d+Z$/, 'Z'));
  }
  return out;
}

// Variante con relieve y océanos azules: la NextGeneration tiene los océanos casi negros
export const BLUE_MARBLE_TILES = `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`;
export const EOX_TILES =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
export const EOX_ATTRIBUTION =
  'EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)';
// Foto aérea de 1 m (NAIP del USDA) de The National Map del USGS: sin clave y con CORS abierto.
// Solo cubre EE. UU.: fuera de su borde, desde el zoom 13 responde 404 o teselas transparentes.
export const NAIP_TILES =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
export const NAIP_ATTRIBUTION = 'USGS The National Map: Orthoimagery (USDA NAIP)';
/** EE. UU. continental (oeste, sur, este, norte): fuera de aquí no se piden teselas NAIP. */
export const NAIP_BOUNDS: [number, number, number, number] = [-125, 24.4, -66.9, 49.4];
export const GIBS_ATTRIBUTION = 'NASA GIBS · Blue Marble, SMAP, GPM IMERG, MODIS, GOES (NOAA), GHRSST MUR';

const DAY = 86_400_000;
const ms = (iso: string) => parseIsoDate(iso).getTime();

/** Fecha disponible más cercana (hasta ±45 días), o null si no hay datos para esa época. */
export function nearestAvailable(layer: ClimateLayer, iso: string): string | null {
  const target = layer.cadence === 'monthly' ? `${iso.slice(0, 7)}-01` : iso;
  const tms = ms(target);
  let best: { iso: string; dist: number } | null = null;
  for (const [a, b] of layer.ranges) {
    if (target >= a && target <= b) return target;
    for (const edge of [a, b]) {
      const dist = Math.abs(ms(edge) - tms);
      if (!best || dist < best.dist) best = { iso: edge, dist };
    }
  }
  return best && best.dist <= 45 * DAY ? best.iso : null;
}

export function latest(layer: ClimateLayer): string {
  return layer.ranges[layer.ranges.length - 1]![1];
}

/** Los últimos `count` meses con datos de la capa (para el deslizador del globo). */
export function recentMonths(layer: ClimateLayer, count = 24): string[] {
  const last = parseIsoDate(latest(layer));
  const out: string[] = [];
  for (let k = count - 1; k >= 0; k--) {
    const d = new Date(last.getFullYear(), last.getMonth() - k, layer.cadence === 'monthly' ? 1 : 15);
    let iso = isoDate(d);
    if (k === 0) iso = latest(layer);
    const ok = nearestAvailable(layer, iso);
    if (ok && !out.includes(ok)) out.push(ok);
  }
  return out;
}
