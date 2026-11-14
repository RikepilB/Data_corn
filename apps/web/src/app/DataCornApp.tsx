import { useEffect, useState } from 'react';
import { useDataCorn } from '../application/useDataCorn';
import { defaultSeason } from '../domain/inputs';
import type { UnitSystem } from '../domain/units';
import type { Locale } from '../i18n';
import { StatusPanel } from '../ui/common/StatusPanel';
import { TopBar } from '../ui/common/TopBar';
import { EnsoPanel } from '../ui/enso/EnsoPanel';
import { FieldContextCard } from '../ui/field/FieldContextCard';
import { FieldForm } from '../ui/form/FieldForm';
import { IndicatorGrid } from '../ui/indicators/IndicatorGrid';
import { FieldMap } from '../ui/map/FieldMap';
import { RotationCompare } from '../ui/rotation/RotationCompare';
import { SourcesPanel } from '../ui/sources/SourcesPanel';
import { SummaryCard } from '../ui/summary/SummaryCard';
import { SeasonTimeline } from '../ui/timeline/SeasonTimeline';

// Pantalla única (docs/pantalla.md): izquierda = mapa, lote y datos; derecha = resultados.
export default function DataCornApp() {
  const [locale, setLocale] = useState<Locale>('es');
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const next = defaultSeason();
  const [season, setSeason] = useState(next);
  const dc = useDataCorn();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const report = dc.report;
  const context = report?.context ?? dc.described?.context ?? null;
  const busy = dc.status === 'describing' || dc.status === 'analyzing';

  return (
    <>
      <TopBar
        locale={locale}
        units={units}
        season={season}
        seasons={[next - 2, next - 1, next]}
        onLocale={setLocale}
        onUnits={setUnits}
        onSeason={setSeason}
      />
      <main className="dc-layout">
        <div className="dc-column">
          <FieldMap locale={locale} onFieldDrawn={(g) => dc.onFieldDrawn(g, season)} />
          <FieldContextCard context={context} locale={locale} units={units} />
          <FieldForm
            values={dc.values}
            locale={locale}
            units={units}
            busy={busy}
            onChange={dc.setValues}
            onSubmit={dc.analyze}
          />
        </div>
        <div className="dc-column" aria-live="polite">
          {report && dc.status === 'ready' ? (
            <>
              <SummaryCard summary={report.summary} locale={locale} />
              <SeasonTimeline timeline={report.timeline} locale={locale} />
              <IndicatorGrid indicators={report.indicators} locale={locale} />
              <RotationCompare rotation={report.rotation} locale={locale} />
              <EnsoPanel enso={report.enso} locale={locale} />
            </>
          ) : (
            <StatusPanel status={dc.status} error={dc.error} locale={locale} />
          )}
          <SourcesPanel sources={report?.sources ?? []} locale={locale} />
        </div>
      </main>
    </>
  );
}
