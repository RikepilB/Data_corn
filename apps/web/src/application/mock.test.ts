// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { type LngLat, areaHa, bounds, ringOf } from '../domain/geo';
import type { PolygonGeometry } from '../domain/report';
import { ZONE_ORDER, zoneShares } from '../domain/zones';
import { SAMPLE_FIELD } from '../infrastructure/mapStyle';
import { mockZones } from './mock';

describe('mockZones', () => {
  const zones = mockZones(SAMPLE_FIELD)!;
  const rings = zones.features.map((f) => ({ zone: f.properties.zone, ring: ringOf(f.geometry as PolygonGeometry) }));

  it('keeps every patch inside the sample field', () => {
    const [[west, south], [east, north]] = bounds(SAMPLE_FIELD);
    for (const [lon, lat] of rings.flatMap((r) => r.ring)) {
      expect(lon).toBeGreaterThanOrEqual(west);
      expect(lon).toBeLessThanOrEqual(east);
      expect(lat).toBeGreaterThanOrEqual(south);
      expect(lat).toBeLessThanOrEqual(north);
    }
  });

  it('covers the field once, with the shares it states', () => {
    const field = areaHa(SAMPLE_FIELD);
    const areaOf = (ring: LngLat[]) => (100 * areaHa(ring)) / field;
    expect(rings.reduce((sum, r) => sum + areaOf(r.ring), 0)).toBeCloseTo(100, 1);
    for (const share of zoneShares(zones)) {
      const drawn = rings.filter((r) => r.zone === share.zone).reduce((sum, r) => sum + areaOf(r.ring), 0);
      expect(Math.round(drawn)).toBe(share.area_pct);
    }
    expect(zoneShares(zones).map((s) => s.zone)).toEqual(ZONE_ORDER);
  });

  it('has no zone map for a field that is not four-cornered', () => {
    expect(mockZones(SAMPLE_FIELD.slice(0, 3))).toBeNull();
  });
});
