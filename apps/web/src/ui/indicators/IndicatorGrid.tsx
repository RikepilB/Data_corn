import type { Indicator } from '../../domain/report';
import { type Locale, t } from '../../i18n';
import { IndicatorCard } from './IndicatorCard';

// ⑤ Indicadores (RF-10 a RF-18).
export function IndicatorGrid({ indicators, locale }: { indicators: Indicator[]; locale: Locale }) {
  return (
    <section>
      <h2>{t(locale, 'indicators.title')}</h2>
      <div className="dc-grid">
        {indicators.map((i) => (
          <IndicatorCard key={i.id} indicator={i} locale={locale} />
        ))}
      </div>
    </section>
  );
}
