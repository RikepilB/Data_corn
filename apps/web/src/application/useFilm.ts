import { useCallback, useEffect, useMemo, useState } from 'react';
import { filmEvents } from '../domain/film';
import { harvestOdds, waterDays } from '../domain/outlook';
import type { FieldReport, SeasonRun } from '../domain/report';
import { type FilmMode, filmLength, pickRun } from '../domain/season';
import { createDayStore } from './dayStore';

const DAYS_PER_SECOND = 11;
/** Pausa en cada momento clave para que se pueda leer la leyenda. */
const HOLD_MS = 1500;

/** Estado de la película de la campaña: qué año, qué día y si está corriendo (RF-31). */
export function useFilm(report: FieldReport | null) {
  const [mode, setModeState] = useState<FilmMode>({ kind: 'typical' });
  // The day lives in an external store: see dayStore.ts for why it is not React state.
  const [dayStore] = useState(() => createDayStore(0));
  const [playing, setPlaying] = useState(false);
  const run: SeasonRun | null = useMemo(() => (report ? pickRun(report, mode) : null), [report, mode]);
  const length = run ? filmLength(run) : 0;
  const events = useMemo(() => (run ? filmEvents(run) : []), [run]);
  const odds = useMemo(() => (run && report ? harvestOdds(report.runs ?? [], run) : []), [run, report]);
  const waterLeft = useMemo(() => (run ? waterDays(run) : []), [run]);

  // Al llegar un reporte nuevo: año típico, día de floración visible y en pausa
  useEffect(() => {
    setModeState({ kind: 'typical' });
    setPlaying(false);
    if (!report) return;
    const typical = pickRun(report, { kind: 'typical' });
    const flower = typical?.stages.find((s) => s.stage === 'flowering');
    const i = typical && flower ? Math.max(0, daysFrom(typical.start, flower.start)) : 0;
    dayStore.set(i);
  }, [report, dayStore]);

  useEffect(() => {
    if (!playing || length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    let acc = dayStore.get();
    let raf = 0;
    let timer = 0;
    let holdUntil = 0;
    let next = events.findIndex((e) => e.day > acc);
    const stepOnce = (now: number) => {
      if (now < holdUntil) {
        last = now;
        return true;
      }
      acc += ((now - last) / 1000) * DAYS_PER_SECOND;
      last = now;
      const e = next >= 0 ? events[next] : undefined;
      if (e && acc >= e.day) {
        acc = e.day;
        holdUntil = now + HOLD_MS;
        next = next + 1 < events.length ? next + 1 : -1;
      }
      if (acc >= length - 1) {
        dayStore.set(length - 1);
        setPlaying(false);
        return false;
      }
      dayStore.set(Math.floor(acc));
      return true;
    };
    if (reduce) {
      // Movimiento reducido: avanza por semanas, sin animación continua
      timer = window.setInterval(() => {
        acc = Math.min(acc + 7, length - 1);
        dayStore.set(Math.floor(acc));
        if (acc >= length - 1) setPlaying(false);
      }, 700);
    } else {
      const loop = (now: number) => {
        if (stepOnce(now)) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [playing, length, events, dayStore]);

  const setDay = useCallback(
    (i: number) => dayStore.set(Math.max(0, Math.min(Math.round(i), Math.max(length - 1, 0)))),
    [length, dayStore],
  );

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && dayStore.get() >= length - 1) dayStore.set(0);
      return !p;
    });
  }, [length, dayStore]);

  const setMode = useCallback(
    (m: FilmMode, autoplay = false) => {
      setModeState(m);
      dayStore.set(0);
      setPlaying(autoplay);
    },
    [dayStore],
  );

  // Stable identity between ticks, so memoised children skip renders the film did not cause
  return useMemo(
    () => ({ mode, setMode, run, dayStore, setDay, playing, toggle, setPlaying, length, events, odds, waterLeft }),
    [mode, setMode, run, dayStore, setDay, playing, toggle, length, events, odds, waterLeft],
  );
}

function daysFrom(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = new Date(pa[0]!, pa[1]! - 1, pa[2]!).getTime();
  const db = new Date(pb[0]!, pb[1]! - 1, pb[2]!).getTime();
  return Math.round((db - da) / 86_400_000);
}

export type Film = ReturnType<typeof useFilm>;
