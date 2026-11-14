import en from './en.json';
import es from './es.json';

export type Locale = 'es' | 'en';
type Params = Record<string, string | number>;

const dictionaries: Record<Locale, Record<string, string>> = { es, en };

/** Traduce una clave; si falta en el idioma, usa inglés y, si no, la clave misma. */
export function t(locale: Locale, key: string, params: Params = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export const numberLocale = (locale: Locale): string => (locale === 'es' ? 'es-PE' : 'en-US');
