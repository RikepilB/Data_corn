import type { Summary } from '../../domain/report';
import { type Locale, t } from '../../i18n';
import { RiskBadge } from '../common/RiskBadge';

// ① Resumen: lo primero que lee el gerente (RF-30).
export function SummaryCard({ summary, locale }: { summary: Summary; locale: Locale }) {
  return (
    <section className="dc-card">
      <h2>{t(locale, 'summary.title')}</h2>
      <p>
        <RiskBadge risk={summary.risk} locale={locale} />{' '}
        <span className="dc-muted">{t(locale, `confidence.${summary.confidence}`)}</span>
      </p>
      <p>{t(locale, summary.recommendation.key, summary.recommendation.params)}</p>
      <ul>
        {summary.top_risks.map((id) => (
          <li key={id}>{t(locale, `indicator.${id}`)}</li>
        ))}
      </ul>
    </section>
  );
}
