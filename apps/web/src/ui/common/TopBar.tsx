import { STEPS, type Step } from '../../application/useDataCorn';
import type { UnitSystem } from '../../domain/units';
import { type Locale, t } from '../../i18n';

interface Props {
  step: Step;
  locale: Locale;
  units: UnitSystem;
  onLocale: (l: Locale) => void;
  onUnits: (u: UnitSystem) => void;
  onHome: () => void;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ step, locale, units, onLocale, onUnits, onHome }: Props) {
  const index = STEPS.indexOf(step);
  return (
    <header className="topbar glass">
      <button type="button" className="brand" onClick={onHome} aria-label="Data Corn">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="17" rx="7" ry="10.5" fill="#F2B632" />
          <path d="M16 6.5v21M10.4 12h11.2M9.4 17h13.2M10.4 22h11.2" stroke="#9a6a00" strokeWidth="1.3" />
          <path d="M9 26c-3-3-4-8-2-13M23 26c3-3 4-8 2-13" stroke="#3fbf9b" strokeWidth="2" fill="none" />
        </svg>
        <span>
          Data<b>Corn</b>
        </span>
      </button>
      <ol
        className="stepdots"
        aria-label={t(locale, 'step.progress', { n: index + 1, name: t(locale, `step.${step}`) })}
      >
        {STEPS.map((s, i) => (
          <li key={s} className={i < index ? 'done' : i === index ? 'now' : ''} title={t(locale, `step.${s}`)} />
        ))}
      </ol>
      <div className="topbar__tools">
        <Segmented
          label={t(locale, 'top.lang')}
          value={locale}
          options={[
            { value: 'es', text: 'ES' },
            { value: 'en', text: 'EN' },
          ]}
          onChange={onLocale}
        />
        <Segmented
          label={t(locale, 'top.units')}
          value={units}
          options={[
            { value: 'imperial', text: 'in' },
            { value: 'metric', text: 'mm' },
          ]}
          onChange={onUnits}
        />
      </div>
    </header>
  );
}
