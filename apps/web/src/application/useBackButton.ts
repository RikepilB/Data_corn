// SI-assisted (Claude Code); reviewed by <name>
import { useEffect, useRef } from 'react';

const KEY = 'dataCornDepth';

function depthOf(state: unknown): number {
  const d = (state as Record<string, unknown> | null)?.[KEY];
  return typeof d === 'number' ? d : 0;
}

/**
 * Makes the browser's (and the phone's) Back button go one step back instead of leaving the site.
 *
 * The history holds one extra entry per step past the globe, all with the page's own URL, so
 * `?mock=1` and a reload are untouched. The app stays the source of truth: its own controls change
 * the step and the history only follows; a Back press calls the same `onBack` as the Back control.
 *
 * @param depth how many Back presses reach the globe from the step on screen
 */
export function useBackButton(depth: number, onBack: () => void): void {
  // Our entries above the one the page opened on
  const have = useRef(0);
  // popstate events caused by our own history.go(), not by the person
  const ignore = useRef(0);
  const back = useRef(onBack);
  back.current = onBack;

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (ignore.current > 0) {
        ignore.current--;
        return;
      }
      const at = depthOf(e.state);
      if (at < have.current) {
        // One press is one step, even if the browser skipped further; the effect below re-adds entries
        have.current = at;
        back.current();
      } else if (at > have.current) {
        // Forward: a step cannot be replayed from here, so stay where the app is
        ignore.current++;
        history.go(have.current - at);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (depth > have.current) {
      for (let d = have.current + 1; d <= depth; d++) history.pushState({ [KEY]: d }, '');
    } else if (depth < have.current) {
      ignore.current++;
      history.go(depth - have.current);
    }
    have.current = depth;
  }, [depth]);
}
