// Reporte completo en PDF (RF-43), armado en el navegador con @react-pdf/renderer.
// Se carga solo al pulsar «Descargar» (ver download.ts).
import { Circle, Document, G, Image, Line, Page, Polyline, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { type FormatContext, formatParams, longDate, messageText, num, patternText, shortDate } from '../../domain/format';
import type { FieldReport, Indicator, RiskLevel, SeasonRun } from '../../domain/report';
import { strategyViews } from '../../domain/rotation';
import { SEVERITY, pickRun } from '../../domain/season';
import { RISK_COLOR, RISK_INK, yieldColor } from '../common/palette';
import { area, cornYield, dailyRate, depth, format, temperature } from '../../domain/units';
import { ZONE_COLOR, zoneShares, zonesOf } from '../../domain/zones';
import { numberLocale, t } from '../../i18n';
import type { CardModel } from '../results/cards';

export interface ReportArgs {
  report: FieldReport;
  ctx: FormatContext;
  cards: CardModel[];
  mapImage: string | null;
  isSample: boolean;
  mock: boolean;
}

// Helvetica (incluida en el PDF) solo tiene WinAnsi: se cambian los símbolos que no tiene.
const SAFE: [RegExp, string][] = [
  [/−/g, '-'],
  [/≥/g, '>='],
  [/≤/g, '<='],
  [/[✓▲●○◌▸]/g, ''],
  [/→/g, '->'],
  [/ /g, ' '],
];
const s = (text: string) => SAFE.reduce((acc, [re, to]) => acc.replace(re, to), text);

const ENSO_COLOR = { el_nino: '#111113', la_nina: '#7c7c82' } as const;

const C = {
  ink: '#111113',
  muted: '#5c5c62',
  line: '#d4d4d8',
  gold: '#111113',
  goldSoft: '#f1f1f2',
  teal: '#111113',
  bg: '#f4f4f5',
};

const st = StyleSheet.create({
  page: { padding: 36, paddingBottom: 54, fontFamily: 'Helvetica', fontSize: 9.5, color: C.ink, lineHeight: 1.35 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, borderBottomWidth: 2, borderBottomColor: C.gold, paddingBottom: 8 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', lineHeight: 1.1, marginBottom: 4 },
  brandGold: { color: C.gold },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 6, color: C.teal },
  muted: { color: C.muted },
  small: { fontSize: 8 },
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 8, marginBottom: 8 },
  kv: { flexDirection: 'row', marginBottom: 2 },
  k: { width: 110, color: C.muted },
  v: { flex: 1 },
  badge: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#ffffff', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, alignSelf: 'flex-start' },
  verdict: { padding: 10, borderRadius: 6, backgroundColor: C.goldSoft, marginBottom: 8 },
  verdictText: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '32%', borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 7, marginBottom: 6 },
  cardTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 },
  cardBig: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginVertical: 3 },
  ind: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 9, marginBottom: 8 },
  indHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  indTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line },
  th: { flex: 1, padding: 4, fontFamily: 'Helvetica-Bold', backgroundColor: C.bg },
  td: { flex: 1, padding: 4 },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.muted },
  map: { width: '100%', height: 190, objectFit: 'cover', borderRadius: 6, marginBottom: 8 },
  mock: { backgroundColor: '#111113', color: '#ffffff', padding: 6, borderRadius: 4, marginBottom: 8, fontFamily: 'Helvetica-Bold' },
});

function Badge({ risk, ctx }: { risk: RiskLevel; ctx: FormatContext }) {
  return <Text style={[st.badge, { backgroundColor: RISK_COLOR[risk], color: RISK_INK[risk], borderRadius: 2 }]}>{s(t(ctx.locale, `risk.${risk}`).toUpperCase())}</Text>;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={st.kv}>
      <Text style={st.k}>{s(k)}</Text>
      <Text style={st.v}>{s(v)}</Text>
    </View>
  );
}

