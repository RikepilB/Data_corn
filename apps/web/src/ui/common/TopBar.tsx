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
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome}>
        Data Corn
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
