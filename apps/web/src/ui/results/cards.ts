// Las 6 tarjetas clave (docs/app/arquitectura-y-api.md §B6): ícono, título, semáforo, número y frase.
import { type FormatContext, formatParams, messageText, patternText, shortDate } from '../../domain/format';
import type { FieldReport, Indicator, IndicatorId, RiskLevel } from '../../domain/report';
import { worstRisk } from '../../domain/season';
import { depth, format } from '../../domain/units';
import { numberLocale, t } from '../../i18n';
import type { IconName } from '../common/Icon';

export interface CardModel {
  key: string;
  icon: IconName;
  title: string;
  risk: RiskLevel;
  big: string;
  sentence: string;
  extra?: string;
}

const find = (r: FieldReport, id: IndicatorId): Indicator | undefined => r.indicators.find((i) => i.id === id);

function yearsOf(ind: Indicator | undefined, ctx: FormatContext): string {
  if (!ind) return '—';
  const p = ind.message.params ?? {};
  const years = p.years ?? ind.value;
  const total = p.total;
  if (years == null || total == null) return '—';
  return t(ctx.locale, 'num.years_of', { years: Number(years), total: Number(total) });
}

export function buildCards(report: FieldReport, ctx: FormatContext): CardModel[] {
  const { locale } = ctx;
  const cards: CardModel[] = [];

  // 1 · Fecha de siembra · o · Avance del lote
  const progress = find(report, 'season_progress');
  const window = find(report, 'planting_window');
  if (report.observed_until && progress && progress.risk !== 'no_data') {
    const days = progress.value ?? 0;
    cards.push({
      key: 'progress',
      icon: 'leaf',
      title: t(locale, 'card.progress'),
      risk: progress.risk,
      big:
        days > 0
          ? t(locale, 'num.ahead', { days: Math.round(days) })
          : days < 0
            ? t(locale, 'num.behind', { days: Math.round(-days) })
            : t(locale, 'num.on_time'),
      sentence: messageText(progress.message, ctx),
    });
  } else {
    const p = window?.message.params ?? {};
    cards.push({
      key: 'planting',
      icon: 'calendar',
      title: t(locale, 'card.planting'),
      risk: window?.risk ?? 'no_data',
      big:
        p.start_date && p.end_date
          ? `${shortDate(String(p.start_date), locale)} – ${shortDate(String(p.end_date), locale)}`
          : '—',
      sentence: messageText(window?.message, ctx),
    });
  }

  // 2 · Agua en floración
  const water = find(report, 'flowering_water');
  cards.push({
    key: 'water',
    icon: 'drop',
    title: t(locale, 'card.water'),
    risk: water?.risk ?? 'no_data',
    big: yearsOf(water, ctx),
    sentence: messageText(water?.message, ctx),
  });

  // 3 · Calor en floración
  const heat = find(report, 'flowering_heat');
  const hp = formatParams(heat?.message.params ?? {}, ctx);
  cards.push({
    key: 'heat',
    icon: 'thermo',
    title: t(locale, 'card.heat'),
    risk: heat?.risk ?? 'no_data',
    big: heat ? t(locale, 'num.heat_days', { days: hp.days ?? String(heat.value ?? 0), threshold_c: hp.threshold_c ?? '35 °C' }) : '—',
    sentence: messageText(heat?.message, ctx),
  });

  // 4 · Híbrido y helada
  const hybrid = find(report, 'hybrid_fit');
  const frost = find(report, 'frost');
  cards.push({
    key: 'hybrid',
    icon: 'snow',
    title: t(locale, 'card.hybrid'),
    risk: worstRisk(hybrid?.risk, frost?.risk),
    big: yearsOf(hybrid, ctx),
    sentence: messageText(hybrid?.message, ctx),
    extra: frost ? messageText(frost.message, ctx) : undefined,
  });

  // 5 · Riego · o · Encharcamiento
  const irrigation = find(report, 'irrigation');
  if (irrigation) {
    const peak = irrigation.value ?? Number(irrigation.message.params.peak_week_mm ?? 0);
    cards.push({
      key: 'irrigation',
      icon: 'sprinkler',
      title: t(locale, 'card.irrigation'),
      risk: irrigation.risk,
      big: t(locale, 'num.per_week', {
        value: format(depth(peak, ctx.units), numberLocale(locale), ctx.units === 'metric' ? 0 : 1),
      }),
      sentence: messageText(irrigation.message, ctx),
    });
  } else {
    const wl = find(report, 'waterlogging');
    cards.push({
      key: 'waterlogging',
      icon: 'waves',
      title: t(locale, 'card.waterlogging'),
      risk: wl?.risk ?? 'no_data',
      big: yearsOf(wl, ctx),
      sentence: messageText(wl?.message, ctx),
    });
  }

  // 6 · Rotación
  const rot = report.rotation;
  const history = [...(rot.field_history ?? [])].sort((a, b) => a.year - b.year);
  const last = history.at(-1)?.crop;
  const pattern = String(rot.message.params.pattern ?? '');
  cards.push({
    key: 'rotation',
    icon: 'rotate',
    title: t(locale, 'card.rotation'),
    risk: history.length === 0 ? 'no_data' : rot.recommended && last === rot.recommended ? 'low' : 'medium',
    big: pattern ? patternText(pattern.split(' ').slice(-5).join(' '), locale) : '—',
    sentence: messageText(rot.message, ctx),
  });

  return cards;
}
