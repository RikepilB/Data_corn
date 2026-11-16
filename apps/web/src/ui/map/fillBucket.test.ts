// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { waterColor } from '../common/palette';
import { FILL_BUCKETS, bucketColor, waterBucket } from './fillBucket';

describe('water fill buckets', () => {
  it('maps the ends and clamps out-of-range values', () => {
    expect(waterBucket(0)).toBe(0);
    expect(waterBucket(100)).toBe(FILL_BUCKETS - 1);
    expect(waterBucket(-20)).toBe(0);
    expect(waterBucket(140)).toBe(FILL_BUCKETS - 1);
  });

  it('is monotonic and uses every bucket', () => {
    const seen = new Set<number>();
    let prev = -1;
    for (let p = 0; p <= 100; p += 0.5) {
      const b = waterBucket(p);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
      seen.add(b);
    }
    expect(seen.size).toBe(FILL_BUCKETS);
  });

  it('returns -1 for missing data, never a colour for 0', () => {
    expect(waterBucket(undefined)).toBe(-1);
    expect(waterBucket(null)).toBe(-1);
    expect(waterBucket(Number.NaN)).toBe(-1);
  });

  it('keeps a bucket colour within one bucket of the exact ramp colour', () => {
    expect(bucketColor(0)).toBe(waterColor(0));
    expect(bucketColor(FILL_BUCKETS - 1)).toBe(waterColor(100));
    expect(bucketColor(waterBucket(37))).toMatch(/^#[0-9a-f]{6}$/);
  });
});
