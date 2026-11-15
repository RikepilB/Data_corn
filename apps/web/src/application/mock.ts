// Modo ?mock=1: un reporte generado para probar la pantalla sin la API.
// Se muestra siempre con la etiqueta «Datos de ejemplo (sin API)». No son resultados reales.
import { addDays } from '../domain/format';
import { type LngLat, areaHa, centroid, ringOf } from '../domain/geo';
import type { FieldFormValues } from '../domain/inputs';
import type {
  DescribeFieldResult,
  EnsoOverview,
  EnsoPhase,
  FieldReport,
  Indicator,
  IndicatorId,
  PolygonGeometry,
  RiskLevel,
  SeasonRun,
  StageWindow,
  ZoneClass,
  ZonesGeoJSON,
} from '../domain/report';

const EL_NINO = new Set([2002, 2004, 2006, 2009, 2015, 2018, 2023]);
const LA_NINA = new Set([2007, 2010, 2011, 2020, 2021, 2022, 2024]);
const DRY = new Map([
  [2002, 0.55],
  [2012, 0.75],
  [2022, 0.45],
  [2023, 0.35],
  [2005, 0.25],
]);

function rng(seed: number) {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockDescribe(geometry: PolygonGeometry, season: number): Promise<DescribeFieldResult> {
  await sleep(4200);
  const ring = ringOf(geometry);
  const [lon, lat] = centroid(ring);
  return {
    context: {
      region_id: 'us',
      admin: { country: 'US', state: 'NE', county: 'Hamilton County' },
      area_ha: areaHa(ring),
      centroid: { lon, lat },
      soil: {
        texture_class: 'silt_loam',
        available_water_mm_per_m: 190,
        drainage_class: 'Well drained',
        source: 'USDA NRCS SSURGO',
      },
      terrain: { elevation_m: 551, mean_slope_pct: 0.9, low_area_fraction: 0 },
      crop_history: Array.from({ length: 18 }, (_, i) => ({
        year: 2008 + i,
        crop: (i % 2 === 0 ? 'maize' : 'soybean') as 'maize' | 'soybean',
        source: 'USDA NASS CropScape CDL',
      })),
      county_yields: [],
      enso_now: { index: 'ONI', value: 2.46, phase: 'el_nino', period: 'ASO 2026' },
    },
    defaults: { planting_date: `${season}-04-28`, hybrid_rm_days: 110, yield_goal_t_ha: null },
  };
}

const LENGTH = 152;
const FLOWER = [70, 90] as const;
const STRESS = 45;

function stagesFor(start: string): StageWindow[] {
  return [
    { stage: 'sowing', start, end: start },
    { stage: 'emergence', start: addDays(start, 8), end: addDays(start, 8) },
    { stage: 'vegetative', start: addDays(start, 9), end: addDays(start, FLOWER[0] - 1) },
    { stage: 'flowering', start: addDays(start, FLOWER[0]), end: addDays(start, FLOWER[1]) },
    { stage: 'grain_fill', start: addDays(start, FLOWER[1] + 1), end: addDays(start, 128) },
    { stage: 'maturity', start: addDays(start, 129), end: addDays(start, 129) },
    { stage: 'harvest', start: addDays(start, 150), end: addDays(start, 150) },
  ];
}

function makeRun(year: number, start: string, irrigated: boolean): SeasonRun {
  const rand = rng(year * 7919);
  const dryness = irrigated ? 0 : DRY.get(year) ?? rand() * 0.2;
  const water: number[] = [];
  const tmax: number[] = [];
  const rain: number[] = [];
  const irrigation: number[] = [];
  let w = 72 + rand() * 10;
  for (let i = 0; i < LENGTH; i++) {
    const summer = Math.sin((Math.PI * i) / LENGTH);
    w -= 0.6 + 1.1 * summer * (1 + dryness);
    let r = 0;
    if (rand() < 0.14) {
      r = 6 + rand() * 18 * (1 - dryness);
      if (rand() < 0.12) r += 22;
      w += r * 0.8;
    }
    let irr = 0;
    if (irrigated && w < 55) {
      irr = 25;
      w += 14;
    }
    w = Math.max(4, Math.min(100, w));
    water.push(Math.round(w));
    rain.push(Math.round(r * 10) / 10);
    irrigation.push(irr);
    tmax.push(Math.round((20 + 11 * summer + dryness * 5 + (rand() - 0.5) * 6) * 10) / 10);
  }
  const flowerWater = water.slice(FLOWER[0], FLOWER[1] + 1);
  const minW = Math.min(...flowerWater);
  const rel = Math.min(1, Math.max(0.58, 0.6 + (0.4 * minW) / 55));
  // Rendimiento acumulado: la pérdida total se reparte en los días con estrés (la floración pesa 3×)
  const weight = water.map((v, i) => Math.max(0, STRESS - v) * (i >= FLOWER[0] && i <= FLOWER[1] ? 3 : 1));
  const total = weight.reduce((a, b) => a + b, 0);
  let acc = 0;
  const yieldPct = weight.map((v) => {
    acc += total > 0 ? v / total : 0;
    return Math.round((100 - 100 * (1 - rel) * acc) * 10) / 10;
  });
  const heatDays = tmax.slice(FLOWER[0], FLOWER[1] + 1).filter((t) => t >= 35).length;
  const phase: EnsoPhase = EL_NINO.has(year) ? 'el_nino' : LA_NINA.has(year) ? 'la_nina' : 'neutral';
  return {
    year,
    observed_days: 0,
    enso_phase: phase,
    start,
    water_pct: water,
    tmax_c: tmax,
    stages: stagesFor(start),
    flowering_deficit_mm: Math.round((1 - rel) * 180),
    flowering_heat_days: heatDays,
    relative_yield: Math.round(rel * 1000) / 1000,
    rain_mm: rain,
    irrigation_mm: irrigation,
    yield_pct: yieldPct,
    stress_pct: STRESS,
  };
}

/** GET /enso de ejemplo: El Niño fuerte en curso (valores tipo ONI). */
export async function mockEnso(): Promise<EnsoOverview> {
  await sleep(300);
  const values = [-0.6, -0.4, -0.2, 0.1, 0.4, 0.7, 1.0, 1.3, 1.5, 1.7, 1.8, 1.7, 1.4, 1.0, 0.6, 0.2, -0.1, -0.3,
    -0.4, -0.3, -0.1, 0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.2, 2.4, 2.5, 2.5];
  const seasons = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
  const recent = values.map((value, i) => {
    const k = i + 1; // JFM 2024 … ASO 2026
    const year = 2024 + Math.floor(k / 12);
    const phase: EnsoPhase = value >= 0.5 ? 'el_nino' : value <= -0.5 ? 'la_nina' : 'neutral';
    return { index: 'ONI', value, phase, period: `${seasons[k % 12]} ${year}` };
  });
  return { current: recent[recent.length - 1]!, recent };
}

function indicator(
  id: IndicatorId,
  risk: RiskLevel,
  key: string,
  params: Record<string, string | number>,
  value: number | null,
  unit: string | null,
  check: string | null,
  sources: string[],
): Indicator {
  return {
    id,
    risk,
    message: { key, params },
    value,
    unit,
    evidence: { sources, years: [2001, 2025], method: `method.${id}` },
    confidence: 'medium',
    field_check: check ? { key: check, params: {} } : null,
    series: [],
  };
}

const byFraction = (f: number, medium: number, high: number): RiskLevel =>
  f >= high ? 'high' : f >= medium ? 'medium' : 'low';

// Zonas de ejemplo. Los parches van en coordenadas del propio lote (u: de la esquina 1 a la 2,
// v: hacia las esquinas 4 y 3; de 0 a 1), así siempre caen dentro del contorno.
const ZONE_PATCHES: { zone: ZoneClass; uv: [number, number][] }[] = [
  { zone: 'low', uv: [[0, 0], [0.3, 0], [0.24, 0.45], [0, 0.45]] },
  { zone: 'high', uv: [[0, 0.45], [0.24, 0.45], [0.28, 1], [0, 1]] },
  { zone: 'medium', uv: [[0.3, 0], [0.7, 0], [0.78, 0.6], [0.74, 1], [0.28, 1], [0.24, 0.45]] },
  { zone: 'high', uv: [[0.7, 0], [1, 0], [1, 0.6], [0.78, 0.6]] },
  { zone: 'low', uv: [[0.78, 0.6], [1, 0.6], [1, 1], [0.74, 1]] },
];
// Como la API: cada parche repite los números de su clase (el área es la de los parches de arriba)
const ZONE_STATS: Record<ZoneClass, { ndvi: number; area_pct: number }> = {
  low: { ndvi: 0.64, area_pct: 22 },
  medium: { ndvi: 0.71, area_pct: 48 },
  high: { ndvi: 0.78, area_pct: 30 },
};

/** Mapa de zonas para un lote de 4 esquinas (el de ejemplo); con otra forma no hay mapa. */
export function mockZones(ring: LngLat[]): ZonesGeoJSON | null {
  const [a, b, c, d] = ring;
  if (ring.length !== 4 || !a || !b || !c || !d) return null;
  const at = ([u, v]: [number, number]): number[] =>
    [0, 1].map((k) => {
      const south = a[k]! + (b[k]! - a[k]!) * u;
      const north = d[k]! + (c[k]! - d[k]!) * u;
      return Math.round((south + (north - south) * v) * 1e6) / 1e6;
    });
  return {
    type: 'FeatureCollection',
    meta: { source: 'Sample zones (invented; Earth Engine has not run)', first_year: 2021, last_year: 2025, seasons: 5, resolution_m: 10 },
    features: ZONE_PATCHES.map(({ zone, uv }) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...uv, uv[0]!].map(at)] },
      properties: { zone, ...ZONE_STATS[zone] },
    })),
  };
}