function Footer({ ctx, mock }: { ctx: FormatContext; mock: boolean }) {
  return (
    <View style={st.footer} fixed>
      <Text>{s(`Data Corn · ${t(ctx.locale, 'pdf.title')}${mock ? ` · ${t(ctx.locale, 'results.mock')}` : ''}`)}</Text>
      <Text render={({ pageNumber, totalPages }) => s(t(ctx.locale, 'pdf.page', { n: pageNumber, total: totalPages }))} />
    </View>
  );
}

function Header({ ctx, title }: { ctx: FormatContext; title: string }) {
  return (
    <View style={st.head}>
      <View>
        <Text style={st.brand}>
          Data<Text style={st.brandGold}>Corn</Text>
        </Text>
        <Text style={st.muted}>{s(t(ctx.locale, 'app.tagline'))}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={st.title}>{s(title)}</Text>
        <Text style={[st.muted, st.small]}>
          {s(t(ctx.locale, 'pdf.generated', { date: longDate(new Date().toISOString().slice(0, 10), ctx.locale) }))}
        </Text>
      </View>
    </View>
  );
}

/** Línea de la campaña: etapas del año típico y tramos de riesgo. */
function SeasonStrip({ report, ctx }: { report: FieldReport; ctx: FormatContext }) {
  const stages = report.timeline.stages;
  if (stages.length === 0) return null;
  const start = stages[0]!.start;
  const end = stages[stages.length - 1]!.end;
  const span = Math.max(1, (Date.parse(end) - Date.parse(start)) / 86_400_000);
  const x = (iso: string) => 10 + ((Date.parse(iso) - Date.parse(start)) / 86_400_000 / span) * 500;
  return (
    <View style={st.box} wrap={false}>
      <Svg width={520} height={46} viewBox="0 0 520 46">
        <Rect x={10} y={18} width={500} height={8} fill="#ececee" />
        {[...report.timeline.risk_bands].sort((x, y) => SEVERITY[x.risk] - SEVERITY[y.risk]).map((b) => (
          <Rect key={`${b.indicator}${b.start}`} x={x(b.start)} y={18} width={Math.max(4, x(b.end) - x(b.start))} height={8} fill={RISK_COLOR[b.risk]} />
        ))}
        {stages
          .filter((st2) => ['sowing', 'flowering', 'maturity', 'harvest'].includes(st2.stage))
          .map((st2) => (
            <Line key={st2.stage} x1={x(st2.start)} x2={x(st2.start)} y1={12} y2={32} stroke={C.ink} strokeWidth={1.2} />
          ))}
      </Svg>
      <View style={[st.row, { justifyContent: 'space-between' }]}>
        {stages
          .filter((st2) => ['sowing', 'flowering', 'maturity', 'harvest'].includes(st2.stage))
          .map((st2) => (
            <Text key={st2.stage} style={st.small}>
              {s(`${t(ctx.locale, `stage.${st2.stage}`)} ${shortDate(st2.start, ctx.locale)}`)}
            </Text>
          ))}
      </View>
    </View>
  );
}

