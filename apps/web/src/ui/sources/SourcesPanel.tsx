import { type Locale, t } from '../../i18n';

// ⑧ Fuentes y confianza + aviso al productor (RF-34, RF-35). Siempre visible.
export function SourcesPanel({ sources, locale }: { sources: string[]; locale: Locale }) {
  return (
    <section className="dc-card">
      <h2>{t(locale, 'sources.title')}</h2>
      {sources.length > 0 && (
        <ul>
          {sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <p className="dc-muted">{t(locale, 'sources.disclaimer')}</p>
    </section>
  );
}
