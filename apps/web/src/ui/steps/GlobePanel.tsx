import { useEffect, useState } from 'react';
import type { LocateIssue } from '../../application/locate';
import { type Locale, t } from '../../i18n';
import {
  NOMINATIM_ATTRIBUTION,
  NOMINATIM_COPYRIGHT_URL,
  type Place,
  SearchError,
  type SearchFailure,
  searchPlaces,
} from '../../infrastructure/geocode';
import { Icon } from '../common/Icon';

interface Props {
  locale: Locale;
  locating: boolean;
  /** Why "go to my location" did not reach the field; the search is offered with the reason. */
  issue: LocateIssue | null;
  onLocate: () => void;
  onPlace: (p: Place) => void;
  onSample: () => void;
  onAbout: () => void;
}

const ISSUE_KEY: Record<LocateIssue, string> = {
  unsupported: 'globe.locate_denied',
  denied: 'globe.locate_blocked',
  unavailable: 'globe.locate_unavailable',
  timeout: 'globe.locate_timeout',
  coarse: 'globe.locate_coarse',
};
// A blocked permission or a browser without geolocation will fail the same way again.
const canRetry = (issue: LocateIssue) => issue === 'timeout' || issue === 'unavailable';

/** Paso 1 · El globo: ir a mi ubicación, buscar o ver un ejemplo. */
export function GlobePanel({ locale, locating, issue, onLocate, onPlace, onSample, onAbout }: Props) {
  const [searchOpen, setSearchOpen] = useState(issue != null);
  // Each new issue opens the search; closing it brings the three choices back.
  useEffect(() => {
    if (issue) setSearchOpen(true);
  }, [issue]);
  return (
    <section className="globe-panel" aria-labelledby="globe-title">
      <div className="globe-panel__hero">
        <h1 id="globe-title">{t(locale, 'globe.title')}</h1>
        <p>{t(locale, 'globe.subtitle')}</p>
      </div>
      {searchOpen ? (
        <PlaceSearch
          locale={locale}
          issue={issue}
          locating={locating}
          onLocate={onLocate}
          onPlace={onPlace}
          onClose={() => setSearchOpen(false)}
        />
      ) : (
        <>
          <button
            type="button"
            className="btn btn--primary btn--xl"
            onClick={onLocate}
            disabled={locating}
            aria-busy={locating}
          >
            {locating ? <span className="spinner spinner--dark" aria-hidden="true" /> : <Icon name="locate" size={24} />}
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

type SearchState = { status: 'idle' | 'busy' } | { status: 'done'; places: Place[] } | { status: SearchFailure };

function PlaceSearch({
  locale,
  issue,
  locating,
  onLocate,
  onPlace,
  onClose,
}: {
  locale: Locale;
  issue: LocateIssue | null;
  locating: boolean;
  onLocate: () => void;
  onPlace: (p: Place) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const busy = state.status === 'busy';
  return (
    <div className="search glass">
      {locating ? (
        <p className="search__note" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>{t(locale, 'globe.locating')}</span>
        </p>
      ) : (
        issue && (
          <div className="search__note" role="status">
            <Icon name="info" size={18} />
            <span>
              {t(locale, ISSUE_KEY[issue])}
              {canRetry(issue) && (
                <>
                  {' '}
                  <button type="button" className="search__retry" onClick={onLocate}>
                    {t(locale, 'globe.locate_retry')}
                  </button>
                </>
              )}
            </span>
          </div>
        )
      )}
      <form
        className="search__row"
        onSubmit={async (e) => {
          e.preventDefault();
          // One search at a time: Enter held down must not queue requests to Nominatim.
          if (busy || !q.trim()) return;
          setState({ status: 'busy' });
          try {
            setState({ status: 'done', places: await searchPlaces(q, locale) });
          } catch (error) {
            setState({ status: error instanceof SearchError ? error.reason : 'failed' });
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
        <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
          {busy ? <span className="spinner spinner--dark" aria-hidden="true" /> : <Icon name="search" size={18} />}
          <span className="sr-only">{t(locale, 'search.go')}</span>
        </button>
        <button type="button" className="iconbtn" aria-label={t(locale, 'search.close')} onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </form>
      {busy && (
        <p className="muted small" role="status">
          {t(locale, 'search.busy')}
        </p>
      )}
      {(state.status === 'failed' || state.status === 'out_of_range') && (
        <p className="search__note" role="alert">
          <Icon name="alert" size={18} />
          <span>{t(locale, state.status === 'failed' ? 'search.failed' : 'search.bad_coords')}</span>
        </p>
      )}
      {state.status === 'done' && (
        <>
          <ul className="search__results">
            {state.places.length === 0 && <li className="muted">{t(locale, 'search.none')}</li>}
            {state.places.map((r) => (
              <li key={`${r.lat},${r.lon},${r.label}`}>
                <button type="button" onClick={() => onPlace(r)}>
                  <Icon name="pin" size={16} /> {r.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small">
            <a href={NOMINATIM_COPYRIGHT_URL} target="_blank" rel="noreferrer">
              {NOMINATIM_ATTRIBUTION}
            </a>
          </p>
        </>
      )}
    </div>
  );
}
