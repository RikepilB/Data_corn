import { type ReactNode, useMemo } from 'react';
import type { Film } from '../../application/useFilm';
import type { FormatContext } from '../../domain/format';
import { messageText } from '../../domain/format';
import type { FieldReport } from '../../domain/report';
import { t } from '../../i18n';
import { Icon } from '../common/Icon';
import { RiskBadge } from '../common/RiskBadge';
import { useDisplayPrefs } from '../common/displayPrefs';
import { ClimateStripes } from './ClimateStripes';
import { RotationPanel } from './RotationPanel';
import { buildCards } from './cards';

interface Props {
  report: FieldReport;
  film: Film;
  ctx: FormatContext;
  isSample: boolean;
  mock: boolean;
  pdfBusy: boolean;
  pdfError: boolean;
  onPdf: () => void;
  onChange: () => void;
  onNew: () => void;
  onAbout: () => void;
  /** En celular la película va dentro del panel, justo debajo del mapa. */
  filmSlot?: ReactNode;
}

/** Calm mode folds the secondary detail behind a summary; otherwise it shows as usual. */
function Secondary({ calm, label, children }: { calm: boolean; label: string; children: ReactNode }) {
  if (!calm) return <>{children}</>;
  return (
    <details className="more">
      <summary>{label}</summary>
      {children}
    </details>
  );
}

/** Paso 5 · Resultados: veredicto, franjas, 6 tarjetas y PDF. */
export function ResultsPanel({ report, film, ctx, isSample, mock, pdfBusy, pdfError, onPdf, onChange, onNew, onAbout, filmSlot }: Props) {
  const { locale } = ctx;
  const calm = useDisplayPrefs().calm;
  // La película re-renderiza el panel 10 veces por segundo: las tarjetas no cambian con ella
  const cards = useMemo(() => buildCards(report, ctx), [report, ctx]);
  const enso = report.enso;
  return (
    <aside className="results glass" aria-label={t(locale, 'results.panel')}>
      <div className="sheet__grip" aria-hidden="true" />
      <div className="results__tags">
        <span className="tag tag--plain">{t(locale, 'results.campaign', { season: report.inputs?.season ?? '' })}</span>
        {isSample && <span className="tag">{t(locale, 'sample.name')}</span>}
        {mock && <span className="tag tag--warn">{t(locale, 'results.mock')}</span>}
      </div>

      <section className={`verdict verdict--${report.summary.risk}`} aria-labelledby="verdict-title">
        <div className="verdict__top">
          <RiskBadge risk={report.summary.risk} locale={locale} large />
          <span className="muted small">
            {t(locale, 'confidence.label', { level: t(locale, `confidence.${report.summary.confidence}`) })}
          </span>
        </div>
        <p id="verdict-title" className="verdict__text">
          {messageText(report.summary.recommendation, ctx)}
        </p>
        {enso.now && (
          <p className="enso-chip">
            <span className={`dot is-${enso.now.phase}`} aria-hidden="true" />
            {t(locale, 'verdict.enso', {
              phase: t(locale, `enso.${enso.now.phase}`),
              strength: t(locale, `enso.strength.${enso.signal_strength}`),
            })}
            <span className="muted">
              {' '}
              · {t(locale, 'verdict.enso_value', { index: enso.now.index, value: `${enso.now.value > 0 ? '+' : ''}${enso.now.value.toFixed(2)}` })}
            </span>
          </p>
        )}
      </section>

      {filmSlot}

      <RotationPanel rotation={report.rotation} locale={locale} />

      <Secondary calm={calm} label={t(locale, 'display.more')}>
        <ClimateStripes report={report} film={film} locale={locale} />
      </Secondary>

      <div className="cards">
        {cards.map((c) => (
          <article key={c.key} className={`kcard kcard--${c.risk}`}>
            <header className="kcard__head">
              <span className="kcard__icon">
                <Icon name={c.icon} size={22} />
              </span>
              <h3>{c.title}</h3>
            </header>
            <RiskBadge risk={c.risk} locale={locale} />
            <p className="kcard__big">{c.big}</p>
            <p className="kcard__text">{c.sentence}</p>
            {(c.extra || (c.history && c.history.length > 0)) && (
              <Secondary calm={calm} label={t(locale, 'display.more')}>
                {c.extra && <p className="kcard__extra">{c.extra}</p>}
                {c.history && c.history.length > 0 && (
                  <div className="kcard__history" role="img" aria-label={t(locale, 'rotation.history')}>
                    {c.history.map((h) => (
                      <span key={h.year} className={`yr is-${h.crop}`} title={`${h.year}: ${t(locale, `crop.${h.crop}`)}`}>
                        <i />
                        <small>{String(h.year).slice(2)}</small>
                      </span>
                    ))}
                  </div>
                )}
                {c.history && c.history.length > 0 && (
                  <p className="kcard__legend" aria-hidden="true">
                    <span>
                      <i className="is-maize" /> {t(locale, 'crop.maize')}
                    </span>
                    <span>
                      <i /> {t(locale, 'crop.soybean')}
                    </span>
                  </p>
                )}
              </Secondary>
            )}
          </article>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--xl" onClick={onPdf} disabled={pdfBusy}>
        {pdfBusy ? <span className="spinner spinner--dark" aria-hidden="true" /> : <Icon name="download" />}
        {t(locale, pdfBusy ? 'results.pdf_busy' : 'results.pdf')}
      </button>
      {pdfError && (
        <p className="form__error" role="alert">
          {t(locale, 'results.pdf_error')}
        </p>
      )}
      <div className="results__links">
        <button type="button" className="link" onClick={onChange}>
          {t(locale, 'results.change')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="link" onClick={onNew}>
          {t(locale, 'results.new')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="link" onClick={onAbout}>
          {t(locale, 'about.link')}
        </button>
      </div>
      <p className="disclaimer">
        <Icon name="info" size={16} /> {t(locale, 'results.disclaimer')}
      </p>
      <p className="sources">{t(locale, 'results.sources', { list: report.sources.join(' · ') })}</p>
    </aside>
  );
}
