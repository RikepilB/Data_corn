// SI-assisted (Claude Code); reviewed by <name>
// Medidores de la película (docs/plan-probabilidad-bateria-naip.md): la probabilidad de buena cosecha,
// con su línea como en las transmisiones deportivas, y la batería de agua, como la autonomía de un auto
// eléctrico.
import { useId, useMemo } from 'react';
import { BATTERY_MAX_DAYS, batteryLevel } from '../../domain/outlook';
import { type Locale, t } from '../../i18n';

const SPARK_TOP = 2;
const SPARK_BOTTOM = 28;
const sparkY = (v: number) => SPARK_BOTTOM - (Math.max(0, Math.min(100, v)) / 100) * (SPARK_BOTTOM - SPARK_TOP);

function sparkPaths(odds: number[]) {
  const n = Math.max(odds.length - 1, 1);
  const pts = odds.map((v, i) => `${((i / n) * 100).toFixed(2)},${sparkY(v).toFixed(2)}`).join(' L');
  return { line: `M${pts}`, area: `M0,${SPARK_BOTTOM} L${pts} L100,${SPARK_BOTTOM} Z` };
}

/** Probabilidad de buena cosecha del día, con la línea del año hasta el cursor y la marca del 50 %. */
export function OddsMeter({ odds, day, locale }: { odds: number[]; day: number; locale: Locale }) {
  // El id de React lleva signos que no valen en url(#…): se dejan solo letras y números
  const clip = `odds${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const paths = useMemo(() => sparkPaths(odds), [odds]);
  if (odds.length === 0) return null;
  const i = Math.max(0, Math.min(day, odds.length - 1));
  const value = Math.round(odds[i]!);
  const delta = value - Math.round(odds[0]!);
  const frac = odds.length > 1 ? i / (odds.length - 1) : 1;
  const sub =
    delta > 0
      ? t(locale, 'film.odds_up', { pts: delta })
      : delta < 0
        ? t(locale, 'film.odds_down', { pts: -delta })
        : t(locale, 'film.odds_flat');
  return (
    <div
      className="odds"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={t(locale, 'film.odds')}
      title={t(locale, 'film.odds_help')}
    >
      <span className="odds__label">{t(locale, 'film.odds')}</span>
      <b className="odds__value">{value} %</b>
      <span className="odds__spark" aria-hidden="true">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none">
          <defs>
            <clipPath id={clip}>
              <rect x={0} y={0} width={frac * 100} height={30} />
            </clipPath>
          </defs>
          <line x1={0} x2={100} y1={sparkY(50)} y2={sparkY(50)} className="odds__mid" vectorEffect="non-scaling-stroke" />
          <g clipPath={`url(#${clip})`}>
            <path d={paths.area} className="odds__area" />
            <path d={paths.line} className="odds__line" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <i className="odds__dot" style={{ left: `${frac * 100}%`, top: `${(sparkY(value) / 30) * 100}%` }} />
      </span>
      <span className="odds__sub">{sub}</span>
    </div>
  );
}

/** Batería de agua: carga = agua por encima del umbral de estrés; texto = días que aguanta sin lluvia. */
export function WaterBattery({
  days,
  charge,
  locale,
}: {
  days: number | null | undefined;
  charge: number;
  locale: Locale;
}) {
  const level = days == null ? 'none' : batteryLevel(days);
  const text =
    days == null
      ? '—'
      : days >= BATTERY_MAX_DAYS
        ? t(locale, 'film.battery_max')
        : t(locale, 'film.battery_days', { days: Math.max(0, Math.round(days)) });
  return (
    <div className={`battery battery--${level}`} title={t(locale, 'film.battery_help')}>
      <span className="battery__label">{t(locale, 'film.battery')}</span>
      <span className="battery__row">
        <span className="battery__cell" aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(1, charge)) * 100}%` }} />
        </span>
        <b className="battery__value">{text}</b>
      </span>
      {days != null && days <= 0 && <span className="battery__sub">{t(locale, 'film.battery_stress')}</span>}
    </div>
  );
}
