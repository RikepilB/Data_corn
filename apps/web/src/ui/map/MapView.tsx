import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
// MapLibre 6 busca su worker junto a su propio archivo; con Vite (dev y build) esa ruta no existe,
// así que se le pasa la URL que Vite sirve. Sin esto el mapa no dibuja nada.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { type Locale, t } from '../../i18n';
import { GLOBE_VIEW, globeStyle } from '../../infrastructure/mapStyle';
import { addGoogleSatellite } from '../../infrastructure/googleTiles';
import { installLayers } from './layers';

setWorkerUrl(workerUrl);

/** El mapa de fondo de toda la app: un solo MapLibre con proyección de globo. */
export function MapView({ locale, onReady }: { locale: Locale; onReady: (map: MapLibreMap) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  const [googleCredit, setGoogleCredit] = useState<string | null>(null);
  const lang = useRef(locale);
  lang.current = locale;

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: globeStyle(),
      center: GLOBE_VIEW.center,
      zoom: GLOBE_VIEW.zoom,
      maxPitch: 60,
      attributionControl: { compact: true },
      // Rendimiento: en pantallas de alta densidad dibuja a 1.5× como máximo (la imagen satelital
      // no gana nitidez más allá) y sin preserveDrawingBuffer ni antialias, que frenan cada cuadro.
      // La imagen del PDF se toma en el evento `render` (ver snapshotMap).
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    });
    map.on('load', () => {
      // Créditos contraídos en el botón «i»: siguen disponibles sin tapar los paneles
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      installLayers(map);
      // Con clave, imagen satelital de Google (más nítida y rápida); sin clave, Sentinel-2 (EOX)
      void addGoogleSatellite(map, lang.current === 'es' ? 'es-419' : 'en-US', setGoogleCredit);
      ready.current(map);
    });
    return () => map.remove();
  }, []);

  return (
    <div className="mapwrap">
      <div className="stars" aria-hidden="true" />
      <div ref={container} className="map" role="application" aria-label={t(locale, 'globe.title')} />
      {googleCredit && <div className="gcredit">Google · {googleCredit}</div>}
    </div>
  );
}
