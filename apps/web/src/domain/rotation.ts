import type { CropYear, RotationComparison, RotationOption, RotationStrategy } from './report';

export const STRATEGIES: RotationStrategy[] = ['continuous_corn', 'corn_soybean', 'corn_soybean_rye'];

export interface StrategyView {
  strategy: RotationStrategy;
  current: boolean;
  option: RotationOption | null;
}

/**
 * Which strategy the crop record matches, from the last four years.
 * Four years of corn is continuous corn; corn and soybean taking turns is corn-soybean.
 * A rye cover crop grows over winter and the CDL map does not show it, so it is never inferred.
 */
export function strategyFromHistory(history: CropYear[]): RotationStrategy | null {
  const last = [...history].sort((a, b) => a.year - b.year).slice(-4);
  if (last.length < 4) return null;
  if (last.every((h) => h.crop === 'maize')) return 'continuous_corn';
  const alternates = last.every(
    (h, i) => (h.crop === 'maize' || h.crop === 'soybean') && (i === 0 || h.crop !== last[i - 1]!.crop),
  );
  return alternates ? 'corn_soybean' : null;
}

function strategyOf(o: RotationOption): RotationStrategy | null {
  if (o.strategy) return o.strategy;
  if (o.previous_crop === 'maize') return 'continuous_corn';
  if (o.previous_crop === 'soybean') return 'corn_soybean';
  return null;
}

/**
 * The three strategies in display order: the current one first, then the rest in a fixed order.
 * Uses the engine's `strategy` and `current` when it sends them, and derives both when it does not.
 */
export function strategyViews(rotation: RotationComparison): StrategyView[] {
  const byStrategy = new Map<RotationStrategy, RotationOption>();
  for (const o of rotation.options) {
    const s = strategyOf(o);
    if (s && !byStrategy.has(s)) byStrategy.set(s, o);
  }
  const sent = rotation.options.some((o) => o.current != null);
  const flagged = rotation.options.find((o) => o.current);
  const current = sent ? (flagged ? strategyOf(flagged) : null) : strategyFromHistory(rotation.field_history ?? []);

  const views = STRATEGIES.map((strategy) => ({
    strategy,
    current: strategy === current,
    option: byStrategy.get(strategy) ?? null,
  }));
  return [...views.filter((v) => v.current), ...views.filter((v) => !v.current)];
}
