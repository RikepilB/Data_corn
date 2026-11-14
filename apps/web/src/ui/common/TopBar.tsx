import type { UnitSystem } from '../../domain/units';
import { type Locale, t } from '../../i18n';

interface Props {
  locale: Locale;
  units: UnitSystem;
  season: number;
  seasons: number[];
  onLocale: (l: Locale) => void;
  onUnits: (u: UnitSystem) => void;
  onSeason: (s: number) => void;
}

export function TopBar({ locale, units, season, seasons, onLocale, onUnits, onSeason }: Props) {
  return (
    <header className="dc-topbar">
      <span className="dc-topbar__brand">Data Corn</span>
      <label>
        {t(locale, 'topbar.season')}{' '}
        <select value={season} onChange={(e) => onSeason(Number(e.target.value))}>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t(locale, 'topbar.language')}{' '}
        <select value={locale} onChange={(e) => onLocale(e.target.value as Locale)}>
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </label>
      <label>
        {t(locale, 'topbar.units')}{' '}
        <select value={units} onChange={(e) => onUnits(e.target.value as UnitSystem)}>
          <option value="imperial">{t(locale, 'units.imperial')}</option>
          <option value="metric">{t(locale, 'units.metric')}</option>
        </select>
      </label>
    </header>
  );
}
