import { type KeyboardEvent, type PointerEvent, useMemo, useRef } from 'react';
import type { Film } from '../../application/useFilm';
import { shortDate } from '../../domain/format';
import type { FieldReport, SeasonRun, Stage } from '../../domain/report';
import { RISK_COLOR, filmDate, hasPhase, positionOf, stageAt, waterColor } from '../../domain/season';
import { type Locale, t } from '../../i18n';
import { Icon, type IconName } from '../common/Icon';
import { SoilGauge } from './SoilGauge';

const STAGE_ICONS: Partial<Record<Stage, IconName>> = {
  sowing: 'seed',
  vegetative: 'leaf',
  flowering: 'tassel',
  grain_fill: 'grain',
  harvest: 'tractor',
};

const W = 1000;
const H = 64;
const HEAT_C = 35;

function waterPath(run: SeasonRun): string {
  const n = Math.max(run.water_pct.length - 1, 1);
  const pts = run.water_pct.map((v, i) => `${((i / n) * W).toFixed(1)},${(H - 6 - (v / 100) * (H - 18)).toFixed(1)}`);
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
}

/** Película de la campaña (RF-31): ▶ día a día, cursor, etapas y tramos de riesgo. */
export function SeasonFilm({ film, report, locale }: { film: Film; report: FieldReport; locale: Locale }) {
  const { run, day, length } = film;
  const track = useRef<HTMLDivElement>(null);

  const gradientStops = useMemo(() => {
    if (!run) return [];
    const n = run.water_pct.length;
    const step = Math.max(1, Math.floor(n / 24));
    const stops: { offset: number; color: string }[] = [];
    for (let i = 0; i < n; i += step) stops.push({ offset: i / Math.max(n - 1, 1), color: waterColor(run.water_pct[i]!) });
    return stops;
  }, [run]);

  if (!run || length === 0) return null;

  const fraction = day / Math.max(length - 1, 1);
  const water = run.water_pct[day] ?? 0;
  const stage = stageAt(run, day);
  const date = filmDate(run, day);
  const observed = run.observed_days > 0 ? Math.min(run.observed_days, length) : 0;

  const seek = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    film.setPlaying(false);
    film.setDay(((clientX - box.left) / box.width) * (length - 1));
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId);
    if (e.type === 'pointerdown' || e.buttons === 1) seek(e.clientX);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, PageDown: -7, PageUp: 7 }[e.key];
    if (delta) {
      e.preventDefault();
      film.setPlaying(false);
      film.setDay(day + delta);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      film.toggle();
    }
  };

  const modes: { kind: 'typical' | 'el_nino' | 'la_nina'; key: string; ok: boolean }[] = [
    { kind: 'typical', key: 'film.typical', ok: true },
    { kind: 'el_nino', key: 'film.el_nino', ok: hasPhase(report, 'el_nino') },
    { kind: 'la_nina', key: 'film.la_nina', ok: hasPhase(report, 'la_nina') },
  ];

  return (
    <section className="film glass" aria-labelledby="film-title">
      <header className="film__head">
        <button
          type="button"
          className="playbtn"
          onClick={film.toggle}
          aria-label={t(locale, film.playing ? 'film.pause' : 'film.play')}
        >
          <Icon name={film.playing ? 'pause' : 'play'} size={20} />
        </button>
        <div className="film__titles">
          <h2 id="film-title">{t(locale, 'film.title')}</h2>
          <span className="film__date">
            <b>{shortDate(date, locale)}</b> · {t(locale, stage === 'before' ? 'stage.before' : `stage.${stage}`)}
            {film.mode.kind !== 'year' && <span className="muted"> · {t(locale, 'film.based_on', { year: run.year })}</span>}
          </span>
        </div>
        <div className="chips chips--small" role="radiogroup" aria-label={t(locale, 'film.view')}>
          {modes.map((m) => (
            <button
              key={m.kind}
              type="button"
              role="radio"
              aria-checked={film.mode.kind === m.kind}
              disabled={!m.ok}
              className={`chip${film.mode.kind === m.kind ? ' is-on' : ''}`}
              onClick={() => film.setMode({ kind: m.kind }, true)}
            >
              {t(locale, m.key)}
            </button>
          ))}
          {film.mode.kind === 'year' && (
            <button type="button" role="radio" aria-checked className="chip is-on">
              {t(locale, 'film.year', { year: film.mode.year })}
            </button>
          )}
        </div>
      </header>

      <div className="film__body">
        <div className="film__trackwrap">
          <div className="film__stages" aria-hidden="true">
            {run.stages
              .filter((s) => STAGE_ICONS[s.stage])
              .map((s) => {
                const mid = s.stage === 'flowering' ? (positionOf(run, s.start) + positionOf(run, s.end)) / 2 : positionOf(run, s.start);
                return (
                  <span
                    key={s.stage}
                    className={`film__stage${stage === s.stage ? ' is-now' : ''}`}
                    style={{ left: `${mid * 100}%` }}
                    title={t(locale, `stage.${s.stage}`)}
                  >
                    <Icon name={STAGE_ICONS[s.stage]!} size={18} />
                  </span>
                );
              })}
          </div>
          <div
            ref={track}
            className="film__track"
            role="slider"
            tabIndex={0}
            aria-label={t(locale, 'film.scrub')}
            aria-valuemin={0}
            aria-valuemax={length - 1}
            aria-valuenow={day}
            aria-valuetext={`${shortDate(date, locale)} · ${water} %`}
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onKeyDown={onKey}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="waterGrad" x1="0" x2="1" y1="0" y2="0">
                  {gradientStops.map((s) => (
                    <stop key={s.offset} offset={s.offset} stopColor={s.color} />
                  ))}
                </linearGradient>
                <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="8" height="8" fill="rgba(5,12,24,0.35)" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                </pattern>
              </defs>
              <path d={waterPath(run)} fill="url(#waterGrad)" opacity="0.85" />
              {report.timeline.risk_bands.map((b) => {
                const x0 = positionOf(run, b.start) * W;
                const x1 = positionOf(run, b.end) * W;
                return <rect key={`${b.indicator}-${b.start}`} x={x0} y={0} width={Math.max(x1 - x0, 4)} height={7} rx={2} fill={RISK_COLOR[b.risk]} />;
              })}
              {run.tmax_c.map((tc, i) =>
                tc >= HEAT_C ? <rect key={i} x={(i / Math.max(length - 1, 1)) * W - 1.5} y={H - 5} width={3} height={5} fill="#ff6b3d" /> : null,
              )}
              {observed > 0 && observed < length && (
                <>
                  <rect x={(observed / (length - 1)) * W} y={0} width={W - (observed / (length - 1)) * W} height={H} fill="url(#hatch)" />
                  <line x1={(observed / (length - 1)) * W} x2={(observed / (length - 1)) * W} y1={0} y2={H} stroke="#fff" strokeWidth={2} strokeDasharray="4 3" />
                </>
              )}
            </svg>
            {observed > 0 && observed < length && (
              <span className="film__today" style={{ left: `${(observed / (length - 1)) * 100}%` }}>
                {t(locale, 'film.today')}
              </span>
            )}
            <span className="film__cursor" style={{ left: `${fraction * 100}%` }} aria-hidden="true">
              <span className="film__cursor-dot" style={{ background: waterColor(water) }} />
            </span>
          </div>
          <div className="film__legend" aria-hidden="true">
            <span>
              <i style={{ background: 'linear-gradient(90deg,#d64545,#f2b632,#2f80ed)' }} /> {t(locale, 'film.legend')}
            </span>
            <span>
              <i style={{ background: '#ff6b3d' }} /> {t(locale, 'film.heat_tick')}
            </span>
          </div>
        </div>
        <SoilGauge pct={water} locale={locale} />
      </div>
    </section>
  );
}
