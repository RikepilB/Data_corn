// SI-assisted (Claude Code); reviewed by <name>
import { useEffect, useId, useRef, useState } from 'react';
import { type Locale, t } from '../../i18n';
import {
  type Contrast,
  type TextSize,
  setDisplayPrefs,
  systemReducedMotion,
  useDisplayPrefs,
} from './displayPrefs';

const TEXT_SIZES: TextSize[] = ['standard', 'large', 'xlarge'];
const CONTRASTS: Contrast[] = ['standard', 'high'];

/** «Pantalla»: tamaño del texto, alto contraste (al sol) y modo calmado. Se recuerda en este equipo. */
export function DisplayMenu({ locale }: { locale: Locale }) {
  const prefs = useDisplayPrefs();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className="display" ref={root}>
      <button
        ref={button}
        type="button"
        className="display__button"
        aria-label={t(locale, 'display.button')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" className="display__glyph">
          Aa
        </span>
        <span className="display__label">{t(locale, 'display.button')}</span>
      </button>
      {open && (
        <div className="display__panel glass" id={panelId} role="group" aria-label={t(locale, 'display.title')}>
          <div className="display__head">
            <h2>{t(locale, 'display.title')}</h2>
            <button type="button" className="iconbtn" aria-label={t(locale, 'display.close')} onClick={close}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="display__group" role="radiogroup" aria-label={t(locale, 'display.text')}>
            <span className="display__name">{t(locale, 'display.text')}</span>
            <div className="display__options display__options--3">
              {TEXT_SIZES.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={prefs.text === v}
                  className={`chip${prefs.text === v ? ' is-on' : ''}`}
                  onClick={() => setDisplayPrefs({ text: v })}
                >
                  <span aria-hidden="true" style={{ fontSize: `${0.9 + i * 0.2}rem` }}>
                    A
                  </span>
                  {t(locale, `display.text.${v}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="display__group" role="radiogroup" aria-label={t(locale, 'display.contrast')}>
            <span className="display__name">{t(locale, 'display.contrast')}</span>
            <div className="display__options">
              {CONTRASTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={prefs.contrast === v}
                  className={`chip${prefs.contrast === v ? ' is-on' : ''}`}
                  onClick={() => setDisplayPrefs({ contrast: v })}
                >
                  {t(locale, `display.contrast.${v}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="display__group">
            <button
              type="button"
              role="switch"
              aria-checked={prefs.calm}
              aria-describedby={`${panelId}-calm`}
              className={`chip display__switch${prefs.calm ? ' is-on' : ''}`}
              onClick={() => setDisplayPrefs({ calm: !prefs.calm })}
            >
              <span aria-hidden="true">{prefs.calm ? '✓' : '○'}</span> {t(locale, 'display.calm')}
            </button>
            <p id={`${panelId}-calm`} className="small muted">
              {t(locale, 'display.calm.hint')}
            </p>
            {systemReducedMotion() && <p className="small muted">{t(locale, 'display.system_motion')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
