// SI-assisted (Claude Code); reviewed by <name>
// Zonas dentro del lote (RF-18): colores y resumen por clase de lo que manda la API.
// La web no clasifica ni calcula nada: solo muestra lo que llega en `zones_geojson`.
import type { FieldReport, ZoneClass, ZonesGeoJSON } from './report';

/** De menos a más vigor: el orden de la leyenda y del PDF. */
export const ZONE_ORDER: ZoneClass[] = ['low', 'medium', 'high'];

// Vigor de claro a oscuro, con los tonos de la leyenda de Vegetación (NDVI de GIBS). Cada paso
// cambia de luminosidad (L* 82 / 65 / 37), así se distinguen con daltonismo y en gris; siempre
// van con su palabra en la leyenda.
export const ZONE_COLOR: Record<ZoneClass, string> = {
  low: '#ddc9bc',
  medium: '#78ad01',
  high: '#086701',
};

export interface ZoneShare {
  zone: ZoneClass;
  /** Porcentaje entero del lote; 0 si la clase no vino. */
  area_pct: number;
  /** NDVI medio de la clase; null si la clase no vino. */
  ndvi: number | null;
}

/** El mapa de zonas del reporte, o null si no vino o vino sin parches. */
export function zonesOf(report: FieldReport | null | undefined): ZonesGeoJSON | null {
  const zones = report?.zones_geojson;
  return zones && zones.features?.length > 0 ? zones : null;
}

/**
 * Una fila por clase (baja, media, alta), aunque la clase no haya llegado. Todos los parches de
 * una clase traen los números de la clase entera (no los del parche): se leen de uno, no se suman.
 */
export function zoneShares(zones: ZonesGeoJSON): ZoneShare[] {
  return ZONE_ORDER.map((zone) => {
    const props = zones.features.find((f) => f.properties?.zone === zone)?.properties;
    return { zone, area_pct: props?.area_pct ?? 0, ndvi: props?.ndvi ?? null };
  });
}
