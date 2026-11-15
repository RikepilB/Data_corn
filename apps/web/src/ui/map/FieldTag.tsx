// SI-assisted (Claude Code); reviewed by <name>
import type { Map as MapLibreMap } from 'maplibre-gl';
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Film } from '../../application/useFilm';
import { yieldAt } from '../../domain/film';
import { type FormatContext, shortDate } from '../../domain/format';
import type { LngLat } from '../../domain/geo';
import { filmDate, stageAt, waterColor } from '../../domain/season';
import { depth, format, temperature } from '../../domain/units';
import { numberLocale, t } from '../../i18n';

/** Punto de anclaje: centro del borde norte del lote (la etiqueta queda encima). */
export function tagAnchor(ring: LngLat[]): LngLat {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lons) + Math.max(...lons)) / 2, Math.max(...lats)];
}

/** Etiqueta sobre el lote que sigue al cursor de la película: fecha, etapa, agua, calor, lluvia. */
export function FieldTag({ map, anchor, film, ctx }: { map: MapLibreMap; anchor: LngLat; film: Film; ctx: FormatContext }) {
  const [xy, setXy] = useState<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [below, setBelow] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = () => {
      const p = map.project(anchor);
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      setXy(p.x < 0 || p.y < 0 || p.x > w || p.y > h || map.getZoom() < 9 ? null : { x: p.x, y: p.y });
    };
    place();
    map.on('move', place);
    map.on('resize', place);
    return () => {
      map.off('move', place);
      map.off('resize', place);
    };
  }, [map, anchor]);

  // Corre la etiqueta en horizontal para que no salga del mapa ni quede bajo el botón «Centrar»;
  // si aun así choca con los controles de arriba (teléfono), va debajo del borde del lote.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !xy) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = xy.x - w / 2;
    const top = xy.y - h - 14;
    let maxRight = map.getContainer().clientWidth - 8;
    const btn = document.querySelector('.mapbtn')?.getBoundingClientRect();
    if (btn && btn.bottom > top && btn.top < xy.y) maxRight = Math.min(maxRight, btn.left - 8);
    let shift = 0;
    if (left + w > maxRight) shift = maxRight - (left + w);
    if (left + shift < 8) shift = 8 - left;
    const l = left + shift;
    const blocked = ['.mapbtn', '.layerbar .chips', '.layerbar .legend', '.mock-banner', '.topbar']
      .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
      .some((r) => r && r.width > 0 && r.left < l + w && r.right > l && r.top < xy.y && r.bottom > top);
    if (Math.abs(shift - dx) > 0.5) setDx(shift);
    if (blocked !== below) setBelow(blocked);
    // Solo al moverse el mapa o cambiar de año: medir en cada día de la película frena la animación
  }, [xy, film.run]);

  const { run, day } = film;
  if (!xy || !run) return null;
  const { locale, units } = ctx;
  const lang = numberLocale(locale);
  const water = run.water_pct[day] ?? 0;
  const stage = stageAt(run, day);
  const tmax = run.tmax_c[day];
  const rain = run.rain_mm?.[day] ?? null;
  const irrigation = run.irrigation_mm?.[day] ?? 0;
  const yieldNow = yieldAt(run, day);

  return (
    <div
      ref={box}
      className={`fieldtag${below ? ' fieldtag--below' : ''}`}
      style={{ left: xy.x + dx, top: xy.y, '--dx': `${dx}px` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="fieldtag__head">
        <b>{shortDate(filmDate(run, day), locale)}</b> · {t(locale, stage === 'before' ? 'stage.before' : `stage.${stage}`)}
      </div>
      <div className="fieldtag__row">
        <span>
          <i style={{ background: waterColor(water) }} /> {t(locale, 'tag.water', { pct: water })}
        </span>
        {tmax != null && <span>{t(locale, 'tag.tmax', { temp: format(temperature(tmax, units), lang, 0) })}</span>}
        {irrigation > 0 ? (
          <span>{t(locale, 'tag.irrigation', { mm: format(depth(irrigation, units), lang, units === 'metric' ? 0 : 1) })}</span>
        ) : (
          rain != null && <span>{t(locale, 'tag.rain', { mm: format(depth(rain, units), lang, units === 'metric' ? 0 : 1) })}</span>
        )}
        {yieldNow != null && <span>{t(locale, 'tag.yield', { pct: Math.round(yieldNow) })}</span>}
      </div>
    </div>
  );
}
