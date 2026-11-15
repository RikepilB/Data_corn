// SI-assisted (Claude Code); reviewed by <name>
import { waterColor } from '../common/palette';

/**
 * The field fill follows the film's water level. Repainting it every day made two setPaintProperty
 * calls at 10 Hz for colour steps nobody can tell apart, so the level is quantised to a few
 * buckets and the map is touched only when the bucket changes.
 */
export const FILL_BUCKETS = 16;

/** Bucket index 0..FILL_BUCKETS-1 for a water level in %; -1 when there is no data. */
export function waterBucket(pct: number | undefined | null): number {
  if (pct == null || Number.isNaN(pct)) return -1;
  const clamped = Math.min(100, Math.max(0, pct));
  return Math.round((clamped / 100) * (FILL_BUCKETS - 1));
}

/** The colour of a bucket: the ramp colour at the bucket's centre level. */
export const bucketColor = (bucket: number): string => waterColor((bucket / (FILL_BUCKETS - 1)) * 100);
