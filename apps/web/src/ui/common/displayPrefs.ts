// SI-assisted (Claude Code); reviewed by <name>
// Display preferences (text size, high contrast, calm mode). They only set data-* attributes on
// <html>; styles/tokens.css does the rest. Stored in localStorage inside try/catch, so the page
// works with storage blocked. The inline script in BaseLayout.astro applies them before first paint
// with the same key and shape.
import { useSyncExternalStore } from 'react';

export type TextSize = 'standard' | 'large' | 'xlarge';
export type Contrast = 'standard' | 'high';
export interface DisplayPrefs {
  text: TextSize;
  contrast: Contrast;
  calm: boolean;
}

export const DISPLAY_KEY = 'datacorn.display';
const TEXTS: TextSize[] = ['standard', 'large', 'xlarge'];
const CONTRASTS: Contrast[] = ['standard', 'high'];

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

function defaults(): DisplayPrefs {
  // The device's own contrast request is the starting point when nothing is stored
  return { text: 'standard', contrast: media('(prefers-contrast: more)') ? 'high' : 'standard', calm: false };
}

function read(): DisplayPrefs {
  const base = defaults();
  try {
    const raw = window.localStorage.getItem(DISPLAY_KEY);
    if (!raw) return base;
    const v = JSON.parse(raw) as Partial<DisplayPrefs>;
    return {
      text: TEXTS.includes(v.text as TextSize) ? (v.text as TextSize) : base.text,
      contrast: CONTRASTS.includes(v.contrast as Contrast) ? (v.contrast as Contrast) : base.contrast,
      calm: typeof v.calm === 'boolean' ? v.calm : base.calm,
    };
  } catch {
    return base;
  }
}

function apply(p: DisplayPrefs): void {
  const el = document.documentElement;
  el.dataset.text = p.text;
  el.dataset.contrast = p.contrast;
  el.dataset.calm = String(p.calm);
}

let current: DisplayPrefs | null = null;
const listeners = new Set<() => void>();

function snapshot(): DisplayPrefs {
  if (!current) {
    current = read();
    apply(current);
  }
  return current;
}

export function setDisplayPrefs(patch: Partial<DisplayPrefs>): void {
  current = { ...snapshot(), ...patch };
  apply(current);
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(current));
  } catch {
    // storage blocked: the choice still holds for this visit
  }
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const serverSnapshot: DisplayPrefs = { text: 'standard', contrast: 'standard', calm: false };

export function useDisplayPrefs(): DisplayPrefs {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}

/** The device asks for less motion. */
export const systemReducedMotion = () => media('(prefers-reduced-motion: reduce)');

/** No autoplay and no animated camera when the device or the calm mode asks for it. */
export const motionAllowed = () => !systemReducedMotion() && snapshot().calm === false;
