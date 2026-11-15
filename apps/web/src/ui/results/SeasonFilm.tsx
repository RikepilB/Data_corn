import { type KeyboardEvent, type PointerEvent, memo, useMemo, useRef } from 'react';
import type { Film } from '../../application/useFilm';
import {
  type FilmEvent,
  HEAT_C,
  activeEvent,
  monthTicks,
  stressPct,
  waterBand,
  yieldAt,
} from '../../domain/film';
import { type FormatContext, shortDate } from '../../domain/format';
import type { FieldReport, SeasonRun, Stage } from '../../domain/report';
import { SEVERITY, filmDate, hasPhase, positionOf, stageAt } from '../../domain/season';
import { depth, format, temperature } from '../../domain/units';
import { type Locale, numberLocale, t } from '../../i18n';
import { Icon, type IconName } from '../common/Icon';
import { motionAllowed } from '../common/displayPrefs';
import { DRY, RISK_COLOR, WET, yieldColor } from '../common/palette';
import { SoilGauge } from './SoilGauge';
import { dateFormat } from '../../domain/intl';

const STAGE_ICONS: Partial<Record<Stage, IconName>> = {
  sowing: 'seed',
  vegetative: 'leaf',
  flowering: 'tassel',
  grain_fill: 'grain',
  harvest: 'tractor',
};

const EVENT_ICONS: Record<FilmEvent['kind'], IconName> = {
  stage_loss: 'alert',
  stress_start: 'drop',
  heat_wave: 'thermo',
  heavy_rain: 'waves',
  irrigation_start: 'sprinkler',
};

// Geometría del gráfico (unidades del viewBox; el SVG se estira al ancho del contenedor)
const W = 1000;
const H = 132;
const RISK_Y = 0;
const HEAT_Y = 7;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 100;
const RAIN_TOP = 106;
const RAIN_MAX_MM = 50;
const INK = '#111113';

const yWater = (v: number) => PLOT_BOTTOM - (Math.max(0, Math.min(100, v)) / 100) * (PLOT_BOTTOM - PLOT_TOP);
const pctY = (y: number) => `${(y / H) * 100}%`;

function line(values: number[], n: number): string {
  const d = Math.max(n - 1, 1);
  return values.map((v, i) => `${((i / d) * W).toFixed(1)},${yWater(v).toFixed(1)}`).join(' L');
}

/** Área entre el umbral de estrés y el agua, solo donde el agua está por debajo. */
function stressArea(water: number[], threshold: number): string {
  const d = Math.max(water.length - 1, 1);
  const ys = yWater(threshold);
  const top = water.map((v, i) => `${((i / d) * W).toFixed(1)},${Math.max(yWater(v), ys).toFixed(1)}`);
  return `M0,${ys} L${top.join(' L')} L${W},${ys} Z`;
}

export function eventText(e: FilmEvent, ctx: FormatContext): string {
  const { locale, units } = ctx;
  const lang = numberLocale(locale);
  switch (e.kind) {
    case 'stage_loss':
      return t(locale, `film.event.loss.${e.stage}`, { loss: e.loss ?? 0 });
    case 'heat_wave':
      return t(locale, 'film.event.heat_wave', {
        days: e.days ?? 0,
        temp: format(temperature(HEAT_C, units), lang, 0),
        max: format(temperature(e.max_c ?? HEAT_C, units), lang, 0),
      });
    case 'heavy_rain':
      return t(locale, 'film.event.heavy_rain', { rain: format(depth(e.mm ?? 0, units), lang, units === 'metric' ? 0 : 1) });
    default:
      return t(locale, `film.event.${e.kind}`);
  }
}

const monthLabel = (iso: string, locale: Locale) =>
  dateFormat(numberLocale(locale), { month: 'short' }).format(new Date(`${iso}T00:00:00`));

