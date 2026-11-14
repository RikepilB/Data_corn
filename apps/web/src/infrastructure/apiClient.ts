import type { FieldFormValues } from '../domain/inputs';
import type { DemoField, DescribeFieldResult, FieldReport, PolygonGeometry } from '../domain/report';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { error?: string; detail?: string; reason?: string } | null,
  ) {
    super(`API ${status}${body?.detail ? `: ${body.detail}` : ''}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
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
