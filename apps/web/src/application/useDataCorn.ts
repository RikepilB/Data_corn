import { useCallback, useMemo, useRef, useState } from 'react';
import { type LngLat, toPolygon } from '../domain/geo';
import { type FieldFormValues, defaultSeason, valuesFromDefaults } from '../domain/inputs';
import type { DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';
import { ApiError, api } from '../infrastructure/apiClient';
import { SAMPLE_FIELD_ID, type PrecomputedReport, loadPrecomputed } from '../infrastructure/precomputed';
import { isMock, mockDescribe, mockReport } from './mock';

// Pasos de la pantalla (docs/flujo.md §4)
export type Step = 'globe' | 'draw' | 'calculating' | 'form' | 'results';

/** True when the form holds the values a saved report was computed with. */
function matchesReport(values: FieldFormValues, report: FieldReport): boolean {
  const i = report.inputs;
  return (
    values.season === i.season &&
    values.planting_date === i.planting_date &&
    values.hybrid_rm_days === i.hybrid_rm_days &&
    values.irrigation === i.irrigation &&
    values.irrigation_capacity_mm_day === i.irrigation_capacity_mm_day &&
    values.tillage === i.tillage &&
    values.yield_goal_t_ha === i.yield_goal_t_ha &&
    // null means "let the engine read it from the crop history"; the report records what it chose
    (values.previous_crop === null || values.previous_crop === i.previous_crop)
  );
}

/** True when the form still holds the values the default precomputed report was computed with. */
export function matchesPrecomputed(values: FieldFormValues, pre: PrecomputedReport): boolean {
  return matchesReport(values, pre.analyze);
}

/** The saved report computed with the form's values (the default or an irrigation variant), or null. */
export function pickPrecomputed(values: FieldFormValues, pre: PrecomputedReport): FieldReport | null {
  return [pre.analyze, ...(pre.variants ?? [])].find((r) => matchesReport(values, r)) ?? null;
}

export const STEPS: Step[] = ['globe', 'draw', 'calculating', 'form', 'results'];

/** True when the form still holds the inputs of the report on screen, so → can show it again without a new run. */
export function formMatchesReport(values: FieldFormValues | null, report: FieldReport | null): boolean {
  const i = report?.inputs;
  if (!values || !i) return false;
  return (
    values.season === i.season &&
    values.planting_date === i.planting_date &&
    values.hybrid_rm_days === i.hybrid_rm_days &&
    values.irrigation === i.irrigation &&
    values.irrigation_capacity_mm_day === i.irrigation_capacity_mm_day &&
    values.tillage === i.tillage &&
    values.yield_goal_t_ha === i.yield_goal_t_ha &&
    // null means "let the engine read it from the crop history"; the report records what it chose
    (values.previous_crop === null || values.previous_crop === i.previous_crop)
  );
}

export function useDataCorn() {
  const mock = useMemo(isMock, []);
  const [step, setStep] = useState<Step>('globe');
  const [points, setPoints] = useState<LngLat[]>([]);
  const [geometry, setGeometry] = useState<PolygonGeometry | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [described, setDescribed] = useState<DescribeFieldResult | null>(null);
  const [values, setValues] = useState<FieldFormValues | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [precomputed, setPrecomputed] = useState<PrecomputedReport | null>(null);
  const [reportIsReal, setReportIsReal] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [describeDone, setDescribeDone] = useState(false);
  const run = useRef(0);

  const toError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(-1, { detail: String(e) }));

  const describe = useCallback(
    async (g: PolygonGeometry, sample = false) => {
      const id = ++run.current;
      setError(null);
      setDescribeDone(false);
      setStep('calculating');
      let season = defaultSeason();
      try {
        // Without an API, the example field shows real results computed in advance (if present)
        const pre = mock && sample ? await loadPrecomputed(SAMPLE_FIELD_ID) : null;
        if (id !== run.current) return;
        setPrecomputed(pre);
        setReportIsReal(false);
        if (pre) season = pre.season;
        const d = pre ? pre.describe : mock ? await mockDescribe(g, season) : await api.describe(g, season);
        if (id !== run.current) return;
        setDescribeDone(true);
        setDescribed(d);
        setValues(valuesFromDefaults(d, season));
        // Deja ver el último ✓ antes de pasar al formulario
        window.setTimeout(() => id === run.current && setStep('form'), 650);
      } catch (e) {
        if (id === run.current) setError(toError(e));
      }
    },
    [mock],
  );

  /** Cierra el lote dibujado y empieza el cálculo. */
  const closeField = useCallback(
    (ring: LngLat[], sample = false) => {
      const g = toPolygon(ring);
      setPoints(ring);
      setGeometry(g);
      setIsSample(sample);
      setReport(null);
      void describe(g, sample);
    },
    [describe],
  );

  const retry = useCallback(() => {
    if (geometry) void describe(geometry, isSample);
  }, [geometry, isSample, describe]);

  const analyze = useCallback(async () => {
    if (!geometry || !values || !described) return;
    setAnalyzing(true);
    setError(null);
    try {
      const saved = mock && precomputed !== null ? pickPrecomputed(values, precomputed) : null;
      const r =
        saved ?? (mock ? await mockReport(geometry, values, described) : await api.analyze(geometry, values));
      setReportIsReal(saved !== null);
      setReport(r);
      setStep('results');
    } catch (e) {
      setError(toError(e));
    } finally {
      setAnalyzing(false);
    }
  }, [geometry, values, described, mock, precomputed]);

  const startDrawing = useCallback(() => {
    run.current++;
    setPoints([]);
    setGeometry(null);
    setReport(null);
    setDescribed(null);
    setError(null);
    setIsSample(false);
    setStep('draw');
  }, []);

  const backToGlobe = useCallback(() => {
    run.current++;
    setPoints([]);
    setGeometry(null);
    setReport(null);
    setError(null);
    setStep('globe');
  }, []);

  const editData = useCallback(() => setStep('form'), []);

  /** ← from the details: back to drawing with the same points, to adjust the field and close it again. */
  const backToField = useCallback(() => {
    run.current++;
    setError(null);
    setStep('draw');
  }, []);

  const canShowResults = formMatchesReport(values, report);
  /** → from the details: the results on screen still match the form, so no new run. */
  const showResults = useCallback(() => {
    if (formMatchesReport(values, report)) setStep('results');
  }, [values, report]);

  return {
    mock,
    /** Generation date (ISO) when the report on screen is a real result computed in advance. */
    precomputedAt: reportIsReal && precomputed ? precomputed.generated_at : null,
    step,
    points,
    setPoints,
    geometry,
    isSample,
    described,
    values,
    setValues,
    report,
    error,
    analyzing,
    describeDone,
    closeField,
    retry,
    analyze,
    startDrawing,
    backToGlobe,
    editData,
    backToField,
    canShowResults,
    showResults,
  };
}

export type DataCorn = ReturnType<typeof useDataCorn>;