/** Película de la campaña (RF-31): agua del año contra el rango de 25 años, lluvia, estrés y rendimiento. */
export function SeasonFilm({ film, report, ctx }: { film: Film; report: FieldReport; ctx: FormatContext }) {
  const { run, day, length, events } = film;
  const { locale } = ctx;
  const track = useRef<HTMLDivElement>(null);
  const runs = report.runs ?? [];

  const worst = useMemo(
    () => (runs.length ? runs.reduce((a, b) => (b.relative_yield < a.relative_yield ? b : a)) : null),
    [runs],
  );
  const shapes = useMemo(() => (run ? drawRun(run, runs) : null), [run, runs]);
  const ticks = useMemo(
    () => (run ? monthTicks(run).map((m) => ({ ...m, label: monthLabel(m.iso, locale) })) : []),
    [run, locale],
  );
  // Textos de los momentos clave: se arman una vez por año, no en cada cuadro
  const labels = useMemo(
    () =>
      run
        ? events.map((e) => ({ text: eventText(e, ctx), date: shortDate(filmDate(run, e.day), locale) }))
        : [],
    [events, run, ctx, locale],
  );

  if (!run || !shapes || length === 0) return null;

  const n = Math.max(length - 1, 1);
  const fraction = day / n;
  const water = run.water_pct[day] ?? 0;
  const stage = stageAt(run, day);
  const date = filmDate(run, day);
  const observed = run.observed_days > 0 ? Math.min(run.observed_days, length) : 0;
  const threshold = stressPct(run);
  const yieldNow = yieldAt(run, day);
  const yieldFinal = Math.round(100 * run.relative_yield);
  const shown = yieldNow ?? yieldFinal;
  const active = activeEvent(events, day);
  const phase = run.enso_phase && run.enso_phase !== 'neutral' ? ` · ${t(locale, `enso.${run.enso_phase}`)}` : '';

  const seek = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    film.setPlaying(false);
    film.setDay(((clientX - box.left) / box.width) * n);
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.film__event')) return;
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

  const mode = film.mode;
  const isWorst = mode.kind === 'year' && worst != null && mode.year === worst.year;
  const chips: { key: string; label: string; on: boolean; ok: boolean; pick: () => void }[] = [
    { key: 'typical', label: t(locale, 'film.typical'), on: mode.kind === 'typical', ok: true, pick: () => film.setMode({ kind: 'typical' }, motionAllowed()) },
    {
      key: 'worst',
      label: worst ? t(locale, 'film.worst', { year: worst.year }) : t(locale, 'film.worst_short'),
      on: isWorst,
      ok: worst != null,
      pick: () => worst && film.setMode({ kind: 'year', year: worst.year }, motionAllowed()),
    },
    { key: 'el_nino', label: t(locale, 'film.el_nino'), on: mode.kind === 'el_nino', ok: hasPhase(report, 'el_nino'), pick: () => film.setMode({ kind: 'el_nino' }, motionAllowed()) },
    { key: 'la_nina', label: t(locale, 'film.la_nina'), on: mode.kind === 'la_nina', ok: hasPhase(report, 'la_nina'), pick: () => film.setMode({ kind: 'la_nina' }, motionAllowed()) },
  ];

  const summary = events.length
    ? t(locale, 'film.summary', { year: run.year, yield: yieldFinal, count: events.length })
    : t(locale, 'film.summary_quiet', { year: run.year, yield: yieldFinal });

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
            <span className="muted">
              {' '}
              · {mode.kind === 'year' ? t(locale, 'film.year', { year: run.year }) : t(locale, 'film.based_on', { year: run.year })}
              {phase}
            </span>
          </span>
        </div>
        <div className="film__modes">
          <div className="chips chips--small" role="radiogroup" aria-label={t(locale, 'film.view')}>
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={c.on}
                disabled={!c.ok}
                className={`chip${c.on ? ' is-on' : ''}`}
                onClick={c.pick}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="film__select">
            <span className="sr-only">{t(locale, 'film.pick_year')}</span>
            <select
              value={mode.kind === 'year' && !isWorst ? String(mode.year) : ''}
              onChange={(e) => e.target.value && film.setMode({ kind: 'year', year: Number(e.target.value) }, motionAllowed())}
            >
              <option value="">{t(locale, 'film.pick_year')}</option>
              {[...runs]
                .sort((a, b) => b.year - a.year)
                .map((r) => (
                  <option key={r.year} value={r.year}>
                    {r.year} · {Math.round(100 * r.relative_yield)} %
                    {r.enso_phase && r.enso_phase !== 'neutral' ? ` · ${t(locale, `enso.${r.enso_phase}`)}` : ''}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </header>

      <div className="film__body">
        <div className="film__chart">
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
                    <Icon name={STAGE_ICONS[s.stage]!} size={16} />
                    <small>{t(locale, `stage.${s.stage}`)}</small>
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
            aria-valuetext={`${shortDate(date, locale)} · ${water} % · ${t(locale, 'film.yield')} ${Math.round(shown)} %`}
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onKeyDown={onKey}
          >
            <FilmPlot run={run} shapes={shapes} bands={report.timeline.risk_bands} threshold={threshold} observed={observed} />
            <span className="film__axis film__axis--top" style={{ top: pctY(PLOT_TOP) }}>100 %</span>
            <span className="film__thr" style={{ top: pctY(yWater(threshold)) }}>
              {t(locale, 'film.threshold', { pct: threshold })}
            </span>
            <span className="film__axis film__axis--rain" style={{ top: pctY(RAIN_TOP) }}>{t(locale, 'film.rain_axis')}</span>
            {observed > 0 && observed < length && (
              <span className="film__today" style={{ left: `${(observed / n) * 100}%` }}>
                {t(locale, 'film.today')}
              </span>
            )}
            {events.map((e, k) => (
              <button
                key={`${e.kind}-${e.day}`}
                type="button"
                className={`film__event${active === e ? ' is-on' : ''}`}
                style={{ left: `${(e.day / n) * 100}%`, top: pctY(PLOT_BOTTOM) }}
                title={labels[k]?.text}
                aria-label={`${labels[k]?.date}: ${labels[k]?.text}`}
                onClick={() => {
                  film.setPlaying(false);
                  film.setDay(e.day);
                }}
              >
                {k + 1}
              </button>
            ))}
            <span className="film__cursor" style={{ left: `${fraction * 100}%` }} aria-hidden="true">
              <span className="film__cursor-dot" style={{ top: pctY(yWater(water)) }} />
            </span>
          </div>
          <div className="film__months" aria-hidden="true">
            {ticks.map((m) => (
              <span key={m.iso} style={{ left: `${(m.day / n) * 100}%` }}>
                {m.label}
              </span>
            ))}
          </div>
          <p className={`film__caption${active ? ' is-event' : ''}`} aria-live="polite">
            {active ? (
              <>
                <Icon name={EVENT_ICONS[active.kind]} size={16} />
                <b>{events.indexOf(active) + 1}</b>
                <span>
                  <b>{labels[events.indexOf(active)]?.date}</b> · {labels[events.indexOf(active)]?.text}
                </span>
              </>
            ) : (
              <span>{summary}</span>
            )}
          </p>
          <div className="film__legend" aria-hidden="true">
            <span>
              <i className="is-line" /> {t(locale, 'film.legend.water', { year: run.year })}
            </span>
            {shapes.band && (
              <span>
                <i className="is-band" /> {t(locale, 'film.legend.range', { years: runs.length })}
              </span>
            )}
            <span>
              <i className="is-stress" /> {t(locale, 'film.legend.stress')}
            </span>
            {shapes.rain.length > 0 && (
              <span>
                <i className="is-rain" /> {t(locale, 'film.legend.rain')}
              </span>
            )}
            {shapes.irrigation.length > 0 && (
              <span>
                <i className="is-irrigation" /> {t(locale, 'film.legend.irrigation')}
              </span>
            )}
            <span>
              <i className="is-tick" /> {t(locale, 'film.heat_tick')}
            </span>
          </div>
        </div>
        <div className="film__stats">
          <YieldMeter value={shown} final={yieldFinal} live={yieldNow != null} locale={locale} />
          <SoilGauge pct={water} locale={locale} />
        </div>
      </div>
    </section>
  );
}

type Shapes = ReturnType<typeof drawRun>;
type RiskBand = FieldReport['timeline']['risk_bands'][number];

/** La parte fija del gráfico: solo cambia con el año, no con cada día (la película va a 60 fps). */
const FilmPlot = memo(function FilmPlot({
  run,
  shapes,
  bands,
  threshold,
  observed,
}: {
  run: SeasonRun;
  shapes: Shapes;
  bands: RiskBand[];
  threshold: number;
  observed: number;
}) {
  const len = run.water_pct.length;
  const n = Math.max(len - 1, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1.2" />
        </pattern>
        {/* no depender del color: el riesgo alto es más alto y lleva rayas, el medio es más bajo y liso */}
        <pattern id="riskHigh" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={INK} strokeWidth="1.6" />
        </pattern>
      </defs>
      <rect x={0} y={PLOT_TOP} width={W} height={PLOT_BOTTOM - PLOT_TOP} fill="#f4f4f5" />
      {shapes.band && <path d={shapes.band} fill="#8a8a8f" opacity={0.26} />}
      <path d={shapes.area} fill={WET} opacity={0.14} />
      <path d={stressArea(run.water_pct, threshold)} fill={DRY} opacity={0.55} />
      <line
        x1={0}
        x2={W}
        y1={yWater(threshold)}
        y2={yWater(threshold)}
        stroke={INK}
        strokeWidth={1}
        strokeDasharray="5 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={shapes.line} fill="none" stroke={WET} strokeWidth={2.25} vectorEffect="non-scaling-stroke" />
      {/* el riesgo más grave se dibuja encima */}
      {[...bands].sort((x, y) => SEVERITY[x.risk] - SEVERITY[y.risk]).map((b) => {
        const x0 = positionOf(run, b.start) * W;
        const x1 = positionOf(run, b.end) * W;
        const h = b.risk === 'high' ? 6 : 4;
        const w = Math.max(x1 - x0, 4);
        return (
          <g key={`${b.indicator}-${b.start}`}>
            <rect x={x0} y={RISK_Y} width={w} height={h} fill={RISK_COLOR[b.risk]} />
            {b.risk === 'high' && <rect x={x0} y={RISK_Y} width={w} height={h} fill="url(#riskHigh)" />}
          </g>
        );
      })}
      {run.tmax_c.map((tc, i) =>
        tc >= HEAT_C ? <rect key={i} x={(i / n) * W - 1.5} y={HEAT_Y} width={3} height={7} fill={RISK_COLOR.high} /> : null,
      )}
      <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="#d4d4d8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {shapes.rain.map((r) => (
        <rect key={`r${r.i}`} x={r.x} y={r.y} width={shapes.barW} height={r.h} fill={WET} />
      ))}
      {shapes.irrigation.map((r) => (
        <rect key={`i${r.i}`} x={r.x} y={r.y} width={shapes.barW} height={r.h} fill={INK} opacity={0.75} />
      ))}
      {observed > 0 && observed < len && (
        <>
          <rect x={(observed / n) * W} y={PLOT_TOP} width={W - (observed / n) * W} height={PLOT_BOTTOM - PLOT_TOP} fill="url(#hatch)" opacity={0.14} />
          <line x1={(observed / n) * W} x2={(observed / n) * W} y1={0} y2={H} stroke={INK} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
});

function YieldMeter({ value, final, live, locale }: { value: number; final: number; live: boolean; locale: Locale }) {
  const v = Math.max(0, Math.min(100, value));
  const loss = Math.round(100 - v);
  return (
    <div className="ymeter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={t(locale, 'film.yield')}>
      <span className="ymeter__label">{t(locale, live ? 'film.yield' : 'film.yield_final')}</span>
      <b className="ymeter__value">{Math.round(v)} %</b>
      <span className="ymeter__bar" aria-hidden="true">
        <i style={{ width: `${v}%`, background: yieldColor(v / 100) }} />
      </span>
      <span className="ymeter__sub">
        {loss > 0 ? t(locale, 'film.yield_loss', { loss }) : t(locale, 'film.yield_none')}
        {live && final < Math.round(v) ? ` · ${t(locale, 'film.yield_end', { final })}` : ''}
      </span>
    </div>
  );
}

function drawRun(run: SeasonRun, runs: SeasonRun[]) {
  const len = run.water_pct.length;
  const d = Math.max(len - 1, 1);
  const pts = line(run.water_pct, len);
  const band = runs.length >= 5 ? waterBand(runs, len) : null;
  let bandPath: string | null = null;
  if (band && band.hi.length > 1) {
    const hi = band.hi.map((v, i) => `${((i / d) * W).toFixed(1)},${yWater(v).toFixed(1)}`);
    const lo = band.lo.map((v, i) => `${((i / d) * W).toFixed(1)},${yWater(v).toFixed(1)}`).reverse();
    bandPath = `M${hi.join(' L')} L${lo.join(' L')} Z`;
  }
  const barW = Math.max((W / len) * 0.75, 2);
  const bar = (mm: number) => (Math.min(mm, RAIN_MAX_MM) / RAIN_MAX_MM) * (H - RAIN_TOP);
  const rain = (run.rain_mm ?? [])
    .map((mm, i) => ({ i, mm }))
    .filter((r) => r.mm >= 0.5)
    .map((r) => ({ i: r.i, x: (r.i / d) * W - barW / 2, h: Math.max(bar(r.mm), 1.5), y: H - Math.max(bar(r.mm), 1.5) }));
  const irrigation = (run.irrigation_mm ?? [])
    .map((mm, i) => ({ i, mm, base: run.rain_mm?.[i] ?? 0 }))
    .filter((r) => r.mm > 0)
    .map((r) => {
      const h = Math.max(bar(r.mm), 1.5);
      const below = r.base >= 0.5 ? Math.max(bar(r.base), 1.5) : 0;
      return { i: r.i, x: (r.i / d) * W - barW / 2, h, y: Math.max(RAIN_TOP, H - below - h) };
    });
  return {
    line: `M${pts}`,
    area: `M0,${PLOT_BOTTOM} L${pts} L${W},${PLOT_BOTTOM} Z`,
    band: bandPath,
    rain,
    irrigation,
    barW,
  };
}
