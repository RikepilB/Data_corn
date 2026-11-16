import { useCallback, useMemo, useRef, useState } from 'react';
import { type LngLat, toPolygon } from '../domain/geo';
import { type FieldFormValues, defaultSeason, valuesFromDefaults } from '../domain/inputs';
import type { DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';
import { ApiError, api } from '../infrastructure/apiClient';
import { isMock, mockDescribe, mockReport } from './mock';

// Pasos de la pantalla (docs/app/flujo-y-pantalla.md §4)
export type Step = 'globe' | 'draw' | 'calculating' | 'form' | 'results';

export const STEPS: Step[] = ['globe', 'draw', 'calculating', 'form', 'results'];

export function useDataCorn() {
  const mock = useMemo(isMock, []);
  const [step, setStep] = useState<Step>('globe');
  const [points, setPoints] = useState<LngLat[]>([]);
  const [geometry, setGeometry] = useState<PolygonGeometry | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [described, setDescribed] = useState<DescribeFieldResult | null>(null);
  const [values, setValues] = useState<FieldFormValues | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [describeDone, setDescribeDone] = useState(false);
  const run = useRef(0);

  const toError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(-1, { detail: String(e) }));

  const describe = useCallback(
    async (g: PolygonGeometry) => {
      const id = ++run.current;
      setError(null);
      setDescribeDone(false);
      setStep('calculating');
      const season = defaultSeason();
      try {
        const d = mock ? await mockDescribe(g, season) : await api.describe(g, season);
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
      void describe(g);
    },
    [describe],
  );

  const retry = useCallback(() => {
    if (geometry) void describe(geometry);
  }, [geometry, describe]);

  const analyze = useCallback(async () => {
    if (!geometry || !values || !described) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = mock ? await mockReport(geometry, values, described) : await api.analyze(geometry, values);
      setReport(r);
      setStep('results');
    } catch (e) {
      setError(toError(e));
    } finally {
      setAnalyzing(false);
    }
  }, [geometry, values, described, mock]);

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

  return {
    mock,
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
  };
}

export type DataCorn = ReturnType<typeof useDataCorn>;
