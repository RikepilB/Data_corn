import { useCallback, useState } from 'react';
import { type FieldFormValues, valuesFromDefaults } from '../domain/inputs';
import type { DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';
import { ApiError, api } from '../infrastructure/apiClient';

// Estados de la pantalla (docs/flujo.md §4)
export type Status = 'empty' | 'describing' | 'drawn' | 'analyzing' | 'ready' | 'error';

export function useDataCorn() {
  const [status, setStatus] = useState<Status>('empty');
  const [geometry, setGeometry] = useState<PolygonGeometry | null>(null);
  const [described, setDescribed] = useState<DescribeFieldResult | null>(null);
  const [values, setValues] = useState<FieldFormValues | null>(null);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const fail = (e: unknown) => {
    setError(e instanceof ApiError ? e : new ApiError(0, { detail: String(e) }));
    setStatus('error');
  };

  const onFieldDrawn = useCallback(async (g: PolygonGeometry, season: number) => {
    setGeometry(g);
    setReport(null);
    setStatus('describing');
    try {
      const d = await api.describe(g, season);
      setDescribed(d);
      setValues(valuesFromDefaults(d, season));
      setStatus('drawn');
    } catch (e) {
      fail(e);
    }
  }, []);

  // RF-33: al cambiar un dato se vuelve a llamar; la API reutiliza los datos en caché.
  const analyze = useCallback(async () => {
    if (!geometry || !values) return;
    setStatus('analyzing');
    try {
      setReport(await api.analyze(geometry, values));
      setStatus('ready');
    } catch (e) {
      fail(e);
    }
  }, [geometry, values]);

  return { status, geometry, described, values, setValues, report, error, onFieldDrawn, analyze };
}
