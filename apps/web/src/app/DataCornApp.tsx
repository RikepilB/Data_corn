import type { Map as MapLibreMap } from 'maplibre-gl';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCorn } from '../application/useDataCorn';
import { useDay } from '../application/dayStore';
import { type Film, useFilm } from '../application/useFilm';
import { type FormatContext, messageText } from '../domain/format';
import { type LngLat, bounds, centroid, checkField } from '../domain/geo';
import { analogDate } from '../domain/season';
import type { UnitSystem } from '../domain/units';
import { zonesOf } from '../domain/zones';
import { type Locale, t } from '../i18n';
import { CLIMATE_LAYERS, nearestAvailable, recentMonths } from '../infrastructure/gibs';
import type { Place } from '../infrastructure/geocode';
import { FIELD_ZOOM, GLOBE_VIEW, SAMPLE_FIELD } from '../infrastructure/mapStyle';
import { Icon } from '../ui/common/Icon';
import { AboutDialog } from '../ui/common/AboutDialog';
import { TopBar } from '../ui/common/TopBar';
import { type LayerChoice, LayerChips, Legend, TimeSlider, ZonesLegend } from '../ui/layers/LayerControls';
import { MapView } from '../ui/map/MapView';
import { fitField, flyToPlace, reducedMotion, snapshotMap, useGlobeSpin } from '../ui/map/camera';
import { bucketColor, waterBucket } from '../ui/map/fillBucket';
import { setClimate, setField, setFieldFill, setZones } from '../ui/map/layers';
import { useDrawing } from '../ui/map/useDrawing';
import { downloadReportPdf } from '../ui/pdf/download';
import { ResultsPanel } from '../ui/results/ResultsPanel';
import { SeasonFilm } from '../ui/results/SeasonFilm';
import { buildCards } from '../ui/results/cards';
import { CalculatingPanel } from '../ui/steps/CalculatingPanel';
import { DrawPanel } from '../ui/steps/DrawPanel';
import { FieldForm } from '../ui/steps/FieldForm';
import { GlobePanel } from '../ui/steps/GlobePanel';

// Rendered once, not per film tick: these only change with the map, the language or the step.
const MapViewMemo = memo(MapView);
const TopBarMemo = memo(TopBar);

/**
 * Keeps the field's colour in step with the film's water level. It lives in its own component so
 * the film's day ticks re-render this null component, not the whole app, and it calls into the map
 * only when the quantised bucket changes (see fillBucket.ts).
 */
function FieldFillSync({ map, film, active }: { map: MapLibreMap | null; film: Film; active: boolean }) {
  const { run, dayStore } = film;
  const bucket = useDay(dayStore, (d) => waterBucket(run?.water_pct[d]));
  useEffect(() => {
    if (!map) return;
    setFieldFill(map, active && bucket >= 0 ? bucketColor(bucket) : null);
  }, [map, active, bucket]);
  return null;
}

