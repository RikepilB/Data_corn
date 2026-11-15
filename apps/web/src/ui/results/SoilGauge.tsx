import { waterColor } from '../../domain/season';
import { type Locale, t } from '../../i18n';

/** Medidor circular del agua disponible en la zona de raíces. */
export function SoilGauge({ pct, locale }: { pct: number; locale: Locale }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={t(locale, 'gauge.label')}>
      <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden="true">
        <circle cx="33" cy="33" r={r} stroke="#e4e4e7" strokeWidth="6" fill="none" />
        <circle
          cx="33"
          cy="33"
          r={r}
          stroke={waterColor(v)}
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform="rotate(-90 33 33)"
        />
        <text x="33" y="38" textAnchor="middle" fontSize="15" fontWeight="600" fill="#111113">
          {Math.round(v)}%
        </text>
      </svg>
      <span className="gauge__label">{t(locale, 'gauge.label')}</span>
    </div>
  );
}
