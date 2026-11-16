// SI-assisted (Claude Code); reviewed by <name>
// Formateadores de Intl en caché: crearlos cuesta mucho más que usarlos, y la película
// formatea fechas y números en cada cuadro.
const dates = new Map<string, Intl.DateTimeFormat>();
const numbers = new Map<string, Intl.NumberFormat>();

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = dates.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dates.set(key, f);
  }
  return f;
}

export function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = numbers.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numbers.set(key, f);
  }
  return f;
}
