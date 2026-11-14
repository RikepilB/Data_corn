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

export interface RotationComparison {
  options: {
    previous_crop: Crop;
    relative_yield: number | null;
    planting_soil_water_mm: number | null;
    residue_erosion_risk: RiskLevel;
    notes: Message[];
  }[];
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
  zones_geojson: Record<string, unknown> | null;
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
