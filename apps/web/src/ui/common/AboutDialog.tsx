import { useEffect, useRef } from 'react';
import { type Locale, t } from '../../i18n';
import { EOX_ATTRIBUTION } from '../../infrastructure/gibs';

const CREDITS = [
  'NASA POWER (MERRA-2)',
  'NASA GIBS: Blue Marble, SMAP L4, GPM IMERG, MODIS Terra, GHRSST MUR (NASA JPL)',
  'NOAA GOES-East and GOES-West ABI GeoColor (through NASA GIBS)',
  'NASA MODIS MOD13Q1 (ORNL DAAC)',
  'USDA NRCS SSURGO',
  'USDA NASS Cropland Data Layer',
  'NOAA CPC Oceanic Niño Index',
  'USGS The National Map: Orthoimagery (USDA NAIP)',
  EOX_ATTRIBUTION,
  'Iowa State University Extension (rotation evidence)',
];

/** Cómo funciona, límites y créditos. Un <dialog> nativo: Esc cierra y el foco queda atrapado. */
export function AboutDialog({ open, locale, onClose }: { open: boolean; locale: Locale; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="about glass"
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="about__body">
        <header className="about__head">
          <h2 id="about-title">{t(locale, 'about.title')}</h2>
          <button type="button" className="btn about__close" onClick={onClose}>
            {t(locale, 'about.close')}
          </button>
        </header>

        <h3>{t(locale, 'about.how.title')}</h3>
        <p>{t(locale, 'about.how.text')}</p>

        <h3>{t(locale, 'about.limits.title')}</h3>
        <ul>
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(locale, `about.limits.${n}`)}</li>
          ))}
        </ul>

        <h3>{t(locale, 'about.credits.title')}</h3>
        <ul>
          {CREDITS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="muted small">{t(locale, 'about.credits.nasa')}</p>

        <h3>{t(locale, 'about.ai.title')}</h3>
        <p>{t(locale, 'about.ai.chat')}</p>
      </div>
    </dialog>
  );
}