function useIsDesktop(): boolean {
  const query = '(min-width: 900px)';
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

/** Pantalla única por pasos (docs/pantalla.md): globo → dibujar → calcular → datos → resultados. */
export default function DataCornApp() {
  const [locale, setLocale] = useState<Locale>(() => (navigator.language?.startsWith('es') ? 'es' : 'en'));
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // Sin capa al inicio: la vista arranca en blanco y negro; las capas de datos son opcionales
  const [layerId, setLayerId] = useState<LayerChoice | null>(null);
  const [globeTime, setGlobeTime] = useState<string>('');
  const [flying, setFlying] = useState(false);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [drawError, setDrawError] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const dc = useDataCorn();
  const film = useFilm(dc.report);
  const desktop = useIsDesktop();
  const ctx: FormatContext = useMemo(() => ({ locale, units }), [locale, units]);
  const { step } = dc;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // --- Globo: giro lento y capa de clima con su deslizador de meses ---------------------------
  const stopSpin = useGlobeSpin(map, step === 'globe' && !flying);
  const layer = layerId && layerId !== 'zones' ? CLIMATE_LAYERS[layerId] : null;
  const months = useMemo(() => (layer ? recentMonths(layer) : []), [layer]);
  useEffect(() => {
    if (months.length) setGlobeTime(months[months.length - 1]!);
  }, [months]);

  // Semana de la película: la capa del mapa se actualiza por semana, no por día
  // Rendimiento: mientras la película corre, la capa cambia cada 4 semanas (cambiarla recarga
  // las teselas); en pausa, la semana exacta.
  const layerStep = film.playing ? 28 : 7;
  // Selecting the week (not the day) re-renders the app every few seconds of playback, not every tick
  const filmWeek = useDay(film.dayStore, (d) => Math.floor(d / layerStep) * (layerStep / 7));
  const filmLayerTime = useMemo(() => {
    if (!layer || !film.run) return null;
    return nearestAvailable(layer, analogDate(film.run, filmWeek * 7));
  }, [layer, film.run, filmWeek]);

  useEffect(() => {
    if (!map) return;
    if (step === 'globe') setClimate(map, layer, globeTime || null);
    else if (step === 'results') setClimate(map, layer, filmLayerTime, 0.4);
    else setClimate(map, null, null);
  }, [map, step, layer, globeTime, filmLayerTime]);

  // --- Lote en el mapa ---------------------------------------------------------------------
  const fieldRing = step === 'calculating' || step === 'form' || step === 'results' ? dc.points : null;
  useEffect(() => {
    if (map) setField(map, fieldRing);
  }, [map, fieldRing]);

  // Zonas del lote (RF-60): solo en resultados y solo si el reporte las trae
  const zones = step === 'results' ? zonesOf(dc.report) : null;
  const zonesOn = layerId === 'zones' && zones != null;
  useEffect(() => {
    if (map) setZones(map, zonesOn ? zones : null);
  }, [map, zonesOn, zones]);

  // Con las zonas a la vista, el lote no se pinta según el agua: se verían dos colores encimados
  const fitPadding = useCallback(
    () =>
      desktop
        ? { top: 100, bottom: step === 'results' ? 250 : 90, left: 60, right: 480 }
        : { top: 136, bottom: Math.round(window.innerHeight * 0.62) + 16, left: 24, right: 24 },
    [desktop, step],
  );

  // En escritorio, el globo se centra a la derecha de la tarjeta del paso 1
  useEffect(() => {
    if (!map) return;
    const onGlobe = step === 'globe';
    const left = desktop && onGlobe ? 460 : 0;
    const bottom = !desktop && onGlobe ? 280 : 0;
    const pad = map.getPadding();
    if (pad.left === left && pad.bottom === bottom) return;
    const zoom = onGlobe && !desktop && map.getZoom() > 1.15 ? 1.05 : undefined;
    map.easeTo({ padding: { left, right: 0, top: 0, bottom }, zoom, duration: reducedMotion() ? 0 : 700 });
  }, [map, step, desktop]);

  // Encuadra el lote al entrar a cada paso (no en cada cambio de puntos)
  const ringForFit = fieldRing && fieldRing.length >= 3 ? fieldRing : null;
  const fitKey = ringForFit ? `${step}|${desktop}|${ringForFit.length}|${ringForFit[0]!.join(',')}` : '';
  useEffect(() => {
    if (map && ringForFit) fitField(map, bounds(ringForFit), fitPadding());
  }, [map, fitKey]);

  // --- Dibujo ------------------------------------------------------------------------------
  const tryClose = useCallback(() => {
    const check = checkField(dc.points);
    if (check.status === 'ok') {
      setDrawError(false);
      dc.closeField(dc.points);
    } else {
      setDrawError(true);
    }
  }, [dc]);
  useDrawing(map, step === 'draw', dc.points, dc.setPoints, tryClose);
  useEffect(() => setDrawError(false), [dc.points.length]);

  // --- Acciones del globo ------------------------------------------------------------------
  // Un toque antes de que el mapa cargue (red lenta en el teléfono) queda en espera y se
  // ejecuta al cargar; antes se perdía sin aviso.
  const pendingFlight = useRef<{ center: LngLat; zoom: number; then: () => void } | null>(null);
  const flyThen = useCallback(
    async (center: LngLat, zoom: number, then: () => void) => {
      if (!map) {
        pendingFlight.current = { center, zoom, then };
        setFlying(true);
        return;
      }
      stopSpin();
      setFlying(true);
      await flyToPlace(map, center, zoom);
      setFlying(false);
      then();
    },
    [map, stopSpin],
  );
  useEffect(() => {
    const p = pendingFlight.current;
    if (!map || !p) return;
    pendingFlight.current = null;
    void flyThen(p.center, p.zoom, p.then);
  }, [map, flyThen]);

  const onLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void flyThen([pos.coords.longitude, pos.coords.latitude], FIELD_ZOOM, dc.startDrawing);
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [flyThen, dc.startDrawing]);

  const onPlace = useCallback(
    (p: Place) => void flyThen([p.lon, p.lat], FIELD_ZOOM, dc.startDrawing),
    [flyThen, dc.startDrawing],
  );

  const onSample = useCallback(
    () => void flyThen(centroid(SAMPLE_FIELD), 14.6, () => dc.closeField(SAMPLE_FIELD, true)),
    [flyThen, dc],
  );

  // Botón «Centrar»: globo → vista inicial; dibujando → los puntos o mi ubicación; con lote → el lote
  const onCenter = useCallback(() => {
    if (!map) return;
    stopSpin();
    const duration = reducedMotion() ? 0 : 900;
    const pts = dc.points;
    if (step === 'globe') {
      map.easeTo({ center: GLOBE_VIEW.center, zoom: desktop ? GLOBE_VIEW.zoom : 1.05, bearing: 0, pitch: 0, duration });
      return;
    }
    if (pts.length >= 2) {
      fitField(map, bounds(pts), fitPadding());
      return;
    }
    if (pts.length === 1) {
      map.easeTo({ center: pts[0]!, zoom: Math.max(map.getZoom(), FIELD_ZOOM), duration });
      return;
    }
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: FIELD_ZOOM, duration }),
      () => undefined,
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [map, step, desktop, dc.points, fitPadding, stopSpin]);

  const dcBackToGlobe = dc.backToGlobe;
  const backToGlobe = useCallback(() => {
    dcBackToGlobe();
    if (map) {
      map.stop();
      map.easeTo({ center: GLOBE_VIEW.center, zoom: GLOBE_VIEW.zoom, duration: reducedMotion() ? 0 : 2600 });
    }
  }, [dcBackToGlobe, map]);

  const onPdf = useCallback(async () => {
    if (!dc.report) return;
    setPdfBusy(true);
    setPdfError(false);
    try {
      const mapImage = map ? await snapshotMap(map) : null;
      await downloadReportPdf({
        report: dc.report,
        ctx,
        cards: buildCards(dc.report, ctx),
        mapImage,
        isSample: dc.isSample,
        mock: dc.mock && !dc.precomputedAt,
      });
    } catch (e) {
      console.error(e);
      setPdfError(true);
    } finally {
      setPdfBusy(false);
    }
  }, [dc.report, dc.isSample, dc.mock, dc.precomputedAt, map, ctx]);

  const showLayers = step === 'globe' || step === 'results';
  const filmView = useMemo(
    () => (dc.report && step === 'results' ? <SeasonFilm film={film} report={dc.report} locale={locale} /> : null),
    [dc.report, step, film, locale],
  );
  const filmNoLayer =
    step === 'results' && layer && film.run && !filmLayerTime
      ? t(locale, 'layer.no_data_year', { year: film.run.year })
      : undefined;
  const zonesMessage = dc.report?.indicators.find((i) => i.id === 'field_zones')?.message;
  // En celular la leyenda de zonas va con la película, dentro del panel: sobre el mapa taparía el lote
  const zonesLegend = useMemo(
    () =>
      zonesOn ? <ZonesLegend zones={zones} note={zonesMessage && messageText(zonesMessage, ctx)} ctx={ctx} /> : null,
    [zonesOn, zones, zonesMessage, ctx],
  );

  const filmSlot = useMemo(
    () =>
      desktop ? null : (
        <>
          {zonesLegend}
          {filmView}
        </>
      ),
    [desktop, zonesLegend, filmView],
  );

  return (
    <div className={`app step-${step}${flying ? ' is-flying' : ''}`}>
      <MapViewMemo locale={locale} onReady={setMap} />
      <FieldFillSync map={map} film={film} active={step === 'results' && !zonesOn} />
      <TopBarMemo locale={locale} units={units} onLocale={setLocale} onUnits={setUnits} onHome={backToGlobe} />
      {!flying && (
        <button type="button" className="mapbtn" onClick={onCenter} title={t(locale, 'map.center_hint')}>
          <Icon name="locate" size={18} />
          <span>{t(locale, 'map.center')}</span>
        </button>
      )}
      {showLayers && !flying && (
        <div className="layerbar">
          <LayerChips value={layerId} onChange={setLayerId} locale={locale} zones={zones != null} />
          {layer && <Legend id={layer.id} locale={locale} note={filmNoLayer} />}
          {desktop && zonesLegend}
        </div>
      )}

      {step === 'globe' && !flying && (
        <div className="globe-dock">
          {layer && months.length > 0 && (
            <TimeSlider months={months} value={globeTime} onChange={setGlobeTime} locale={locale} />
          )}
          <GlobePanel
            locale={locale}
            locating={locating}
            denied={denied}
            onLocate={onLocate}
            onPlace={onPlace}
            onSample={onSample}
            onAbout={openAbout}
          />
        </div>
      )}

      {step === 'draw' && (
        <DrawPanel
          points={dc.points}
          locale={locale}
          units={units}
          showError={drawError}
          onUndo={() => dc.setPoints((p) => p.slice(0, -1))}
          onClose={tryClose}
          onBack={backToGlobe}
        />
      )}

      {step === 'calculating' && (
        <div className="dock-right">
          <CalculatingPanel
            locale={locale}
            done={dc.describeDone}
            error={dc.error}
            onRetry={dc.retry}
            onRedraw={dc.startDrawing}
          />
        </div>
      )}

      {step === 'form' && dc.described && dc.values && (
        <FieldForm
          context={dc.described.context}
          values={dc.values}
          locale={locale}
          units={units}
          busy={dc.analyzing}
          error={dc.error}
          isSample={dc.isSample}
          onChange={dc.setValues}
          onSubmit={dc.analyze}
          onRedraw={dc.startDrawing}
          onBack={dc.isSample ? backToGlobe : dc.backToField}
          backLabel={t(locale, dc.isSample ? 'draw.back' : 'nav.back_field')}
          onForward={dc.canShowResults ? dc.showResults : undefined}
        />
      )}

      {step === 'results' && dc.report && (
        <>
          {desktop && <div className="film-dock">{filmView}</div>}
          <ResultsPanel
            report={dc.report}
            film={film}
            ctx={ctx}
            isSample={dc.isSample}
            mock={dc.mock && !dc.precomputedAt}
            pdfBusy={pdfBusy}
            pdfError={pdfError}
            onPdf={onPdf}
            onChange={dc.editData}
            onNew={dc.startDrawing}
            onRestart={backToGlobe}
            onAbout={openAbout}
            filmSlot={filmSlot}
          />
        </>
      )}

      <AboutDialog open={aboutOpen} locale={locale} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
