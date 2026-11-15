import { describe, expect, it } from 'vitest';
import type { Crop, CropYear, RotationComparison, RotationOption } from './report';
import { strategyFromHistory, strategyViews } from './rotation';

const years = (crops: Crop[]): CropYear[] => crops.map((crop, i) => ({ year: 2018 + i, crop, source: 'CDL' }));

const option = (extra: Partial<RotationOption>): RotationOption => ({
  previous_crop: 'maize',
  relative_yield: null,
  planting_soil_water_mm: null,
  residue_erosion_risk: 'low',
  notes: [],
  ...extra,
});

const comparison = (options: RotationOption[], history: CropYear[] = []): RotationComparison => ({
  options,
  recommended: null,
  field_history: history,
  message: { key: 'rotation.soy_first', params: {} },
});

describe('strategyFromHistory', () => {
  it('reads four years of corn as continuous corn', () => {
    expect(strategyFromHistory(years(['soybean', 'maize', 'maize', 'maize', 'maize']))).toBe('continuous_corn');
  });

  it('reads corn and soybean taking turns as corn-soybean', () => {
    expect(strategyFromHistory(years(['maize', 'soybean', 'maize', 'soybean']))).toBe('corn_soybean');
  });

  it('sorts by year before reading', () => {
    const shuffled = years(['maize', 'soybean', 'maize', 'soybean']).reverse();
    expect(strategyFromHistory(shuffled)).toBe('corn_soybean');
  });

  it('matches nothing for a mixed record or fewer than four years', () => {
    expect(strategyFromHistory(years(['maize', 'maize', 'soybean', 'soybean']))).toBeNull();
    expect(strategyFromHistory(years(['maize', 'other', 'maize', 'soybean']))).toBeNull();
    expect(strategyFromHistory(years(['maize', 'soybean', 'maize']))).toBeNull();
  });
});

describe('strategyViews', () => {
  it('always lists the three strategies, current first', () => {
    const views = strategyViews(
      comparison([
        option({ strategy: 'continuous_corn', current: false }),
        option({ previous_crop: 'soybean', strategy: 'corn_soybean', current: true }),
        option({ previous_crop: 'soybean', strategy: 'corn_soybean_rye', current: false }),
      ]),
    );
    expect(views.map((v) => v.strategy)).toEqual(['corn_soybean', 'continuous_corn', 'corn_soybean_rye']);
    expect(views.filter((v) => v.current)).toHaveLength(1);
  });

  it('keeps two soybean options apart by strategy', () => {
    const views = strategyViews(
      comparison([
        option({ previous_crop: 'soybean', strategy: 'corn_soybean', residue_erosion_risk: 'medium' }),
        option({ previous_crop: 'soybean', strategy: 'corn_soybean_rye', residue_erosion_risk: 'no_data' }),
      ]),
    );
    const rye = views.find((v) => v.strategy === 'corn_soybean_rye');
    expect(rye?.option?.residue_erosion_risk).toBe('no_data');
  });

  it('trusts the engine when it marks none as current', () => {
    const views = strategyViews(
      comparison([option({ strategy: 'continuous_corn', current: false })], years(['maize', 'maize', 'maize', 'maize'])),
    );
    expect(views.some((v) => v.current)).toBe(false);
  });

  it('derives strategy and current from the old two-option shape', () => {
    const views = strategyViews(
      comparison(
        [option({ previous_crop: 'maize' }), option({ previous_crop: 'soybean' })],
        years(['maize', 'soybean', 'maize', 'soybean']),
      ),
    );
    expect(views[0]).toMatchObject({ strategy: 'corn_soybean', current: true });
    expect(views.find((v) => v.strategy === 'corn_soybean_rye')?.option).toBeNull();
  });
});