function zonesIndicator(zones: ZonesGeoJSON | null): Indicator {
  if (!zones) return indicator('field_zones', 'no_data', 'field_zones.needs_ee', {}, null, null, null, []);
  const { meta } = zones;
  const spread = Math.round((ZONE_STATS.high.ndvi - ZONE_STATS.low.ndvi) * 100) / 100;
  const params = { low_pct: ZONE_STATS.low.area_pct, high_pct: ZONE_STATS.high.area_pct, seasons: meta.seasons, spread };
  return {
    ...indicator('field_zones', 'medium', 'field_zones.medium', params, spread, 'ndvi', 'check.scout_field', [meta.source]),
    evidence: { sources: [meta.source], years: [meta.first_year, meta.last_year], method: 'method.field_zones' },
    confidence: 'high',
  };
}

export async function mockReport(
  geometry: PolygonGeometry,
  values: FieldFormValues,
  described: DescribeFieldResult,
): Promise<FieldReport> {
  await sleep(900);
  const irrigated = values.irrigation !== 'none';
  const start = values.planting_date;
  const runs = Array.from({ length: 25 }, (_, i) => makeRun(2001 + i, start, irrigated));
  const sorted = [...runs].sort((a, b) => a.relative_yield - b.relative_yield);
  const typical = sorted[12]!;
  const total = runs.length;
  const stressed = runs.filter((r) => 1 - r.relative_yield >= 0.15 || r.flowering_deficit_mm >= 30).length;
  const loss = Math.round(100 * (1 - typical.relative_yield));
  const heat = [...runs.map((r) => r.flowering_heat_days)].sort((a, b) => a - b)[12] ?? 0;
  const waterRisk = byFraction(stressed / total, 0.2, 0.45);
  const heatRisk: RiskLevel = heat > 4 ? 'high' : heat > 1 ? 'medium' : 'low';
  const rm = values.hybrid_rm_days;
  const matureOk = Math.max(10, total - Math.max(0, Math.round((rm - 105) / 3)));
  const hybridRisk = byFraction(1 - matureOk / total, 0.1, 0.25);
  const sources = [
    'NASA POWER (MERRA-2)',
    'USDA NRCS SSURGO',
    'USDA NASS CropScape CDL',
    'NASA MODIS MOD13Q1 (ORNL DAAC)',
    'NOAA CPC ONI',
  ];
  const zones = mockZones(ringOf(geometry));
  const windowStart = addDays(start, -4);
  const windowEnd = addDays(start, 12);
  const indicators: Indicator[] = [
    indicator('planting_window', 'low', 'planting_window.inside', { start_date: windowStart, end_date: windowEnd }, null, null, 'check.soil_probe', sources.slice(0, 2)),
    indicator('hybrid_fit', hybridRisk, `hybrid_fit.${hybridRisk === 'low' ? 'ok' : hybridRisk === 'medium' ? 'tight' : 'risky'}`, { years: matureOk, total, rm }, matureOk, 'count', 'check.frost_low_spots', sources.slice(0, 1)),
    indicator('frost', 'low', 'frost.low', { late_pct: 4, early_pct: 8 }, 0.04, 'fraction', 'check.frost_low_spots', sources.slice(0, 1)),
    indicator('flowering_water', waterRisk, `flowering_water.${waterRisk}`, { years: stressed, total, loss_pct: loss }, stressed, 'count', 'check.soil_probe', sources.slice(0, 2)),
    indicator('flowering_heat', heatRisk, `flowering_heat.${heatRisk}`, { days: heat, threshold_c: 35 }, heat, 'days', 'check.scout_silking', sources.slice(0, 1)),
    irrigated
      ? indicator('irrigation', 'low', 'irrigation.ok', { peak_week_mm: 44, capacity_week_mm: 38 * 1.2, season_mm: 260 }, 44, 'mm_week', 'check.irrigation_schedule', sources.slice(0, 1))
      : indicator('waterlogging', 'low', 'waterlogging.low', { years: 2, total }, 2, 'count', 'check.drainage', sources.slice(0, 2)),
    indicator('season_progress', 'no_data', 'season_progress.not_started', { season: values.season }, null, 'days', 'check.scout_field', sources.slice(3, 4)),
    zonesIndicator(zones),
  ];
  const summaryRisk: RiskLevel =
    [waterRisk, heatRisk, hybridRisk].includes('high')
      ? 'high'
      : [waterRisk, heatRisk, hybridRisk].includes('medium')
        ? 'medium'
        : 'low';
  const top = (['flowering_water', 'flowering_heat', 'hybrid_fit'] as IndicatorId[]).filter(
    (id) => indicators.find((i) => i.id === id)?.risk !== 'low',
  );
  const flowering = typical.stages.find((s) => s.stage === 'flowering')!;
  return {
    context: described.context,
    inputs: values,
    summary: {
      risk: summaryRisk,
      confidence: 'medium',
      recommendation: top[0]
        ? { key: 'summary.watch', params: { start_date: windowStart, end_date: windowEnd, main_indicator: top[0] } }
        : { key: 'summary.good', params: { start_date: windowStart, end_date: windowEnd } },
      top_risks: top,
    },
    timeline: {
      stages: typical.stages,
      risk_bands: [
        ...(waterRisk !== 'low'
          ? [{ indicator: 'flowering_water' as const, start: flowering.start, end: flowering.end, risk: waterRisk }]
          : []),
        ...(heatRisk !== 'low'
          ? [{ indicator: 'flowering_heat' as const, start: flowering.start, end: flowering.end, risk: heatRisk }]
          : []),
      ],
      today: null,
    },
    indicators,
    rotation: {
      options: [
        { previous_crop: 'soybean', strategy: 'corn_soybean', current: true, relative_yield: null, planting_soil_water_mm: null, residue_erosion_risk: 'low', notes: [{ key: 'rotation.note.residue', params: {} }] },
        { previous_crop: 'maize', strategy: 'continuous_corn', current: false, relative_yield: null, planting_soil_water_mm: null, residue_erosion_risk: 'low', notes: [{ key: 'rotation.note.rootworm', params: {} }, { key: 'rotation.note.residue', params: {} }] },
        // Erosion with a rye cover crop has no documented rule yet (#42): shown as not verified.
        { previous_crop: 'soybean', strategy: 'corn_soybean_rye', current: false, relative_yield: null, planting_soil_water_mm: null, residue_erosion_risk: 'no_data', notes: [] },
      ],
      recommended: 'soybean',
      field_history: described.context.crop_history,
      message: { key: 'rotation.soy_first', params: { pattern: 'M S M S M S M S', after_soy: 9, after_corn: 0 } },
    },
    enso: {
      now: described.context.enso_now,
      outcomes: (['el_nino', 'la_nina', 'neutral'] as EnsoPhase[]).map((phase) => {
        const group = runs.filter((r) => r.enso_phase === phase);
        const med = [...group].sort((a, b) => a.relative_yield - b.relative_yield)[Math.floor(group.length / 2)];
        return {
          phase,
          years: group.map((r) => r.year),
          flowering_water_deficit_mm: med?.flowering_deficit_mm ?? null,
          flowering_heat_days: med?.flowering_heat_days ?? null,
          relative_yield: med?.relative_yield ?? null,
        };
      }),
      signal_strength: 'weak',
      message: { key: 'enso.weak', params: { now_phase: 'el_nino', delta_pct: -1, years: runs.filter((r) => r.enso_phase === 'el_nino').length } },
    },
    zones_geojson: zones,
    sources: zones ? [...sources, zones.meta.source] : sources,
    observed_until: null,
    runs,
    typical_year: typical.year,
  };
}

export const isMock = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === '1';

export type { LngLat };
