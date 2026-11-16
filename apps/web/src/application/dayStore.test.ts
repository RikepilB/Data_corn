// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it, vi } from 'vitest';
import { createDayStore } from './dayStore';

describe('day store', () => {
  it('holds the day and notifies subscribers on change only', () => {
    const store = createDayStore(3);
    const fn = vi.fn();
    store.subscribe(fn);
    expect(store.get()).toBe(3);
    store.set(3);
    expect(fn).not.toHaveBeenCalled();
    store.set(4);
    expect(store.get()).toBe(4);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createDayStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.set(9);
    expect(fn).not.toHaveBeenCalled();
  });

  it('survives a listener that unsubscribes during a notification', () => {
    const store = createDayStore();
    const calls: string[] = [];
    const offA = store.subscribe(() => {
      calls.push('a');
      offA();
    });
    store.subscribe(() => calls.push('b'));
    store.set(1);
    store.set(2);
    expect(calls).toEqual(['a', 'b', 'b']);
  });
});
