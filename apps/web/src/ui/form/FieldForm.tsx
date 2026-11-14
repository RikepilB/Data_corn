import {
  type FieldFormValues,
  HYBRID_RM_RANGE,
  IRRIGATION_SYSTEMS,
  type IrrigationSystem,
  TILLAGE_OPTIONS,
  type Tillage,
} from '../../domain/inputs';
import {
  type UnitSystem,
  cornYield,
  cornYieldToMetric,
  dailyRate,
  dailyRateToMetric,
} from '../../domain/units';
import { type Locale, t } from '../../i18n';

interface Props {
  values: FieldFormValues | null;
  locale: Locale;
  units: UnitSystem;
  busy: boolean;
  onChange: (v: FieldFormValues) => void;
  onSubmit: () => void;
}

const optionalNumber = (raw: string): number | null => (raw === '' ? null : Number(raw));

// ④ Datos del lote: 4 obligatorios + 3 opcionales (RF-06). Muestra unidades del usuario,
// guarda en métrico.
export function FieldForm({ values, locale, units, busy, onChange, onSubmit }: Props) {
  const disabled = values === null || busy;
  const set = (patch: Partial<FieldFormValues>) => values && onChange({ ...values, ...patch });
  const capacity = values?.irrigation_capacity_mm_day;
  const yieldGoal = values?.yield_goal_t_ha;

  return (
    <section className="dc-card">
      <h2>{t(locale, 'form.title')}</h2>
      <form
        className="dc-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label>
          {t(locale, 'form.planting_date')}
          <input
            type="date"
            disabled={disabled}
            value={values?.planting_date ?? ''}
            onChange={(e) => set({ planting_date: e.target.value })}
          />
        </label>
        <label>
          {t(locale, 'form.hybrid_rm')}
          <input
            type="number"
            min={HYBRID_RM_RANGE.min}
            max={HYBRID_RM_RANGE.max}
            disabled={disabled}
            value={values?.hybrid_rm_days ?? ''}
            onChange={(e) => set({ hybrid_rm_days: Number(e.target.value) })}
          />
        </label>
        <label>
          {t(locale, 'form.irrigation')}
          <select
            disabled={disabled}
            value={values?.irrigation ?? 'none'}
            onChange={(e) => set({ irrigation: e.target.value as IrrigationSystem })}
          >
            {IRRIGATION_SYSTEMS.map((s) => (
              <option key={s} value={s}>
                {t(locale, `irrigation.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <details>
          <summary>{t(locale, 'form.optional')}</summary>
          <div className="dc-form">
            {values?.irrigation !== 'none' && (
              <label>
                {t(locale, 'form.irrigation_capacity')} ({dailyRate(0, units).unit})
                <input
                  type="number"
                  step="0.01"
                  disabled={disabled}
                  value={capacity == null ? '' : +dailyRate(capacity, units).value.toFixed(2)}
                  onChange={(e) => {
                    const v = optionalNumber(e.target.value);
                    set({ irrigation_capacity_mm_day: v == null ? null : dailyRateToMetric(v, units) });
                  }}
                />
              </label>
            )}
            <label>
              {t(locale, 'form.tillage')}
              <select
                disabled={disabled}
                value={values?.tillage ?? 'conventional'}
                onChange={(e) => set({ tillage: e.target.value as Tillage })}
              >
                {TILLAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {t(locale, `tillage.${o}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t(locale, 'form.yield_goal')} ({cornYield(0, units).unit})
              <input
                type="number"
                disabled={disabled}
                value={yieldGoal == null ? '' : Math.round(cornYield(yieldGoal, units).value)}
                onChange={(e) => {
                  const v = optionalNumber(e.target.value);
                  set({ yield_goal_t_ha: v == null ? null : cornYieldToMetric(v, units) });
                }}
              />
            </label>
          </div>
        </details>

        <button className="dc-button" type="submit" disabled={disabled}>
          {t(locale, 'form.analyze')}
        </button>
      </form>
    </section>
  );
}
