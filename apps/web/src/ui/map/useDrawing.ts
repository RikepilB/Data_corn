import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { LngLat } from '../../domain/geo';
import { setDraft } from './layers';

const CLOSE_PX = 22;

/**
 * Dibujo del lote con puntos (RF-01): tocar agrega una esquina, arrastrar la mueve y tocar la
 * primera (con 3 o más) cierra el lote.
 */
export function useDrawing(
  map: MapLibreMap | null,
  active: boolean,
  points: LngLat[],
  setPoints: (update: (p: LngLat[]) => LngLat[]) => void,
  onCloseRequest: () => void,
): void {
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const closeRef = useRef(onCloseRequest);
  closeRef.current = onCloseRequest;

  // Redibuja el borrador cada vez que cambian los puntos
  useEffect(() => {
    if (map) setDraft(map, active ? points : []);
  }, [map, active, points]);

  useEffect(() => {
    if (!map || !active) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    map.doubleClickZoom.disable();
    let dragging: number | null = null;
    let justDragged = false;

    const vertexAt = (e: MapMouseEvent | MapTouchEvent): number | null => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['draft-vertices'] })[0];
      const idx = hit?.properties?.idx;
      return typeof idx === 'number' ? idx : null;
    };

    const onClick = (e: MapMouseEvent) => {
      if (justDragged) {
        justDragged = false;
        return;
      }
      const pts = pointsRef.current;
      if (pts.length >= 3) {
        const first = map.project(pts[0]!);
        if (Math.hypot(first.x - e.point.x, first.y - e.point.y) < CLOSE_PX) {
          closeRef.current();
          return;
        }
      }
      setPoints((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    };

    const onDown = (e: MapMouseEvent | MapTouchEvent) => {
      const idx = vertexAt(e);
      if (idx === null) return;
      if (idx === 0 && pointsRef.current.length >= 3) return; // tocar el primero cierra
      e.preventDefault();
      dragging = idx;
      map.dragPan.disable();
    };
    const onMove = (e: MapMouseEvent | MapTouchEvent) => {
      if (dragging === null) {
        if ('originalEvent' in e && e.type === 'mousemove') {
          canvas.style.cursor = vertexAt(e) !== null ? 'grab' : 'crosshair';
        }
        return;
      }
      const i = dragging;
      setPoints((p) => p.map((pt, k) => (k === i ? [e.lngLat.lng, e.lngLat.lat] : pt)));
    };
    const onUp = () => {
      if (dragging !== null) {
        dragging = null;
        justDragged = true;
        window.setTimeout(() => (justDragged = false), 60);
        map.dragPan.enable();
      }
    };

    map.on('click', onClick);
    map.on('mousedown', onDown);
    map.on('touchstart', onDown);
    map.on('mousemove', onMove);
    map.on('touchmove', onMove);
    map.on('mouseup', onUp);
    map.on('touchend', onUp);
    return () => {
      map.off('click', onClick);
      map.off('mousedown', onDown);
      map.off('touchstart', onDown);
      map.off('mousemove', onMove);
      map.off('touchmove', onMove);
      map.off('mouseup', onUp);
      map.off('touchend', onUp);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      canvas.style.cursor = '';
    };
  }, [map, active, setPoints]);
}
