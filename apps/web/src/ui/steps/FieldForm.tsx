import { useState } from 'react';
import {
  type FieldFormValues,
  HYBRID_RM_RANGE,
  IRRIGATION_SYSTEMS,
  TILLAGE_OPTIONS,
  defaultSeason,
  withYear,
} from '../../domain/inputs';
import type { FieldContext } from '../../domain/report';
import {
  type UnitSystem,
  area,
  cornYield,
  cornYieldToMetric,
  dailyRate,
  dailyRateToMetric,
  format,
} from '../../domain/units';
import { type Locale, numberLocale, t } from '../../i18n';
import type { ApiError } from '../../infrastructure/apiClient';
import { Icon } from '../common/Icon';
import { errorText } from './errors';

interface Props {
  context: FieldContext;
  values: FieldFormValues;
  locale: Locale;
  units: UnitSystem;
  busy: boolean;
  error: ApiError | null;
  isSample: boolean;
  onChange: (v: FieldFormValues) => void;
  onSubmit: () => void;
  onRedraw: () => void;
  /** ← one step back: the drawn field (to adjust it) or, for the example, the globe. */
  onBack: () => void;
  backLabel: string;
  /** → back to the results, only when they still match the form. */
  onForward?: () => void;
}

/** Una línea con lo detectado del lote. */
export function contextLine(context: FieldContext, locale: Locale, units: UnitSystem): string[] {
  const parts = [format(area(context.area_ha, units), numberLocale(locale), 0)];
  if (context.soil) parts.push(capitalize(t(locale, `texture.${context.soil.texture_class}`)));
  const last = [...context.crop_history].sort((a, b) => a.year - b.year).at(-1);
  if (last) parts.push(`${t(locale, 'ctx.previous')}: ${t(locale, `crop.${last.crop}`).toLowerCase()}`);
  const place = [context.admin.county, context.admin.state].filter(Boolean).join(', ');
  if (place) parts.push(place);
  if (context.enso_now) {
    parts.push(`${t(locale, `enso.${context.enso_now.phase}`)} (${context.enso_now.index} ${signed(context.enso_now.value)})`);
  }
  return parts;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const optionalNumber = (raw: string): number | null => (raw === '' ? null : Number(raw));

/** Paso 4 · Sus datos (RF-06): 4 ya llenos y 3 opcionales. */
export function FieldForm({
  context,
  values,
  locale,
  units,
  busy,
  error,
  isSample,
  onChange,
  onSubmit,
  onRedraw,
  onBack,
  backLabel,
  onForward,
}: Props) {
  const [optOpen, setOptOpen] = useState(false);
  const set = (patch: Partial<FieldFormValues>) => onChange({ ...values, ...patch });
  const next = defaultSeason();
  const seasons = [next, next - 1];
  const capUnit = dailyRate(0, units).unit;
  const yieldUnit = cornYield(0, units).unit;

  return (
    <section className="sheet glass" aria-labelledby="form-title">
      <div className="sheet__grip" aria-hidden="true" />
      <header className="sheet__head">
        <button type="button" className="iconbtn" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <Icon name="back" size={20} />
        </button>
        <h2 id="form-title">{t(locale, 'form.title')}</h2>
        {isSample && <span className="tag">{t(locale, 'sample.name')}</span>}
        {onForward && (
          <button
            type="button"
            className="iconbtn"
            onClick={onForward}
            aria-label={t(locale, 'nav.to_results')}
            title={t(locale, 'nav.to_results')}
          >
            <Icon name="forward" size={20} />
          </button>
        )}
      </header>
      <p className="detected">
        <Icon name="pin" size={16} />
        <span>
          <b>{t(locale, 'form.detected')}:</b> {contextLine(context, locale, units).join(' · ')}
        </span>
      </p>
      <p className="muted small">{t(locale, 'form.prefilled')}</p>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <fieldset className="field">
          <legend>{t(locale, 'form.season')}</legend>
          <div className="chips">
            {seasons.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip${values.season === s ? ' is-on' : ''}`}
                aria-pressed={values.season === s}
                onClick={() => set({ season: s, planting_date: withYear(values.planting_date, s) })}
              >
                {t(locale, s === next ? 'form.season_next' : 'form.season_past', { year: s })}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form__grid">
          <label className="field">
            <span>{t(locale, 'form.planting_date')}</span>
            <input
              type="date"
              value={values.planting_date}
              min={`${values.season}-03-01`}
              max={`${values.season}-07-15`}
              onChange={(e) => e.target.value && set({ planting_date: e.target.value })}
            />
          </label>
          <div className="field">
            <span id="rm-label">{t(locale, 'form.hybrid_rm')}</span>
            <div className="stepper" role="group" aria-labelledby="rm-label">
              <button
                type="button"
                aria-label={t(locale, 'form.less')}
                disabled={values.hybrid_rm_days <= HYBRID_RM_RANGE.min}
                onClick={() => set({ hybrid_rm_days: Math.max(HYBRID_RM_RANGE.min, values.hybrid_rm_days - HYBRID_RM_RANGE.step) })}
              >
                <Icon name="minus" size={18} />
              </button>
              <output aria-live="polite">
                {values.hybrid_rm_days} <small>{t(locale, 'form.days')}</small>
              </output>
              <button
                type="button"
                aria-label={t(locale, 'form.more')}
                disabled={values.hybrid_rm_days >= HYBRID_RM_RANGE.max}
                onClick={() => set({ hybrid_rm_days: Math.min(HYBRID_RM_RANGE.max, values.hybrid_rm_days + HYBRID_RM_RANGE.step) })}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          </div>
        </div>

        <fieldset className="field">
          <legend>{t(locale, 'form.irrigation')}</legend>
          <div className="chips">
            {IRRIGATION_SYSTEMS.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip chip--big${values.irrigation === s ? ' is-on' : ''}`}
                aria-pressed={values.irrigation === s}
                onClick={() => set({ irrigation: s, irrigation_capacity_mm_day: s === 'none' ? null : values.irrigation_capacity_mm_day })}
              >
                <Icon name={s === 'none' ? 'drop' : 'sprinkler'} size={18} />
                {t(locale, `irrigation.${s}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <button type="button" className="disclosure" aria-expanded={optOpen} onClick={() => setOptOpen((o) => !o)}>
          <span className={`disclosure__caret${optOpen ? ' is-open' : ''}`} aria-hidden="true">
            ▸
          </span>
          {t(locale, 'form.optional')}
        </button>
        {optOpen && (
          <div className="form__optional">
            {values.irrigation !== 'none' && (
              <label className="field">
                <span>
                  {t(locale, 'form.capacity')} ({capUnit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={units === 'metric' ? 0.5 : 0.01}
                  min={0}
                  value={values.irrigation_capacity_mm_day == null ? '' : +dailyRate(values.irrigation_capacity_mm_day, units).value.toFixed(2)}
                  onChange={(e) => {
                    const v = optionalNumber(e.target.value);
                    set({ irrigation_capacity_mm_day: v == null || v <= 0 ? null : dailyRateToMetric(v, units) });
                  }}
                />
              </label>
            )}
            <fieldset className="field">
              <legend>{t(locale, 'form.tillage')}</legend>
              <div className="chips">
                {TILLAGE_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`chip${values.tillage === o ? ' is-on' : ''}`}
                    aria-pressed={values.tillage === o}
                    onClick={() => set({ tillage: o })}
                  >
                    {t(locale, `tillage.${o}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>
                {t(locale, 'form.yield_goal')} ({yieldUnit})
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={values.yield_goal_t_ha == null ? '' : Math.round(cornYield(values.yield_goal_t_ha, units).value * 10) / 10}
                onChange={(e) => {
                  const v = optionalNumber(e.target.value);
                  set({ yield_goal_t_ha: v == null || v <= 0 ? null : cornYieldToMetric(v, units) });
                }}
              />
            </label>
          </div>
        )}

        {error && (
          <p className="form__error" role="alert">
            <Icon name="alert" size={16} /> {errorText(error, locale)}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--xl" disabled={busy}>
          {busy ? <span className="spinner spinner--dark" aria-hidden="true" /> : <Icon name="check" />}
          {t(locale, busy ? 'form.analyzing' : 'form.submit')}
        </button>
        <button type="button" className="link link--small center" onClick={onRedraw}>
          {t(locale, 'form.back')}
        </button>
      </form>
    </section>
  );
}
