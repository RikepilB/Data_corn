import type { Film } from '../../application/useFilm';
import type { FieldReport } from '../../domain/report';
import { yieldColor } from '../common/palette';
import { type Locale, t } from '../../i18n';

const barHeight = (rel: number) => `${Math.round(24 + 43 * Math.min(1, Math.max(0, (rel - 0.6) / 0.4)))}px`;

/** Franjas de 25 campañas (RF-38): una por año, color por rendimiento relativo, marca ENSO. */
export function ClimateStripes({ report, film, locale }: { report: FieldReport; film: Film; locale: Locale }) {
  const runs = [...(report.runs ?? [])].sort((a, b) => a.year - b.year);
  if (runs.length === 0) return null;
  const selected = film.run?.year;
  const first = runs[0]!.year;
  const last = runs[runs.length - 1]!.year;
  const middle = runs[Math.floor(runs.length / 2)]!.year;

  return (
    <section className="card stripes" aria-labelledby="stripes-title">
      <header className="card__head">
        <h3 id="stripes-title">{t(locale, 'stripes.title', { n: runs.length })}</h3>
        <span className="muted small">{t(locale, 'stripes.hint')}</span>
      </header>
      <div className="stripes__bars" role="list">
        {runs.map((r) => {
          const phase = r.enso_phase === 'el_nino' || r.enso_phase === 'la_nina' ? r.enso_phase : null;
          const label = t(locale, 'stripes.bar', {
            year: r.year,
            pct: Math.round(r.relative_yield * 100),
            phase: phase ? ` · ${t(locale, `stripes.${phase}`)}` : '',
          });
          return (
            <div role="listitem" key={r.year} className="stripes__col">
              <span className={`stripes__mark${phase ? ` is-${phase}` : ''}`} aria-hidden="true" />
              <button
                type="button"
                className={`stripes__bar${selected === r.year ? ' is-selected' : ''}${r.relative_yield < 0.85 ? ' is-poor' : ''}`}
                // Altura = rendimiento relativo; los años flojos además llevan rayas: no solo color
                style={{ backgroundColor: yieldColor(r.relative_yield), height: barHeight(r.relative_yield) }}
                aria-label={label}
                title={label}
                aria-pressed={film.mode.kind === 'year' && film.mode.year === r.year}
                onClick={(e) => {
                  film.setMode({ kind: 'year', year: r.year }, true);
                  // En celular la película está arriba del mismo panel: subir para verla
                  if (!window.matchMedia('(min-width: 900px)').matches) {
                    e.currentTarget.closest('.results')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="stripes__axis" aria-hidden="true">
        <span>{first}</span>
        <span>{middle}</span>
        <span>{last}</span>
      </div>
      <div className="stripes__legend">
        <span>
          <i className="sw" style={{ backgroundColor: yieldColor(1) }} /> {t(locale, 'stripes.good')}
        </span>
        <span>
          <i className="sw sw--hatch" style={{ backgroundColor: yieldColor(0.7) }} /> {t(locale, 'stripes.bad')}
        </span>
        <span>
          <i className="dot is-el_nino" /> {t(locale, 'stripes.el_nino')}
        </span>
        <span>
          <i className="dot is-la_nina" /> {t(locale, 'stripes.la_nina')}
        </span>
      </div>
    </section>
  );
}