function lineChart(values: number[], max: number, color: string, threshold?: number): ReactNode {
  const w = 240;
  const h = 64;
  const n = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${((i / n) * w).toFixed(1)},${(h - (Math.max(0, Math.min(v, max)) / max) * h).toFixed(1)}`).join(' ');
  return (
    <Svg width={w} height={h + 2} viewBox={`0 0 ${w} ${h + 2}`}>
      <Rect x={0} y={0} width={w} height={h} fill={C.bg} />
      {threshold != null && <Line x1={0} x2={w} y1={h - (threshold / max) * h} y2={h - (threshold / max) * h} stroke="#111113" strokeWidth={0.8} strokeDasharray="3 2" />}
      <Polyline points={pts} stroke={color} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

function chartFor(ind: Indicator, typical: SeasonRun | null, ctx: FormatContext): { chart: ReactNode; caption: string } | null {
  if (typical && (ind.id === 'flowering_water' || ind.id === 'planting_window' || ind.id === 'irrigation' || ind.id === 'waterlogging')) {
    return { chart: lineChart(typical.water_pct, 100, '#2b6cb0'), caption: t(ctx.locale, 'pdf.chart_water') };
  }
  if (typical && (ind.id === 'flowering_heat' || ind.id === 'frost' || ind.id === 'hybrid_fit')) {
    return {
      chart: lineChart(typical.tmax_c, 45, '#b42318', 35),
      caption: `${t(ctx.locale, 'pdf.chart_heat')} (${format(temperature(35, ctx.units), numberLocale(ctx.locale), 0)})`,
    };
  }
  if (ind.series.length > 0) {
    const max = Math.max(...ind.series.map((p) => p.y), 1);
    return { chart: lineChart(ind.series.map((p) => p.y), max, C.teal), caption: '' };
  }
  return null;
}

function IndicatorBlock({ ind, typical, ctx }: { ind: Indicator; typical: SeasonRun | null; ctx: FormatContext }) {
  const { locale } = ctx;
  const chart = chartFor(ind, typical, ctx);
  const methodKey = ind.evidence.method;
  const method = t(locale, methodKey);
  return (
    <View style={st.ind} wrap={false}>
      <View style={st.indHead}>
        <Text style={st.indTitle}>{s(capitalize(t(locale, `indicator.${ind.id}`)))}</Text>
        <Badge risk={ind.risk} ctx={ctx} />
      </View>
      <Text style={{ marginBottom: 4 }}>{s(messageText(ind.message, ctx))}</Text>
      <View style={st.row}>
        <View style={[st.col, { paddingRight: 8 }]}>
          <KV k={t(locale, 'pdf.method')} v={method === methodKey ? ind.evidence.method : method} />
          <KV k={t(locale, 'pdf.data')} v={ind.evidence.sources.join(', ') || '—'} />
          <KV k={t(locale, 'pdf.years')} v={ind.evidence.years ? `${ind.evidence.years[0]}–${ind.evidence.years[1]}` : '—'} />
          <KV k={t(locale, 'pdf.confidence')} v={t(locale, `confidence.${ind.confidence}`)} />
          {ind.field_check && <KV k={t(locale, 'pdf.check')} v={messageText(ind.field_check, ctx)} />}
        </View>
        <View style={{ width: 244 }}>
          {chart ? (
            <>
              {chart.chart}
              {chart.caption ? <Text style={[st.small, st.muted]}>{s(chart.caption)}</Text> : null}
            </>
          ) : (
            <Text style={[st.small, st.muted]}>{s(t(locale, 'pdf.no_chart'))}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const capitalize = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function buildReportDocument({ report, ctx, cards, mapImage, isSample, mock }: ReportArgs) {
  const { locale, units } = ctx;
  const nf = numberLocale(locale);
  const c = report.context;
  const inputs = report.inputs;
  const typical = pickRun(report, { kind: 'typical' });
  const runs = [...(report.runs ?? [])].sort((a, b) => a.year - b.year);
  const history = [...c.crop_history].sort((a, b) => a.year - b.year);
  const place = [c.admin.county, c.admin.state, c.admin.country].filter(Boolean).join(', ');
  const zones = zonesOf(report);

  return (
    <Document title={`Data Corn · ${t(locale, 'pdf.title')}`} author="Data Corn" language={locale}>
      {/* 1 · Resumen */}
      <Page size="A4" style={st.page}>
        <Header ctx={ctx} title={`${t(locale, 'pdf.summary')} · ${t(locale, 'results.campaign', { season: inputs?.season ?? '' })}`} />
        {mock && <Text style={st.mock}>{s(t(locale, 'pdf.mock'))}</Text>}
        {mapImage ? <Image src={mapImage} style={st.map} /> : <Text style={[st.box, st.muted]}>{s(t(locale, 'pdf.no_map'))}</Text>}
        <View style={st.row}>
          <View style={[st.col, st.box, { marginRight: 8 }]}>
            <Text style={st.cardTitle}>{s(t(locale, 'pdf.field') + (isSample ? ` (${t(locale, 'sample.name')})` : ''))}</Text>
            <KV k={t(locale, 'ctx.area')} v={format(area(c.area_ha, units), nf, 1)} />
            {c.soil && <KV k={t(locale, 'ctx.soil')} v={capitalize(t(locale, `texture.${c.soil.texture_class}`))} />}
            {place && <KV k={t(locale, 'ctx.county')} v={place} />}
            <KV k={t(locale, 'pdf.coords')} v={`${c.centroid.lat.toFixed(4)}, ${c.centroid.lon.toFixed(4)}`} />
            {history.length > 0 && <KV k={t(locale, 'ctx.previous')} v={t(locale, `crop.${history[history.length - 1]!.crop}`)} />}
            {c.enso_now && <KV k={t(locale, 'ctx.enso')} v={`${t(locale, `enso.${c.enso_now.phase}`)} · ${c.enso_now.index} ${c.enso_now.value.toFixed(2)} (${c.enso_now.period})`} />}
          </View>
          <View style={[st.col, st.box]}>
            <Text style={st.cardTitle}>{s(t(locale, 'pdf.inputs'))}</Text>
            {inputs && (
              <>
                <KV k={t(locale, 'pdf.inputs.season')} v={String(inputs.season)} />
                <KV k={t(locale, 'pdf.inputs.planting')} v={longDate(inputs.planting_date, locale)} />
                <KV k={t(locale, 'pdf.inputs.rm')} v={`${inputs.hybrid_rm_days} ${t(locale, 'form.days')}`} />
                <KV k={t(locale, 'pdf.inputs.irrigation')} v={t(locale, `irrigation.${inputs.irrigation}`)} />
                {inputs.irrigation_capacity_mm_day != null && (
                  <KV k={t(locale, 'pdf.inputs.capacity')} v={format(dailyRate(inputs.irrigation_capacity_mm_day, units), nf, 2)} />
                )}
                <KV k={t(locale, 'pdf.inputs.tillage')} v={t(locale, `tillage.${inputs.tillage}`)} />
                {inputs.yield_goal_t_ha != null && <KV k={t(locale, 'pdf.inputs.yield')} v={format(cornYield(inputs.yield_goal_t_ha, units), nf, 1)} />}
              </>
            )}
          </View>
        </View>
        <View style={st.verdict} wrap={false}>
          <View style={[st.row, { justifyContent: 'space-between' }]}>
            <Badge risk={report.summary.risk} ctx={ctx} />
            <Text style={[st.small, st.muted]}>
              {s(t(locale, 'confidence.label', { level: t(locale, `confidence.${report.summary.confidence}`) }))}
            </Text>
          </View>
          <Text style={st.verdictText}>{s(messageText(report.summary.recommendation, ctx))}</Text>
          {report.enso.now && (
            <Text style={[st.small, { marginTop: 3 }]}>
              {s(
                t(locale, 'verdict.enso', {
                  phase: t(locale, `enso.${report.enso.now.phase}`),
                  strength: t(locale, `enso.strength.${report.enso.signal_strength}`),
                }),
              )}
            </Text>
          )}
        </View>
        <SeasonStrip report={report} ctx={ctx} />
        <View style={st.cards}>
          {cards.map((card) => (
            <View key={card.key} style={st.card} wrap={false}>
              <Text style={st.cardTitle}>{s(card.title)}</Text>
              <Badge risk={card.risk} ctx={ctx} />
              <Text style={st.cardBig}>{s(card.big)}</Text>
              <Text style={st.small}>{s(card.sentence)}</Text>
              {card.extra && <Text style={[st.small, st.muted, { marginTop: 2 }]}>{s(card.extra)}</Text>}
            </View>
          ))}
        </View>
        <Footer ctx={ctx} mock={mock} />
      </Page>

      {/* 2-3 · Indicadores en detalle */}
      <Page size="A4" style={st.page} wrap>
        <Header ctx={ctx} title={t(locale, 'pdf.indicators')} />
        {report.indicators.map((ind) => (
          <IndicatorBlock key={ind.id} ind={ind} typical={typical} ctx={ctx} />
        ))}
        <Footer ctx={ctx} mock={mock} />
      </Page>

      {/* 4 · Historia, El Niño, rotación y zonas */}
      <Page size="A4" style={st.page}>
        <Header ctx={ctx} title={t(locale, 'pdf.history')} />
        <Text style={st.h2}>{s(t(locale, 'pdf.stripes'))}</Text>
        {runs.length > 0 && (
          <View style={st.box} wrap={false}>
            <Svg width={520} height={84} viewBox="0 0 520 84">
              {runs.map((r, i) => {
                const w = 500 / runs.length;
                const x = 10 + i * w;
                return (
                  <G key={r.year}>
                    <Rect x={x} y={14} width={w - 2} height={56} fill={yieldColor(r.relative_yield)} />
                    {r.enso_phase === 'el_nino' && <Circle cx={x + w / 2 - 1} cy={7} r={3} fill={ENSO_COLOR.el_nino} />}
                    {r.enso_phase === 'la_nina' && <Circle cx={x + w / 2 - 1} cy={7} r={3} fill={ENSO_COLOR.la_nina} />}
                  </G>
                );
              })}
            </Svg>
            <View style={[st.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <Text style={st.small}>{runs[0]!.year}</Text>
              <Text style={st.small}>{runs[runs.length - 1]!.year}</Text>
            </View>
            <View style={[st.row, { flexWrap: 'wrap' }]}>
              {(
                [
                  [yieldColor(1), 'stripes.good', 'rect'],
                  [yieldColor(0.7), 'stripes.bad', 'rect'],
                  [ENSO_COLOR.el_nino, 'stripes.el_nino', 'dot'],
                  [ENSO_COLOR.la_nina, 'stripes.la_nina', 'dot'],
                ] as const
              ).map(([color, key, shape]) => (
                <View key={key} style={[st.row, { alignItems: 'center', marginRight: 12 }]}>
                  <Svg width={10} height={10} viewBox="0 0 10 10">
                    {shape === 'rect' ? <Rect x={0} y={0} width={10} height={10} fill={color} /> : <Circle cx={5} cy={5} r={4} fill={color} />}
                  </Svg>
                  <Text style={[st.small, { marginLeft: 3 }]}>{s(t(locale, key))}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={st.h2}>{s(t(locale, 'pdf.enso_table'))}</Text>
        <Text style={{ marginBottom: 6 }}>{s(messageText(report.enso.message, ctx))}</Text>
        <View style={st.table} wrap={false}>
          <View style={st.tr}>
            <Text style={st.th}>{s(t(locale, 'pdf.phase'))}</Text>
            <Text style={st.th}>{s(t(locale, 'pdf.n_years'))}</Text>
            <Text style={st.th}>{s(t(locale, 'pdf.deficit'))}</Text>
            <Text style={st.th}>{s(t(locale, 'pdf.heat_days'))}</Text>
            <Text style={st.th}>{s(t(locale, 'pdf.rel_yield'))}</Text>
          </View>
          {report.enso.outcomes.map((o) => (
            <View style={st.tr} key={o.phase}>
              <Text style={st.td}>{s(t(locale, `enso.${o.phase}`))}</Text>
              <Text style={st.td}>{o.years.length}</Text>
              <Text style={st.td}>{o.flowering_water_deficit_mm != null ? s(format(depth(o.flowering_water_deficit_mm, units), nf, 1)) : '—'}</Text>
              <Text style={st.td}>{o.flowering_heat_days != null ? o.flowering_heat_days.toFixed(0) : '—'}</Text>
              <Text style={st.td}>{o.relative_yield != null ? `${Math.round(o.relative_yield * 100)} %` : '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={st.h2}>{s(t(locale, 'card.rotation'))}</Text>
        <Text style={{ marginBottom: 4 }}>{s(messageText(report.rotation.message, ctx))}</Text>
        {strategyViews(report.rotation).map(({ strategy, current, option: o }) => (
          <View key={strategy} style={[st.row, { marginBottom: 3, alignItems: 'center' }]}>
            <Text style={{ width: 150 }}>
              {s(`${t(locale, `rotation.strategy.${strategy}`)}${current ? ` (${t(locale, 'rotation.current')})` : ''}`)}
            </Text>
            {o && o.residue_erosion_risk !== 'no_data' && <Badge risk={o.residue_erosion_risk} ctx={ctx} />}
            {o && o.residue_erosion_risk === 'no_data' && <Text style={[st.small, st.muted]}>{s(t(locale, 'rotation.erosion_unverified'))}</Text>}
            <Text style={[st.small, st.muted, { marginLeft: 6, flex: 1 }]}>{s((o?.notes ?? []).map((n) => messageText(n, ctx)).join(' '))}</Text>
          </View>
        ))}
        <Text style={[st.small, st.muted, { marginBottom: 4 }]}>{s(t(locale, 'rotation.no_carryover'))}</Text>
        {history.length > 0 && (
          <>
            <Text style={[st.cardTitle, { marginTop: 6 }]}>{s(t(locale, 'pdf.crop_history'))}</Text>
            <View style={[st.row, { flexWrap: 'wrap' }]}>
              {history.map((h) => (
                <Text key={h.year} style={[st.small, { width: 62, marginBottom: 2 }]}>
                  {s(`${h.year}: ${t(locale, `crop.${h.crop}`)}`)}
                </Text>
              ))}
            </View>
            <Text style={[st.small, st.muted]}>{s(patternText(String(report.rotation.message.params.pattern ?? ''), locale))}</Text>
          </>
        )}

        <Text style={st.h2}>{s(t(locale, 'pdf.zones'))}</Text>
        {zones ? (
          <View wrap={false}>
            {zoneShares(zones).map((z) => (
              <View key={z.zone} style={[st.row, { alignItems: 'center', marginBottom: 3 }]}>
                <Svg width={10} height={10} viewBox="0 0 10 10">
                  <Rect x={0} y={0} width={10} height={10} fill={ZONE_COLOR[z.zone]} />
                </Svg>
                <Text style={{ marginLeft: 5 }}>
                  {s(
                    t(locale, z.ndvi == null ? 'pdf.zones_row_no_ndvi' : 'pdf.zones_row', {
                      name: t(locale, `legend.zones.${z.zone}`),
                      area_pct: formatParams({ area_pct: z.area_pct }, ctx).area_pct ?? '',
                      ndvi: z.ndvi == null ? '' : num(z.ndvi, locale, 2),
                    }),
                  )}
                </Text>
              </View>
            ))}
            <Text style={[st.small, st.muted, { marginTop: 2 }]}>{s(t(locale, 'pdf.zones_source', zones.meta))}</Text>
          </View>
        ) : (
          <Text style={st.muted}>{s(t(locale, 'pdf.zones_none'))}</Text>
        )}
        <Footer ctx={ctx} mock={mock} />
      </Page>

      {/* 5 · Fuentes y aviso */}
      <Page size="A4" style={st.page}>
        <Header ctx={ctx} title={t(locale, 'pdf.sources')} />
        <Text style={st.h2}>{s(t(locale, 'pdf.data'))}</Text>
        {report.sources.map((src) => (
          <Text key={src} style={{ marginBottom: 2 }}>
            {s(`- ${src}`)}
          </Text>
        ))}
        <Text style={{ marginBottom: 2 }}>{s('- NASA GIBS (Blue Marble, SMAP L4, GPM IMERG, MODIS Terra)')}</Text>
        <Text style={{ marginBottom: 2 }}>{s('- EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)')}</Text>
        <Text style={st.h2}>{s(t(locale, 'pdf.assumptions'))}</Text>
        {[1, 2, 3, 4].map((n) => (
          <Text key={n} style={{ marginBottom: 3 }}>
            {s(`${n}. ${t(locale, `pdf.assumption.${n}`)}`)}
          </Text>
        ))}
        <View style={[st.verdict, { marginTop: 12 }]}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{s(t(locale, 'pdf.disclaimer'))}</Text>
        </View>
        {mock && <Text style={st.mock}>{s(t(locale, 'pdf.mock'))}</Text>}
        <Footer ctx={ctx} mock={mock} />
      </Page>
    </Document>
  );
}
