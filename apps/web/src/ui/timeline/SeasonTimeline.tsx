import type { Timeline } from '../../domain/report';
import { type Locale, numberLocale, t } from '../../i18n';

// ② Línea de tiempo (RF-31). F8: barras horizontales con franjas de riesgo y marca de "hoy".
export function SeasonTimeline({ timeline, locale }: { timeline: Timeline; locale: Locale }) {
  const date = new Intl.DateTimeFormat(numberLocale(locale), { day: 'numeric', month: 'short' });
  return (
    <section className="dc-card">
      <h2>{t(locale, 'timeline.title')}</h2>
      <ol>
        {timeline.stages.map((s) => (
          <li key={s.stage}>
            {t(locale, `stage.${s.stage}`)}: {date.format(new Date(s.start))} –{' '}
            {date.format(new Date(s.end))}
          </li>
        ))}
      </ol>
    </section>
  );
}
