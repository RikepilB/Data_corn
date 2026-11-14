import type { FieldContext } from '../../domain/report';
import { type UnitSystem, area, format } from '../../domain/units';
import { type Locale, numberLocale, t } from '../../i18n';

interface Props {
  context: FieldContext | null;
  locale: Locale;
  units: UnitSystem;
}

// ③ Tu lote: todo lo que se detecta solo a partir del contorno (RF-05).
export function FieldContextCard({ context, locale, units }: Props) {
  if (!context) {
    return (
      <section className="dc-card">
        <h2>{t(locale, 'field.title')}</h2>
        <p className="dc-muted">{t(locale, 'field.empty')}</p>
      </section>
    );
  }
  const nf = numberLocale(locale);
  const previous = context.crop_history.at(-1);
  const rows: [string, string][] = [
    [t(locale, 'field.area'), format(area(context.area_ha, units), nf, 0)],
    [t(locale, 'field.soil'), context.soil?.texture_class ?? '—'],
    [t(locale, 'field.slope'), context.terrain ? `${context.terrain.mean_slope_pct.toFixed(1)} %` : '—'],
    [t(locale, 'field.previous_crop'), previous ? t(locale, `crop.${previous.crop}`) : '—'],
    [t(locale, 'field.county'), context.admin.county ?? '—'],
    [
      t(locale, 'field.enso'),
      context.enso_now
        ? `${t(locale, `enso.${context.enso_now.phase}`)} (${context.enso_now.index} ${context.enso_now.value.toFixed(1)})`
        : '—',
    ],
  ];
  return (
    <section className="dc-card">
      <h2>{t(locale, 'field.title')}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="dc-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
