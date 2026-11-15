// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import type { FieldReport, ZoneClass, ZoneFeature, ZonesGeoJSON } from './report';
import { ZONE_COLOR, ZONE_ORDER, zoneShares, zonesOf } from './zones';

const patch = (zone: ZoneClass, ndvi: number | null, area_pct: number): ZoneFeature => ({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  properties: { zone, ndvi, area_pct },
});

const zones = (...features: ZoneFeature[]): ZonesGeoJSON => ({
  type: 'FeatureCollection',
  meta: { source: 'Copernicus Sentinel-2 SR (Earth Engine)', first_year: 2021, last_year: 2025, seasons: 5, resolution_m: 10 },
  features,
});

const report = (zones_geojson: ZonesGeoJSON | null) => ({ zones_geojson }) as unknown as FieldReport;

describe('zonesOf', () => {
  it('returns the zone map only when it has patches', () => {
    const map = zones(patch('low', 0.6, 30));
    expect(zonesOf(report(map))).toBe(map);
    expect(zonesOf(report(zones()))).toBeNull();
    expect(zonesOf(report(null))).toBeNull();
    expect(zonesOf(null)).toBeNull();
  });
});

describe('zoneShares', () => {
  it('gives one row per class, from low to high vigour', () => {
    const rows = zoneShares(zones(patch('high', 0.78, 30), patch('low', 0.64, 21), patch('medium', 0.71, 49)));
    expect(rows.map((r) => r.zone)).toEqual(ZONE_ORDER);
    expect(rows).toEqual([
      { zone: 'low', area_pct: 21, ndvi: 0.64 },
      { zone: 'medium', area_pct: 49, ndvi: 0.71 },
      { zone: 'high', area_pct: 30, ndvi: 0.78 },
    ]);
  });

  it('does not add up the patches of a class: each one repeats the class totals', () => {
    const rows = zoneShares(zones(patch('low', 0.64, 21), patch('low', 0.64, 21), patch('medium', 0.71, 79)));
    expect(rows[0]).toEqual({ zone: 'low', area_pct: 21, ndvi: 0.64 });
  });

  it('keeps a class that did not arrive as 0 % with no NDVI (an even field)', () => {
    const rows = zoneShares(zones(patch('medium', 0.7, 100)));
    expect(rows).toEqual([
      { zone: 'low', area_pct: 0, ndvi: null },
      { zone: 'medium', area_pct: 100, ndvi: 0.7 },
      { zone: 'high', area_pct: 0, ndvi: null },
    ]);
  });

  it('keeps a missing NDVI as null, never 0', () => {
    expect(zoneShares(zones(patch('high', null, 12)))[2]).toEqual({ zone: 'high', area_pct: 12, ndvi: null });
  });
});

describe('zone colours', () => {
  it('has a different colour for each class', () => {
    expect(new Set(ZONE_ORDER.map((z) => ZONE_COLOR[z])).size).toBe(3);
  });
});
