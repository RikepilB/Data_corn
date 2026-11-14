import type { FieldFormValues } from '../domain/inputs';
import type { DemoField, DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';

const BASE = '/api/v1';

export interface ApiErrorBody {
  error?: string;
  detail?: string | unknown;
  reason?: string;
  source?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(`API ${status}${typeof body?.detail === 'string' ? `: ${body.detail}` : ''}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, { error: 'network' });
  }
  if (!response.ok) {
    throw new ApiError(response.status, await response.json().catch(() => null));
  }
  return (await response.json()) as T;
}

export const api = {
  demoFields: () => request<DemoField[]>('/demo-fields'),
  describe: (geometry: PolygonGeometry, season: number) =>
    request<DescribeFieldResult>('/fields/describe', {
      method: 'POST',
      body: JSON.stringify({ geometry, season }),
    }),
  analyze: (geometry: PolygonGeometry, values: FieldFormValues) =>
    request<FieldReport>('/fields/analyze', {
      method: 'POST',
      body: JSON.stringify({ geometry, ...values }),
    }),
};
