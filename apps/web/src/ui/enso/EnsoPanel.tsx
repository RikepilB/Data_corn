import type { EnsoInsight } from '../../domain/report';
import { type Locale, t } from '../../i18n';

// ⑦ El Niño / La Niña en este lote (RF-19).
export function EnsoPanel({ enso, locale }: { enso: EnsoInsight; locale: Locale }) {
  return (
    <section className="dc-card">
      <h2>{t(locale, 'enso.title')}</h2>
      {enso.now && (
        <p>
          <strong>{t(locale, `enso.${enso.now.phase}`)}</strong> · {enso.now.index}{' '}
          {enso.now.value.toFixed(1)} ({enso.now.period})
        </p>
      )}
      <p>{t(locale, enso.message.key, enso.message.params)}</p>
      {/* F6: resultados por fase, año por año, y fuerza de la relación */}
    </section>
  );
}
