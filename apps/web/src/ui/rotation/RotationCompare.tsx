import type { RotationComparison } from '../../domain/report';
import { type Locale, t } from '../../i18n';
import { RiskBadge } from '../common/RiskBadge';

// ⑥ Rotación: maíz tras maíz vs maíz tras soya (RF-20).
export function RotationCompare({
  rotation,
  locale,
}: {
  rotation: RotationComparison;
  locale: Locale;
}) {
  return (
    <section className="dc-card">
      <h2>{t(locale, 'rotation.title')}</h2>
      <p>{t(locale, rotation.message.key, rotation.message.params)}</p>
      <div className="dc-grid">
        {rotation.options.map((o) => (
          <div key={o.previous_crop}>
            <h3>{t(locale, `crop.${o.previous_crop}`)} → {t(locale, 'crop.maize')}</h3>
            <RiskBadge risk={o.residue_erosion_risk} locale={locale} />
          </div>
        ))}
      </div>
      {/* F7: franja con el cultivo de cada año (CDL) y diferencia de rendimiento del condado */}
    </section>
  );
}
