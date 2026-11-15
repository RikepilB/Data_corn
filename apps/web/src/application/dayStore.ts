// SI-assisted (Claude Code); reviewed by <name>
import { useSyncExternalStore } from 'react';

/**
 * The film's current day, outside React state. The film ticks ~10 times a second; keeping the day
 * in `useState` at the app root re-rendered the whole app on every tick. Here only the components
 * that read the day (through `useDay`) re-render, and a selector lets them re-render only when
 * what they derive from it (a colour bucket, a week) changes.
 */
export interface DayStore {
  get: () => number;
  set: (day: number) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createDayStore(initial = 0): DayStore {
  let day = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => day,
    set: (next) => {
      if (next === day) return;
      day = next;
      for (const l of [...listeners]) l();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Subscribes to a value derived from the day; re-renders only when the selected primitive changes. */
export function useDay<T extends number | string | boolean>(store: DayStore, select: (day: number) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}
