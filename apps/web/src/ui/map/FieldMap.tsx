import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { PolygonGeometry } from '../../domain/report';
import { type Locale, t } from '../../i18n';
import { INITIAL_VIEW, SATELLITE_STYLE } from '../../infrastructure/mapConfig';

interface Props {
  locale: Locale;
  onFieldDrawn: (geometry: PolygonGeometry) => void;
}

export function FieldMap({ locale, onFieldDrawn }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const onDrawn = useRef(onFieldDrawn);
  onDrawn.current = onFieldDrawn;

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: SATELLITE_STYLE,
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
    });
    map.addControl(new NavigationControl(), 'top-right');

    // F1: dibujo y edición del contorno con Terra Draw (modo polígono). Al cerrar el
    // polígono: onDrawn.current({ type: 'Polygon', coordinates: [...] }).
    // F9: capa con los lotes de ejemplo (GET /api/v1/demo-fields).

    return () => map.remove();
  }, []);

  return (
    <section className="dc-card">
      <div ref={container} className="field-map" role="application" aria-label={t(locale, 'map.aria')} />
      <p className="dc-muted">{t(locale, 'map.draw_hint')}</p>
    </section>
  );
}
