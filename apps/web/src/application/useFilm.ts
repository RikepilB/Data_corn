import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldReport, SeasonRun } from '../domain/report';
import { type FilmMode, filmLength, pickRun } from '../domain/season';

const DAYS_PER_SECOND = 10;

/** Estado de la película de la campaña: qué año, qué día y si está corriendo (RF-31). */
export function useFilm(report: FieldReport | null) {
  const [mode, setModeState] = useState<FilmMode>({ kind: 'typical' });
  const [day, setDayState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const run: SeasonRun | null = useMemo(() => (report ? pickRun(report, mode) : null), [report, mode]);
  const length = run ? filmLength(run) : 0;
  const dayRef = useRef(0);
  dayRef.current = day;

  // Al llegar un reporte nuevo: año típico, día de floración visible y en pausa
  useEffect(() => {
    setModeState({ kind: 'typical' });
    setPlaying(false);
    if (!report) return;
    const typical = pickRun(report, { kind: 'typical' });
    const flower = typical?.stages.find((s) => s.stage === 'flowering');
    const i = typical && flower ? Math.max(0, daysFrom(typical.start, flower.start)) : 0;
    setDayState(i);
  }, [report]);

  useEffect(() => {
    if (!playing || length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    let acc = dayRef.current;
    let raf = 0;
    let timer = 0;
    const stepOnce = (now: number) => {
      acc += ((now - last) / 1000) * DAYS_PER_SECOND;
      last = now;
      if (acc >= length - 1) {
        setDayState(length - 1);
        setPlaying(false);
        return false;
      }
      setDayState(Math.floor(acc));
      return true;
    };
    if (reduce) {
      // Movimiento reducido: avanza por semanas, sin animación continua
      timer = window.setInterval(() => {
        acc = Math.min(acc + 7, length - 1);
        setDayState(Math.floor(acc));
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
  }, [playing, length]);

  const setDay = useCallback(
    (i: number) => setDayState(Math.max(0, Math.min(Math.round(i), Math.max(length - 1, 0)))),
    [length],
  );

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && dayRef.current >= length - 1) setDayState(0);
      return !p;
    });
  }, [length]);

  const setMode = useCallback((m: FilmMode, autoplay = false) => {
    setModeState(m);
    setDayState(0);
    setPlaying(autoplay);
  }, []);

  return { mode, setMode, run, day, setDay, playing, toggle, setPlaying, length };
}

function daysFrom(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = new Date(pa[0]!, pa[1]! - 1, pa[2]!).getTime();
  const db = new Date(pb[0]!, pb[1]! - 1, pb[2]!).getTime();
  return Math.round((db - da) / 86_400_000);
}

export type Film = ReturnType<typeof useFilm>;
