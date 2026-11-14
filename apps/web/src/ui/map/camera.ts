import type { LngLatBoundsLike, Map as MapLibreMap, PaddingOptions } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vuelo animado del globo al campo (~4.5 s); con movimiento reducido, salto directo (RF-09). */
export function flyToPlace(map: MapLibreMap, center: [number, number], zoom: number): Promise<void> {
  return new Promise((resolve) => {
    map.stop();
    map.once('moveend', () => resolve());
    if (reducedMotion()) map.jumpTo({ center, zoom, pitch: 0, bearing: 0 });
    else map.flyTo({ center, zoom, pitch: 0, bearing: 0, duration: 4600, curve: 1.6, essential: true });
  });
}

export function fitField(
  map: MapLibreMap,
  bounds: LngLatBoundsLike,
  padding: Partial<PaddingOptions>,
  maxZoom = 14.6,
): void {
  map.fitBounds(bounds, {
    padding: { top: 0, bottom: 0, left: 0, right: 0, ...padding },
    maxZoom,
    duration: reducedMotion() ? 0 : 1400,
    essential: true,
  });
}

/** El globo gira despacio mientras nadie lo toca. Devuelve una función para detenerlo ya. */
export function useGlobeSpin(map: MapLibreMap | null, active: boolean): () => void {
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!map || !active || reducedMotion()) {
      stopRef.current = () => {};
      return;
    }
    let stopped = false;
    const spin = () => {
      if (stopped || map.getZoom() > 3.2) return;
      const c = map.getCenter();
      c.lng -= 7;
      map.easeTo({ center: c, duration: 2200, easing: (x) => x });
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      map.off('moveend', spin);
      map.stop();
    };
    const interact = () => {
      stopped = true;
      map.off('moveend', spin);
    };
    map.on('moveend', spin);
    map.on('mousedown', interact);
    map.on('touchstart', interact);
    map.on('wheel', interact);
    stopRef.current = stop;
    spin();
    return () => {
      stopped = true;
      map.off('moveend', spin);
      map.off('mousedown', interact);
      map.off('touchstart', interact);
      map.off('wheel', interact);
    };
  }, [map, active]);
  return () => stopRef.current();
}
