// Espejo de apps/api/src/datacorn/domain/report.py (respuestas de la API, unidades métricas).
// Más adelante se puede generar desde /api/openapi.json.

export type RiskLevel = 'low' | 'medium' | 'high' | 'no_data';
export type Confidence = 'high' | 'medium' | 'low';
export type Crop = 'maize' | 'soybean' | 'other' | 'fallow';
export type EnsoPhase = 'el_nino' | 'la_nina' | 'neutral';
export type Stage =
  | 'sowing'
  | 'emergence'
  | 'vegetative'
  | 'flowering'
  | 'grain_fill'
  | 'maturity'
  | 'harvest';
export type IndicatorId =
  | 'planting_window'
  | 'hybrid_fit'
  | 'flowering_water'
  | 'flowering_heat'
  | 'frost'
  | 'irrigation'
  | 'season_progress'
  | 'waterlogging'
  | 'field_zones';

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type ZoneClass = 'low' | 'medium' | 'high';

/** Un parche de una zona del lote (RF-18), en lon/lat WGS84. Una clase puede traer varios. */
export interface ZoneFeature {
  type: 'Feature';
  geometry: PolygonGeometry | MultiPolygonGeometry;
  /**
   * Los números son de la clase entera y se repiten en cada parche: `ndvi` es su NDVI medio
   * (0-1) y `area_pct` el porcentaje entero del lote que ocupa.
   */
  properties: { zone: ZoneClass; ndvi: number | null; area_pct: number };
}

/** Zonas estables dentro del lote: vigor bajo / medio / alto en varias campañas. */
export interface ZonesGeoJSON {
  type: 'FeatureCollection';
  meta: {
    source: string;
    first_year: number;
    last_year: number;
    seasons: number;
    resolution_m: number;
  };
  features: ZoneFeature[];
}

export interface Message {
  key: string;
  params: Record<string, string | number>;
}

export interface Evidence {
  sources: string[];
  years: [number, number] | null;
  method: string;
}

export interface Indicator {
  id: IndicatorId;
  risk: RiskLevel;
  message: Message;
  value: number | null;
  unit: string | null;
  evidence: Evidence;
  confidence: Confidence;
  field_check: Message | null;
  series: { x: string; y: number }[];
}

export interface StageWindow {
  stage: Stage;
  start: string;
  end: string;
}

export interface Timeline {
  stages: StageWindow[];
  risk_bands: { indicator: IndicatorId; start: string; end: string; risk: RiskLevel }[];
  today: string | null;
}

export interface CropYear {
  year: number;
  crop: Crop;
  source: string;
}

/** The three explained rotations (#42). The cover-crop option also follows soybean. */
export type RotationStrategy = 'continuous_corn' | 'corn_soybean' | 'corn_soybean_rye';

export interface RotationOption {
  previous_crop: Crop;
  /** Optional until the engine sends it; `domain/rotation.ts` derives it from `previous_crop`. */
  strategy?: RotationStrategy;
  /** True for the one strategy that matches the field's crop record (CDL). At most one. */
  current?: boolean | null;
  relative_yield: number | null;
  planting_soil_water_mm: number | null;
  residue_erosion_risk: RiskLevel;
  notes: Message[];
}

export interface RotationComparison {
  options: RotationOption[];
  recommended: Crop | null;
  field_history: CropYear[];
  message: Message;
}

export interface EnsoState {
  index: string;
  value: number;
  phase: EnsoPhase;
  period: string;
}

/** GET /enso: fase actual y trimestres recientes (globo). */
export interface EnsoOverview {
  current: EnsoState;
  recent: EnsoState[];
}

export interface EnsoInsight {
  now: EnsoState | null;
  outcomes: {
    phase: EnsoPhase;
    years: number[];
    flowering_water_deficit_mm: number | null;
    flowering_heat_days: number | null;
    relative_yield: number | null;
  }[];
  signal_strength: 'weak' | 'moderate' | 'strong';
  message: Message;
}

/** Una campaña simulada: película (día a día) y franja (RF-31, RF-38). Ver docs/contrato-api.md §5. */
export interface SeasonRun {
  year: number;
  observed_days: number;
  enso_phase: EnsoPhase | null;
  start: string;
  water_pct: number[];
  tmax_c: number[];
  stages: StageWindow[];
  flowering_deficit_mm: number;
  flowering_heat_days: number;
  relative_yield: number;
  /** Lluvia diaria (mm). Opcional: las API anteriores no la envían. */
  rain_mm?: number[];
  /** Riego neto diario (mm); 0 en secano. */
  irrigation_mm?: number[];
  /** Rendimiento relativo acumulado (100 = sin pérdida); solo baja. */
  yield_pct?: number[];
  /** Agua disponible (%) por debajo de la cual empieza el estrés. */
  stress_pct?: number;
}

export interface Summary {
  risk: RiskLevel;
  confidence: Confidence;
  recommendation: Message;
  top_risks: IndicatorId[];
}

export interface FieldContext {
  region_id: string;
  admin: { country: string; state: string | null; county: string | null };
  area_ha: number;
  centroid: { lon: number; lat: number };
  soil: {
    texture_class: string;
    available_water_mm_per_m: number;
    drainage_class: string | null;
    source: string;
  } | null;
  terrain: { elevation_m: number; mean_slope_pct: number; low_area_fraction: number } | null;
  crop_history: CropYear[];
  county_yields: { year: number; crop: Crop; yield_t_ha: number; source: string }[];
  enso_now: EnsoState | null;
}

export interface DescribeFieldResult {
  context: FieldContext;
  defaults: { planting_date: string; hybrid_rm_days: number; yield_goal_t_ha: number | null };
}

export interface FieldReport {
  context: FieldContext;
  summary: Summary;
  timeline: Timeline;
  indicators: Indicator[];
  rotation: RotationComparison;
  enso: EnsoInsight;
  zones_geojson: ZonesGeoJSON | null;
  sources: string[];
  observed_until: string | null;
  runs: SeasonRun[];
  typical_year: number | null;
  inputs: {
    season: number;
    planting_date: string;
    hybrid_rm_days: number;
    irrigation: string;
    irrigation_capacity_mm_day: number | null;
    tillage: string;
    yield_goal_t_ha: number | null;
    previous_crop: Crop | null;
  };
}

export interface DemoField {
  id: string;
  name: Record<string, string>;
  region_id: string;
  irrigation: string;
  geometry: PolygonGeometry;
}
