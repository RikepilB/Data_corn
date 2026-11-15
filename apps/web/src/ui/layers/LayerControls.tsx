import { useEffect, useState } from 'react';
import { type FormatContext, formatParams, monthYear } from '../../domain/format';
import type { ZonesGeoJSON } from '../../domain/report';
import { ZONE_COLOR, zoneShares } from '../../domain/zones';
import { type Locale, t } from '../../i18n';
import { CLIMATE_LAYERS, type ClimateLayerId, LAYER_ORDER } from '../../infrastructure/gibs';
import { Icon } from '../common/Icon';

/** Una capa de clima o las zonas del lote: en el mapa se ve una sola a la vez. */
export type LayerChoice = ClimateLayerId | 'zones';

export function LayerChips({
  value,
  onChange,
  locale,
  zones = false,
}: {
  value: LayerChoice | null;
  onChange: (id: LayerChoice | null) => void;
  locale: Locale;
  /** Resultados con zonas (RF-60): va primero, es la única capa de dentro del lote. */
  zones?: boolean;
}) {
  const ids: LayerChoice[] = zones ? ['zones', ...LAYER_ORDER] : LAYER_ORDER;
  return (
    <div className="chips" role="radiogroup" aria-label={t(locale, 'layers.title')}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={`chip${value === id ? ' is-on' : ''}`}
          onClick={() => onChange(value === id ? null : id)}
        >
          {t(locale, `layer.${id}`)}
        </button>
      ))}
    </div>
  );
}

const gradient = (id: ClimateLayerId) =>
  `linear-gradient(90deg, ${CLIMATE_LAYERS[id].stops.join(', ')})`;

export function Legend({ id, locale, note }: { id: ClimateLayerId; locale: Locale; note?: string }) {
  return (
    <div className="legend glass" aria-label={t(locale, `layer.${id}`)}>
      <div className="legend__bar" style={{ background: gradient(id) }} aria-hidden="true" />
      <div className="legend__labels">
        <span>{t(locale, `legend.${id}.low`)}</span>
        <span>{t(locale, `legend.${id}.high`)}</span>
      </div>
      <div className="legend__source">{note ?? t(locale, `layer.source.${id}`)}</div>
    </div>
  );
}

/** Leyenda de las zonas: cada clase con su palabra y su parte del lote, no solo el color. */
export function ZonesLegend({ zones, note, ctx }: { zones: ZonesGeoJSON; note?: string; ctx: FormatContext }) {
  const { locale } = ctx;
  return (
    <div className="legend legend--zones glass" role="group" aria-label={t(locale, 'layer.zones')}>
      <ul className="legend__zones">
        {zoneShares(zones).map((z) => (
          <li key={z.zone}>
            <i style={{ background: ZONE_COLOR[z.zone] }} aria-hidden="true" />
            {t(locale, `legend.zones.${z.zone}`)}
            <b>{formatParams({ area_pct: z.area_pct }, ctx).area_pct}</b>
          </li>
        ))}
      </ul>
      {note && <p className="legend__note">{note}</p>}
      <div className="legend__source">{t(locale, 'layer.source.zones', zones.meta)}</div>
    </div>
  );
}

/** Deslizador de meses con ▶ para animar la capa en el globo (RF-61). */
export function TimeSlider({
  months,
  value,
  onChange,
  locale,
}: {
  months: string[];
  value: string;
  onChange: (iso: string) => void;
  locale: Locale;
}) {
  const [playing, setPlaying] = useState(false);
  const index = Math.max(0, months.indexOf(value));

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = months.indexOf(value) + 1;
      if (next >= months.length) {
        setPlaying(false);
        return;
      }
      onChange(months[next]!);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [playing, months, value, onChange]);

  return (
    <div className="timeslider glass">
      <button
        type="button"
        className="iconbtn"
        aria-label={t(locale, playing ? 'time.pause' : 'time.play')}
        onClick={() => {
          if (!playing && index >= months.length - 1) onChange(months[0]!);
          setPlaying((p) => !p);
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(months.length - 1, 0)}
        value={index}
        aria-label={t(locale, 'time.month')}
        aria-valuetext={value ? monthYear(value, locale) : ''}
        onChange={(e) => {
          setPlaying(false);
          onChange(months[Number(e.target.value)]!);
        }}
      />
      <span className="timeslider__label">{value ? monthYear(value, locale) : ''}</span>
    </div>
  );
}
