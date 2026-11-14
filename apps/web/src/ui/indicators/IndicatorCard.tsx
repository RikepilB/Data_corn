import type { Indicator } from '../../domain/report';
import { type Locale, t } from '../../i18n';
import { RiskBadge } from '../common/RiskBadge';

// Tarjeta: frase simple + número para el gerente; el detalle, al abrir, para el agrónomo.
export function IndicatorCard({ indicator, locale }: { indicator: Indicator; locale: Locale }) {
  const { evidence } = indicator;
  return (
    <article className="dc-card">
      <RiskBadge risk={indicator.risk} locale={locale} />
      <h3>{t(locale, `indicator.${indicator.id}`)}</h3>
      <p>{t(locale, indicator.message.key, indicator.message.params)}</p>
      {indicator.value != null && (
        <p>
          <strong>{indicator.value}</strong> {indicator.unit}
        </p>
      )}
      <details>
        <summary>{t(locale, 'detail.show')}</summary>
        {/* F8: gráfico de indicator.series con Recharts */}
        <p>
          <strong>{t(locale, 'detail.method')}:</strong> {evidence.method}
        </p>
        <p>
          <strong>{t(locale, 'detail.data')}:</strong> {evidence.sources.join(', ')}
          {evidence.years && ` (${evidence.years[0]}–${evidence.years[1]})`}
        </p>
        <p>{t(locale, `confidence.${indicator.confidence}`)}</p>
        {indicator.field_check && (
          <p>
            <strong>{t(locale, 'detail.field_check')}:</strong>{' '}
            {t(locale, indicator.field_check.key, indicator.field_check.params)}
          </p>
        )}
      </details>
    </article>
  );
}
