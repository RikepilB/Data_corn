// Texto de los mensajes de la API: clave i18n + parámetros con formato según su sufijo
// (docs/contrato-api.md §2).
import { type Locale, numberLocale, t } from '../i18n';
import type { Message } from './report';
import { type UnitSystem, depth, format, temperature } from './units';
import { dateFormat, numberFormat } from './intl';

export interface FormatContext {
  locale: Locale;
  units: UnitSystem;
}

/** 'YYYY-MM-DD' → Date local (sin corrimiento por zona horaria). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / 86_400_000);
}

export function shortDate(iso: string, locale: Locale): string {
  return dateFormat(numberLocale(locale), { day: 'numeric', month: 'short' }).format(
    parseIsoDate(iso),
  );
}

export function longDate(iso: string, locale: Locale): string {
  return dateFormat(numberLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseIsoDate(iso));
}

export function monthYear(iso: string, locale: Locale): string {
  return dateFormat(numberLocale(locale), { month: 'short', year: 'numeric' }).format(
    parseIsoDate(iso),
  );
}

/** Cuadro de una capa en vivo (hora UTC de GIBS) en hora local: «17:40 · hace 2 h». */
export function frameLabel(isoUtc: string, locale: Locale, now = Date.now()): string {
  const d = new Date(isoUtc);
  const today = new Date(now).toDateString() === d.toDateString();
  // Solo la hora si es de hoy; si no, también el día («vie 23:30»)
  const clock = dateFormat(numberLocale(locale), {
    ...(today ? {} : { weekday: 'short' as const }),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
  const minutes = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  const ago =
    minutes < 60
      ? t(locale, 'time.ago_min', { n: minutes })
      : t(locale, 'time.ago_h', { n: Math.round(minutes / 60) });
  return `${clock} · ${ago}`;
}

/** «13 nov 2026» (cuadros diarios). */
export function dayLabel(iso: string, locale: Locale): string {
  return dateFormat(numberLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    parseIsoDate(iso.slice(0, 10)),
  );
}

export function num(value: number, locale: Locale, digits = 0): string {
  // Sin separador de miles: los parámetros son años, días o conteos («2027», no «2,027»)
  return numberFormat(numberLocale(locale), {
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}

function pct(value: number, signed: boolean): string {
  // La API manda porcentajes enteros (12 = 12 %); por si llega una fracción, se escala.
  const v = Math.abs(value) <= 1 && !Number.isInteger(value) ? value * 100 : value;
  const r = Math.round(v);
  const sign = signed && r > 0 ? '+' : r < 0 ? '−' : '';
  return `${sign}${Math.abs(r)} %`;
}

/** Da formato a cada parámetro según el sufijo de su nombre. */
export function formatParams(
  params: Record<string, string | number>,
  ctx: FormatContext,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(params)) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (key.endsWith('_mm') && Number.isFinite(n)) {
      out[key] = format(depth(n, ctx.units), numberLocale(ctx.locale), ctx.units === 'metric' ? 0 : 1);
    } else if (key.endsWith('_c') && Number.isFinite(n)) {
      out[key] = format(temperature(n, ctx.units), numberLocale(ctx.locale), 0);
    } else if (key.endsWith('_date')) {
      out[key] = shortDate(String(raw), ctx.locale);
    } else if (key.endsWith('_pct') && Number.isFinite(n)) {
      out[key] = pct(n, key.startsWith('delta'));
    } else if (key.endsWith('_indicator')) {
      out[key] = t(ctx.locale, `indicator.${raw}`);
    } else if (key.endsWith('_crop')) {
      out[key] = t(ctx.locale, `crop.${raw}`);
    } else if (key.endsWith('_phase')) {
      out[key] = t(ctx.locale, `enso.${raw}`);
    } else if (key === 'pattern') {
      out[key] = patternText(String(raw), ctx.locale);
    } else if (typeof raw === 'number') {
      out[key] = num(raw, ctx.locale, 1);
    } else {
      out[key] = String(raw);
    }
  }
  return out;
}

const LETTER_TO_CROP: Record<string, string> = { M: 'maize', S: 'soybean', O: 'other', B: 'fallow' };

/** "M S M S" de la API → letras del idioma ("C S C S" en inglés). */
export function patternText(pattern: string, locale: Locale): string {
  return pattern
    .split(/\s+/)
    .filter(Boolean)
    .map((l) => {
      const crop = LETTER_TO_CROP[l];
      return crop ? t(locale, `crop.${crop}.short`) : l;
    })
    .join(' ');
}

/** Traduce un mensaje de la API; si la clave no existe, usa el texto genérico. */
export function messageText(m: Message | null | undefined, ctx: FormatContext): string {
  if (!m) return '';
  const text = t(ctx.locale, m.key, formatParams(m.params ?? {}, ctx));
  if (text === m.key) return t(ctx.locale, 'msg.no_data');
  // «15 may.» al final de una frase dejaría «may..»
  return text.replace(/(?<!\.)\.\.(?!\.)/g, '.');
}
