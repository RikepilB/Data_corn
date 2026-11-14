import type { Status } from '../../application/useDataCorn';
import { type Locale, t } from '../../i18n';
import type { ApiError } from '../../infrastructure/apiClient';

export function StatusPanel({
  status,
  error,
  locale,
}: {
  status: Status;
  error: ApiError | null;
  locale: Locale;
}) {
  const text =
    status === 'error'
      ? t(locale, 'status.error', { detail: error?.body?.detail ?? error?.message ?? '' })
      : t(locale, `status.${status}`);
  return (
    <section className="dc-card" role={status === 'error' ? 'alert' : 'status'}>
      <p className="dc-muted">{text}</p>
    </section>
  );
}
