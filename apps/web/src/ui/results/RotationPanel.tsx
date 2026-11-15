import type { RotationComparison } from '../../domain/report';
import { strategyViews } from '../../domain/rotation';
import { type Locale, t } from '../../i18n';
import { Icon } from '../common/Icon';
import { RiskBadge } from '../common/RiskBadge';

const HEADINGS = ['why', 'evidence', 'benefits', 'unknown', 'risks'] as const;

/**
 * Three explained rotations under the season verdict (#42). The one the crop map matches
 * comes first and open; the other two are closed so the panel stays short on a phone.
 */
export function RotationPanel({ rotation, locale }: { rotation: RotationComparison; locale: Locale }) {
  const views = strategyViews(rotation);
  return (
    <section className="rotation" aria-labelledby="rotation-title">
      <header className="rotation__head">
        <Icon name="rotate" size={20} />
        <h2 id="rotation-title">{t(locale, 'rotation.panel.title')}</h2>
      </header>
      <p className="rotation__intro">{t(locale, 'rotation.panel.intro')}</p>

      {views.map(({ strategy, current, option }) => (
        <details
          key={strategy}
          className={`rcard${current ? ' rcard--current' : ''}`}
          data-strategy={strategy}
          open={current || undefined}
        >
          <summary className="rcard__summary">
            <span className="rcard__name">{t(locale, `rotation.strategy.${strategy}`)}</span>
            {current && <span className="tag rcard__current">{t(locale, 'rotation.current')}</span>}
          </summary>

          <div className="rcard__body">
            {option && (
              <p className="rcard__erosion">
                {option.residue_erosion_risk === 'no_data' ? (
                  <span className="muted">{t(locale, 'rotation.erosion_unverified')}</span>
                ) : (
                  <>
                    <span>{t(locale, 'rotation.erosion')}</span>
                    <RiskBadge risk={option.residue_erosion_risk} locale={locale} />
                  </>
                )}
              </p>
            )}
            {HEADINGS.map((h) => (
              <div key={h} className="rcard__part">
                <h3>{t(locale, `rotation.h.${h}`)}</h3>
                <p>
                  {h === 'why' && current
                    ? t(locale, 'rotation.why.current')
                    : t(locale, `rotation.strategy.${strategy}.${h}`)}
                </p>
              </div>
            ))}
          </div>
        </details>
      ))}

      <p className="rotation__gap">
        <Icon name="info" size={16} /> {t(locale, 'rotation.no_carryover')}
      </p>
    </section>
  );
}
