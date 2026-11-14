import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { type Locale, t } from '../../i18n';
import { GLOBE_VIEW, globeStyle } from '../../infrastructure/mapStyle';
import { installLayers } from './layers';

/** El mapa de fondo de toda la app: un solo MapLibre con proyección de globo. */
export function MapView({ locale, onReady }: { locale: Locale; onReady: (map: MapLibreMap) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: globeStyle(),
      center: GLOBE_VIEW.center,
      zoom: GLOBE_VIEW.zoom,
      maxPitch: 60,
      attributionControl: { compact: true },
      // Necesario para la imagen del lote en el PDF
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    });
    map.on('load', () => {
      installLayers(map);
      ready.current(map);
    });
    return () => map.remove();
  }, []);

  return (
    <div className="mapwrap">
      <div className="stars" aria-hidden="true" />
      <div ref={container} className="map" role="application" aria-label={t(locale, 'globe.title')} />
    </div>
  );
}
