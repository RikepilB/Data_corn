import { type Locale, t } from '../../i18n';
import type { ApiError } from '../../infrastructure/apiClient';

/** Mensaje claro para cada error de la API (docs/app/arquitectura-y-api.md §B1). */
export function errorText(error: ApiError, locale: Locale): string {
  const body = error.body ?? {};
  if (error.status === 0 || body.error === 'network') return t(locale, 'error.network');
  if (body.error === 'invalid_geometry') {
    const reason = String(body.reason ?? '');
    const key = `draw.error.${reason.replace('area_', '')}`;
    const text = t(locale, key);
    return text === key ? t(locale, 'error.invalid_geometry', { reason }) : text;
  }
  if (body.error === 'data_unavailable')
    return t(locale, 'error.data_unavailable', { source: String(body.source ?? '?') });
  if (body.error === 'not_implemented')
    return t(locale, 'error.not_implemented', { detail: String(body.detail ?? '') });
  const detail = typeof body.detail === 'string' ? body.detail : `HTTP ${error.status}`;
  return t(locale, 'error.generic', { detail });
}
