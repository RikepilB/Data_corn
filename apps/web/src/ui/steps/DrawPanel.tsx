import { type LngLat, checkField } from '../../domain/geo';
import { type UnitSystem, area, format } from '../../domain/units';
import { type Locale, numberLocale, t } from '../../i18n';
import { BackButton } from '../common/BackButton';
import { Icon } from '../common/Icon';

interface Props {
  points: LngLat[];
  locale: Locale;
  units: UnitSystem;
  onUndo: () => void;
  onClose: () => void;
  onBack: () => void;
  backLabel: string;
  showError: boolean;
}

/** Paso 2 · Dibujar el lote con puntos (RF-01). */
export function DrawPanel({ points, locale, units, onUndo, onClose, onBack, backLabel, showError }: Props) {
  const { status, areaHa } = checkField(points);
  const canClose = status === 'ok';
  return (
    <>
      <div className="draw-hint glass" role="status">
        <Icon name="pin" size={20} />
        <span>{t(locale, points.length >= 3 ? 'draw.hint_more' : 'draw.hint')}</span>
      </div>
      <section className="draw-bar glass" aria-label={t(locale, 'draw.hint')}>
        <div className="stepnav">
          <BackButton locale={locale} label={backLabel} onClick={onBack} />
        </div>
        <div className="draw-bar__info">
          <span className="draw-bar__area">
            {points.length >= 3 ? format(area(areaHa, units), numberLocale(locale), 0) : '—'}
          </span>
          <span className="muted">{t(locale, 'draw.points', { n: points.length })}</span>
        </div>
        {showError && status !== 'ok' && points.length > 0 && (
          <p className="draw-bar__error" role="alert">
            <Icon name="alert" size={16} /> {t(locale, `draw.error.${status}`)}
          </p>
        )}
        <div className="draw-bar__actions">
          <button type="button" className="btn btn--secondary" onClick={onUndo} disabled={points.length === 0}>
            <Icon name="undo" size={20} /> {t(locale, 'draw.undo')}
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose} disabled={!canClose && points.length < 3}>
            <Icon name="check" size={20} /> {t(locale, 'draw.close')}
          </button>
        </div>
      </section>
    </>
  );
}
