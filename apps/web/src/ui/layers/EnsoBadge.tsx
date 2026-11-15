// SI-assisted (Claude Code); reviewed by <name>
import { useState } from 'react';
import type { FormatContext } from '../../domain/format';
import type { EnsoOverview, EnsoState } from '../../domain/report';
import { DRY, WET } from '../../domain/season';
import { type Locale, numberLocale, t } from '../../i18n';
import { Icon } from '../common/Icon';
import { dateFormat, numberFormat } from '../../domain/intl';

const SEASONS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];

/** «ASO 2026» → «ago–oct 2026». */
export function periodLabel(period: string, locale: Locale): string {
  const [code, year] = period.split(' ');
  const i = SEASONS.indexOf(code ?? '');
  if (i < 0) return period;
  const month = (m: number) =>
    dateFormat(numberLocale(locale), { month: 'short' }).format(new Date(2001, m, 1)).replace('.', '');
  return `${month((i + 11) % 12)}–${month((i + 1) % 12)} ${year}`;
}

export function strengthOf(value: number): 'weak' | 'moderate' | 'strong' {
  const v = Math.abs(value);
  return v >= 1.5 ? 'strong' : v >= 1 ? 'moderate' : 'weak';
}

/** Anomalía de temperatura (diferencia, no temperatura): °C o °F, con signo. */
function anomaly(c: number, ctx: FormatContext): string {
  const v = ctx.units === 'metric' ? c : c * 1.8;
  const n = numberFormat(numberLocale(ctx.locale), { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(v));
  return `${v >= 0 ? '+' : '−'}${n} ${ctx.units === 'metric' ? '°C' : '°F'}`;
}

const barColor = (s: EnsoState) => (s.phase === 'el_nino' ? DRY : s.phase === 'la_nina' ? WET : '#a1a1aa');

function OniBars({ recent }: { recent: EnsoState[] }) {
  const w = 260;
  const h = 64;
  const max = Math.max(2.5, ...recent.map((s) => Math.abs(s.value)));
  const y = (v: number) => h / 2 - (v / max) * (h / 2 - 2);
  const bw = w / recent.length;
  return (
    <svg className="oni" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {[0.5, -0.5].map((v) => (
        <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke="#a1a1aa" strokeDasharray="3 3" strokeWidth={1} />
      ))}
      {recent.map((s, i) => {
        const top = Math.min(y(s.value), y(0));
        const last = i === recent.length - 1;
        return (
          <rect
            key={s.period}
            x={i * bw + 1}
            y={top}
            width={Math.max(bw - 2, 1)}
            height={Math.max(Math.abs(y(s.value) - y(0)), 1)}
            fill={barColor(s)}
            stroke={last ? '#111113' : 'none'}
            strokeWidth={last ? 1.5 : 0}
          />
        );
      })}
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="#111113" strokeWidth={1} />
    </svg>
  );
}

/** El Niño / La Niña ahora (NOAA ONI), en el globo: una píldora que se abre con la serie reciente. */
export function EnsoBadge({ enso, ctx, onShowSea }: { enso: EnsoOverview; ctx: FormatContext; onShowSea: () => void }) {
  const [open, setOpen] = useState(false);
  const { locale } = ctx;
  const { current, recent } = enso;
  const neutral = current.phase === 'neutral';
  const name = neutral
    ? t(locale, 'live.enso.neutral')
    : t(locale, 'live.enso.phase', {
        phase: t(locale, `enso.${current.phase}`),
        strength: t(locale, `enso.strength.${strengthOf(current.value)}`),
      });
  const first = recent[0];

  return (
    <div className={`enso${open ? ' is-open' : ''}`}>
      <button type="button" className="enso__pill" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="enso__dot" style={{ background: barColor(current) }} aria-hidden="true" />
        <b>{name}</b>
        <span className="enso__value">{anomaly(current.value, ctx)}</span>
        <Icon name={open ? 'close' : 'info'} size={16} />
      </button>
      {open && (
        <div className="enso__panel glass">
          <p>
            {t(locale, neutral ? 'live.enso.text_neutral' : 'live.enso.text', {
              anomaly: anomaly(current.value, ctx),
              period: periodLabel(current.period, locale),
            })}
          </p>
          {recent.length > 1 && (
            <figure>
              <OniBars recent={recent} />
              <figcaption>
                <span>{first ? periodLabel(first.period, locale) : ''}</span>
                <span>{t(locale, 'live.enso.axis')}</span>
                <span>{periodLabel(current.period, locale)}</span>
              </figcaption>
            </figure>
          )}
          <p className="muted">{t(locale, 'live.enso.field')}</p>
          <button type="button" className="btn btn--ghost" onClick={onShowSea}>
            <Icon name="globe" size={18} /> {t(locale, 'live.enso.show_sea')}
          </button>
          <span className="enso__source">{t(locale, 'live.enso.source')}</span>
        </div>
      )}
    </div>
  );
}
