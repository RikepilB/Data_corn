// SI-assisted (Claude Code); reviewed by <name>
// The assistant's tools. Each one reads a part of the report on the person's screen and hands it
// back already written in their language and units, with the same helpers the results panel uses
// (src/domain/format.ts). Nothing here computes a new result: every number was computed by the
// engine in advance; this file only picks it out and formats it.
import { type FormatContext, longDate, messageText, num } from '../../src/domain/format';
import type { FieldReport, Indicator, IndicatorId, RiskLevel } from '../../src/domain/report';
import { strategyViews } from '../../src/domain/rotation';
import { depth, format, area as toArea } from '../../src/domain/units';
import { zoneShares, zonesOf } from '../../src/domain/zones';
import { numberLocale, t } from '../../src/i18n';
import { METHOD, METHOD_TOPICS, type MethodTopic } from './method';
import type { LoadedReport } from './reports';

/** A tool as the model sees it (OpenAI-style function schema, which OpenRouter accepts). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const INDICATOR_IDS: readonly IndicatorId[] = [
  'planting_window',
  'hybrid_fit',
  'flowering_water',
  'flowering_heat',
  'frost',
  'irrigation',
  'season_progress',
  'waterlogging',
  'field_zones',
];

const noArgs = { type: 'object', properties: {}, additionalProperties: false } as const;

export const TOOLS: readonly ToolSpec[] = [
  {
    name: 'get_summary',
    description:
      'The report on screen: the field, the choices it was computed with, the overall level, the advice, and one line per indicator. Call this first.',
    parameters: noArgs,
  },
  {
    name: 'get_indicator',
    description: 'One indicator in full: level, confidence, message, what to check in the field, sources and years.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', enum: INDICATOR_IDS } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_seasons',
    description:
      'Each past season run as a scenario on this field: water short around silking, hot days at silking, relative yield from water, El Niño phase.',
    parameters: noArgs,
  },
  {
    name: 'get_rotation',
    description: 'The three rotations compared for this field and the field’s crop record.',
    parameters: noArgs,
  },
  {
    name: 'get_enso',
    description: 'El Niño / La Niña now and how past seasons in each phase went on this field.',
    parameters: noArgs,
  },
  {
    name: 'compare_irrigation',
    description:
      'The same field computed in advance with each irrigation option (none, pivot, furrow, drip): overall level and each indicator.',
    parameters: noArgs,
  },
  {
    name: 'get_method',
    description:
      'How a result is computed: what comes from a published method, what the team chose, and what it cannot tell.',
    parameters: {
      type: 'object',
      properties: { topic: { type: 'string', enum: METHOD_TOPICS } },
      required: ['topic'],
      additionalProperties: false,
    },
  },
];

const risk = (level: RiskLevel, ctx: FormatContext) => t(ctx.locale, `risk.${level}`);
const pctText = (fraction: number | null) => (fraction == null ? null : `${Math.round(fraction * 100)} %`);
const mm = (value: number | null, ctx: FormatContext) =>
  value == null ? null : format(depth(value, ctx.units), numberLocale(ctx.locale), ctx.units === 'metric' ? 0 : 1);
const indicatorName = (id: string, ctx: FormatContext) => t(ctx.locale, `indicator.${id}`);

function indicatorLine(i: Indicator, ctx: FormatContext) {
  return {
    id: i.id,
    name: indicatorName(i.id, ctx),
    level: risk(i.risk, ctx),
    confidence: t(ctx.locale, `confidence.${i.confidence}`),
    message: messageText(i.message, ctx),
  };
}

function summary(loaded: LoadedReport, ctx: FormatContext) {
  const r = loaded.report;
  const c = r.context;
  const i = r.inputs;
  return {
    report_generated: loaded.generatedAt,
    field: {
      place: [c.admin.county, c.admin.state, c.admin.country].filter(Boolean).join(', '),
      area: format(toArea(c.area_ha, ctx.units), numberLocale(ctx.locale), 0),
      soil: c.soil
        ? {
            texture: t(ctx.locale, `texture.${c.soil.texture_class}`),
            drainage: c.soil.drainage_class,
            source: c.soil.source,
          }
        : null,
      mean_slope: c.terrain?.mean_slope_pct == null ? null : `${num(c.terrain.mean_slope_pct, ctx.locale, 1)} %`,
    },
    choices: {
      season: i.season,
      planting_date: longDate(i.planting_date, ctx.locale),
      hybrid_relative_maturity_days: i.hybrid_rm_days,
      irrigation: t(ctx.locale, `irrigation.${i.irrigation}`),
      tillage: t(ctx.locale, `tillage.${i.tillage}`),
      previous_crop: i.previous_crop ? t(ctx.locale, `crop.${i.previous_crop}`) : null,
    },
    overall_level: risk(r.summary.risk, ctx),
    overall_confidence: t(ctx.locale, `confidence.${r.summary.confidence}`),
    advice: messageText(r.summary.recommendation, ctx),
    top_risks: r.summary.top_risks.map((id) => indicatorName(id, ctx)),
    typical_year: r.typical_year,
    seasons_run: r.runs.length,
    observed_until: r.observed_until,
    indicators: r.indicators.map((x) => indicatorLine(x, ctx)),
    sources: r.sources,
  };
}

function indicator(r: FieldReport, id: unknown, ctx: FormatContext) {
  const found = r.indicators.find((i) => i.id === id);
  if (!found) return { error: 'not_in_report' };
  const zones = found.id === 'field_zones' ? zonesOf(r) : null;
  return {
    ...indicatorLine(found, ctx),
    check_in_the_field: found.field_check ? messageText(found.field_check, ctx) : null,
    how: t(ctx.locale, found.evidence.method),
    sources: found.evidence.sources,
    years: found.evidence.years,
    zones: zones
      ? zoneShares(zones).map((z) => ({ zone: z.zone, share_of_field: `${z.area_pct} %`, ndvi: z.ndvi }))
      : undefined,
  };
}

function seasons(r: FieldReport, ctx: FormatContext) {
  return {
    note: 'Each row is one past season replayed on this field with this year’s choices. Scenarios, not a forecast.',
    typical_year: r.typical_year,
    seasons: r.runs.map((s) => ({
      year: s.year,
      el_nino_phase: s.enso_phase ? t(ctx.locale, `enso.${s.enso_phase}`) : null,
      water_short_around_silking: mm(s.flowering_deficit_mm, ctx),
      hot_days_at_silking: s.flowering_heat_days,
      relative_yield_from_water: pctText(s.relative_yield),
    })),
  };
}

function rotation(r: FieldReport, ctx: FormatContext) {
  return {
    message: messageText(r.rotation.message, ctx),
    options: strategyViews(r.rotation).map((v) => ({
      strategy: t(ctx.locale, `rotation.strategy.${v.strategy}`),
      what_the_field_does_now: v.current,
      relative_yield: pctText(v.option?.relative_yield ?? null),
      soil_water_at_planting: mm(v.option?.planting_soil_water_mm ?? null, ctx),
      erosion_from_residue: v.option ? risk(v.option.residue_erosion_risk, ctx) : null,
      notes: v.option?.notes.map((n) => messageText(n, ctx)) ?? [],
    })),
    crop_record: r.rotation.field_history.map((h) => ({ year: h.year, crop: t(ctx.locale, `crop.${h.crop}`) })),
  };
}

function enso(r: FieldReport, ctx: FormatContext) {
  const e = r.enso;
  return {
    message: messageText(e.message, ctx),
    now: e.now ? { phase: t(ctx.locale, `enso.${e.now.phase}`), index: e.now.index, value: e.now.value, period: e.now.period } : null,
    signal_strength: e.signal_strength,
    past_seasons_by_phase: e.outcomes.map((o) => ({
      phase: t(ctx.locale, `enso.${o.phase}`),
      years: o.years,
      water_short_around_silking: mm(o.flowering_water_deficit_mm, ctx),
      hot_days_at_silking: o.flowering_heat_days,
      relative_yield_from_water: pctText(o.relative_yield),
    })),
  };
}

function irrigationOptions(loaded: LoadedReport, ctx: FormatContext) {
  return {
    on_screen: t(ctx.locale, `irrigation.${loaded.report.inputs.irrigation}`),
    options: loaded.all.map((r) => ({
      irrigation: t(ctx.locale, `irrigation.${r.inputs.irrigation}`),
      overall_level: risk(r.summary.risk, ctx),
      advice: messageText(r.summary.recommendation, ctx),
      indicators: r.indicators.map((i) => ({ name: indicatorName(i.id, ctx), level: risk(i.risk, ctx) })),
    })),
  };
}

function method(topic: unknown) {
  return (METHOD_TOPICS as readonly string[]).includes(topic as string)
    ? METHOD[topic as MethodTopic]
    : { error: 'unknown_topic', topics: METHOD_TOPICS };
}

/**
 * Runs one tool call and returns its result as JSON text for the model. `args` is the model's raw
 * JSON; anything unexpected becomes an error result the model can read, never an exception.
 */
export function runTool(name: string, args: string, loaded: LoadedReport, ctx: FormatContext): string {
  let input: Record<string, unknown> = {};
  try {
    const parsed: unknown = args.trim() ? JSON.parse(args) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) input = parsed as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: 'bad_arguments' });
  }
  const r = loaded.report;
  const result = (() => {
    switch (name) {
      case 'get_summary':
        return summary(loaded, ctx);
      case 'get_indicator':
        return indicator(r, input.id, ctx);
      case 'get_seasons':
        return seasons(r, ctx);
      case 'get_rotation':
        return rotation(r, ctx);
      case 'get_enso':
        return enso(r, ctx);
      case 'compare_irrigation':
        return irrigationOptions(loaded, ctx);
      case 'get_method':
        return method(input.topic);
      default:
        return { error: 'unknown_tool' };
    }
  })();
  return JSON.stringify(result);
}
