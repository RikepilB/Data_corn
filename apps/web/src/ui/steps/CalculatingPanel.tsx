import { useEffect, useState } from 'react';
import { type Locale, t } from '../../i18n';
import type { ApiError } from '../../infrastructure/apiClient';
import { Icon } from '../common/Icon';
import { errorText } from './errors';

const ITEMS = ['location', 'soil', 'crops', 'climate', 'satellite'] as const;
// Segundos en que cada paso se marca listo mientras la API trabaja (el último, al responder)
const TICKS = [1.2, 3.5, 7, 13];

interface Props {
  locale: Locale;
  done: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onRedraw: () => void;
}

/** Paso 3 · Calculando: lista de avance (RF-05). */
export function CalculatingPanel({ locale, done, error, onRetry, onRedraw }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (error) return;
    setElapsed(0);
    const t0 = performance.now();
    const timer = window.setInterval(() => setElapsed((performance.now() - t0) / 1000), 250);
    return () => window.clearInterval(timer);
  }, [error]);

  const completed = done ? ITEMS.length : TICKS.filter((s) => elapsed >= s).length;
  const progress = done ? 100 : Math.min(92, (completed / ITEMS.length) * 100 + (elapsed % 3) * 2);

  if (error) {
    return (
      <section className="calc glass" role="alert">
        <h2>
          <Icon name="alert" /> {t(locale, 'calc.error_title')}
        </h2>
        <p>{errorText(error, locale)}</p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            {t(locale, 'calc.retry')}
          </button>
          <button type="button" className="btn btn--secondary" onClick={onRedraw}>
            {t(locale, 'calc.redraw')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="calc glass" aria-live="polite" aria-busy={!done}>
      <h2>{t(locale, 'calc.title')}</h2>
      <p className="muted">{t(locale, 'calc.subtitle')}</p>
      <div className="progress" aria-hidden="true">
        <div className="progress__bar" style={{ width: `${progress}%` }} />
      </div>
      <ol className="checklist">
        {ITEMS.map((item, i) => {
          const state = i < completed ? 'done' : i === completed ? 'running' : 'waiting';
          return (
            <li key={item} className={`checklist__item is-${state}`}>
              <span className="checklist__mark" aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={16} /> : state === 'running' ? <span className="spinner" /> : null}
              </span>
              <span>{t(locale, `calc.step.${item}`)}</span>
              <span className="checklist__state">{t(locale, `calc.${state}`)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
