import type { RiskLevel } from '../../domain/report';
import { type Locale, t } from '../../i18n';

// Color + ícono + palabra: el significado nunca depende solo del color (RNF-09).
const ICON: Record<RiskLevel, string> = { low: '✓', medium: '◆', high: '▲', no_data: '?' };

export function RiskBadge({
  risk,
  locale,
  large = false,
}: {
  risk: RiskLevel;
  locale: Locale;
  large?: boolean;
}) {
  return (
    <span
      className={`risk risk--${risk}${large ? ' risk--large' : ''}`}
      title={t(locale, 'risk.label', { level: t(locale, `risk.${risk}`) })}
    >
      <span className="risk__icon" aria-hidden="true">
        {ICON[risk]}
      </span>
      <span className="risk__text">{t(locale, `risk.${risk}`)}</span>
    </span>
  );
}
