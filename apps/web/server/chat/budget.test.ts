// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { BudgetExceeded, withBudget } from './budget';
import type { ChatModel, ModelEvent } from './openrouter';

const costing = (usd: number): ChatModel => ({
  async *stream() {
    const end: ModelEvent = { type: 'end', finish: 'stop', toolCalls: [], costUsd: usd };
    yield { type: 'text', delta: 'ok' };
    yield end;
  },
});

const drain = async (m: ChatModel) => {
  for await (const _ of m.stream({ messages: [], tools: [], maxTokens: 1 })) void _;
};

describe('withBudget', () => {
  it('adds up the cost and refuses calls once the cap is reached', async () => {
    const seen: number[] = [];
    const m = withBudget(costing(0.04), 0.1, (_call, total) => seen.push(total));
    await drain(m);
    await drain(m);
    await drain(m);
    expect(m.spentUsd()).toBeCloseTo(0.12);
    expect(seen.map((x) => Number(x.toFixed(2)))).toEqual([0.04, 0.08, 0.12]);
    await expect(drain(m)).rejects.toBeInstanceOf(BudgetExceeded);
    expect(m.calls()).toBe(3);
  });

  it('passes the events through unchanged', async () => {
    const out: ModelEvent[] = [];
    for await (const e of withBudget(costing(0.01), 1).stream({ messages: [], tools: [], maxTokens: 1 })) out.push(e);
    expect(out[0]).toEqual({ type: 'text', delta: 'ok' });
  });
});
