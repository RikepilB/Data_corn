import { useState } from 'react';
import { type Locale, t } from '../../i18n';
import { type Place, searchPlaces } from '../../infrastructure/geocode';
import { Icon } from '../common/Icon';

interface Props {
  locale: Locale;
  locating: boolean;
  denied: boolean;
  onLocate: () => void;
  onPlace: (p: Place) => void;
  onSample: () => void;
  onAbout: () => void;
}

/** Paso 1 · El globo: ir a mi ubicación, buscar o ver un ejemplo. */
export function GlobePanel({ locale, locating, denied, onLocate, onPlace, onSample, onAbout }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const open = searchOpen || denied;
  return (
    <section className="globe-panel" aria-labelledby="globe-title">
      <div className="globe-panel__hero">
        <h1 id="globe-title">{t(locale, 'globe.title')}</h1>
        <p>{t(locale, 'globe.subtitle')}</p>
      </div>
      {open ? (
        <PlaceSearch locale={locale} denied={denied} onPlace={onPlace} onClose={() => setSearchOpen(false)} />
      ) : (
        <>
          <button type="button" className="btn btn--primary btn--xl" onClick={onLocate} disabled={locating}>
            <Icon name="locate" size={24} />
            {t(locale, locating ? 'globe.locating' : 'globe.locate')}
          </button>
          <div className="globe-panel__links">
            <button type="button" className="link" onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={18} /> {t(locale, 'globe.search')}
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" className="link" onClick={onSample}>
              <Icon name="sample" size={18} /> {t(locale, 'globe.sample')}
            </button>
          </div>
          <button type="button" className="link link--small globe-panel__about" onClick={onAbout}>
            <Icon name="info" size={16} /> {t(locale, 'about.link')}
          </button>
        </>
      )}
    </section>
  );
}

function PlaceSearch({
  locale,
  denied,
  onPlace,
  onClose,
}: {
  locale: Locale;
  denied: boolean;
  onPlace: (p: Place) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[] | null>(null);
  return (
    <div className="search glass">
      {denied && (
        <p className="search__note" role="status">
          <Icon name="info" size={18} /> {t(locale, 'globe.locate_denied')}
        </p>
      )}
      <form
        className="search__row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!q.trim()) return;
          setBusy(true);
          try {
            setResults(await searchPlaces(q, locale));
          } catch {
            setResults([]);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="sr-only" htmlFor="place-q">
          {t(locale, 'search.label')}
        </label>
        <input
          id="place-q"
          autoFocus
          value={q}
          placeholder={t(locale, 'search.placeholder')}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Icon name="search" size={18} />
          <span className="sr-only">{t(locale, 'search.go')}</span>
        </button>
        <button type="button" className="iconbtn" aria-label={t(locale, 'search.close')} onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </form>
      {results && (
        <ul className="search__results">
          {results.length === 0 && <li className="muted">{t(locale, 'search.none')}</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lon},${r.label}`}>
              <button type="button" onClick={() => onPlace(r)}>
                <Icon name="pin" size={16} /> {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
