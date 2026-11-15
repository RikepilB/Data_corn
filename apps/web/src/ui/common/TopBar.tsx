import type { UnitSystem } from '../../domain/units';
import { type Locale, t } from '../../i18n';
import { DisplayMenu } from './DisplayMenu';

interface Props {
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

export function TopBar({ locale, units, onLocale, onUnits, onHome }: Props) {
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome} title={t(locale, 'results.restart')}>
        Data Corn
      </button>
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
        <DisplayMenu locale={locale} />
      </div>
    </header>
  );
}
