import { useEffect, useState } from 'react';
import { type FormatContext, formatParams } from '../../domain/format';
import type { ZonesGeoJSON } from '../../domain/report';
import { ZONE_COLOR, zoneShares } from '../../domain/zones';
import { type Locale, t } from '../../i18n';
import { CLIMATE_LAYERS, LIVE_LAYERS, type LayerId, isLive } from '../../infrastructure/gibs';
import { Icon } from '../common/Icon';

/** Una capa de datos o las zonas del lote: en el mapa se ve una sola a la vez. */
export type LayerChoice = LayerId | 'zones';

/** Chips de capas. En el globo: en vivo e históricas; en los resultados: zonas (si hay) e históricas. */
export function LayerChips({
  ids,
  value,
  onChange,
  locale,
}: {
  ids: LayerChoice[];
  value: LayerChoice | null;
  onChange: (id: LayerChoice | null) => void;
  locale: Locale;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={t(locale, 'layers.title')}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={`chip${value === id ? ' is-on' : ''}${isLive(id) ? ' chip--live' : ''}`}
          onClick={() => onChange(value === id ? null : id)}
        >
          {isLive(id) && <span className="livedot" aria-hidden="true" />}
          {t(locale, `layer.${id}`)}
        </button>
      ))}
    </div>
  );
}

function stopsOf(id: LayerId): string[] | undefined {
  return isLive(id) ? LIVE_LAYERS[id].stops : CLIMATE_LAYERS[id].stops;
}

export function Legend({ id, locale, note }: { id: LayerId; locale: Locale; note?: string }) {
  const stops = stopsOf(id);
  return (
    <div className="legend glass" aria-label={t(locale, `layer.${id}`)}>
      {stops ? (
        <>
          <div className="legend__bar" style={{ background: `linear-gradient(90deg, ${stops.join(', ')})` }} aria-hidden="true" />
          <div className="legend__labels">
            <span>{t(locale, `legend.${id}.low`)}</span>
            {id === 'sea_temp' && <span>{t(locale, 'legend.sea_temp.mid')}</span>}
            <span>{t(locale, `legend.${id}.high`)}</span>
          </div>
        </>
      ) : (
        <div className="legend__text">{t(locale, `legend.${id}.text`)}</div>
      )}
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

/** Deslizador de cuadros (meses o medias horas) con ▶ para animar la capa del globo (RF-61). */
export function TimeSlider({
  frames,
  value,
  onChange,
  label,
  locale,
  intervalMs = 1100,
  live = false,
}: {
  frames: string[];
  value: string;
  onChange: (iso: string) => void;
  label: (iso: string) => string;
  locale: Locale;
  intervalMs?: number;
  live?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const index = Math.max(0, frames.indexOf(value));

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = frames.indexOf(value) + 1;
      if (next >= frames.length) {
        setPlaying(false);
        return;
      }
      onChange(frames[next]!);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, frames, value, onChange, intervalMs]);

  const latest = index === frames.length - 1;
  return (
    <div className="timeslider glass">
      <button
        type="button"
        className="iconbtn"
        aria-label={t(locale, playing ? 'time.pause' : 'time.play')}
        onClick={() => {
          if (!playing && latest) onChange(frames[0]!);
          setPlaying((p) => !p);
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(frames.length - 1, 0)}
        value={index}
        aria-label={t(locale, 'time.frame')}
        aria-valuetext={value ? label(value) : ''}
        onChange={(e) => {
          setPlaying(false);
          onChange(frames[Number(e.target.value)]!);
        }}
      />
      <span className="timeslider__label">
        {live && latest && <span className="livedot" aria-hidden="true" />}
        {value ? label(value) : ''}
      </span>
    </div>
  );
}
