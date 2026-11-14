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

export function tileUrl(layer: ClimateLayer, time: string): string {
  return `${GIBS}/${layer.gibs}/default/${time}/${layer.tms}/{z}/{y}/{x}.${layer.ext}`;
}

export const BLUE_MARBLE_TILES = `${GIBS}/BlueMarble_NextGeneration/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`;
export const EOX_TILES =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
export const EOX_ATTRIBUTION =
  'Sentinel-2 cloudless 2024 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)';
export const GIBS_ATTRIBUTION = 'NASA GIBS · Blue Marble, SMAP, GPM IMERG, MODIS';

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
