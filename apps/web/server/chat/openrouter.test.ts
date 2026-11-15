// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { type ModelEvent, ModelHttpError, createOpenRouterModel } from './openrouter';

function sse(lines: string[]): ReadableStream<Uint8Array> {
  const text = lines.join('\n') + '\n';
  // Split in odd places to test the line buffering.
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
      c.close();
    },
  });
}

const chunk = (delta: unknown, finish: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}`;

async function collect(lines: string[], status = 200) {
  const sent: RequestInit[] = [];
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    sent.push(init);
    return new Response(status === 200 ? sse(lines) : 'nope', { status });
  }) as unknown as typeof fetch;
  const model = createOpenRouterModel({ apiKey: 'test-key', model: 'm', fetcher });
  const out: ModelEvent[] = [];
  for await (const e of model.stream({ messages: [{ role: 'user', content: 'hi' }], tools: [], maxTokens: 10 })) out.push(e);
  return { out, sent };
}

describe('OpenRouter model', () => {
  it('streams text and ignores keep-alive comments', async () => {
    const { out } = await collect([': OPENROUTER PROCESSING', chunk({ content: 'Hel' }), chunk({ content: 'lo' }, 'stop'), 'data: [DONE]']);
    expect(out).toEqual([
      { type: 'text', delta: 'Hel' },
      { type: 'text', delta: 'lo' },
      { type: 'end', finish: 'stop', toolCalls: [] },
    ]);
  });

  it('joins tool call fragments', async () => {
    const { out } = await collect([
      chunk({ tool_calls: [{ index: 0, id: 'c1', function: { name: 'get_indicator', arguments: '{"id":' } }] }),
      chunk({ tool_calls: [{ index: 0, function: { arguments: '"frost"}' } }] }, 'tool_calls'),
      'data: [DONE]',
    ]);
    expect(out.at(-1)).toEqual({
      type: 'end',
      finish: 'tool_calls',
      toolCalls: [{ id: 'c1', name: 'get_indicator', arguments: '{"id":"frost"}' }],
    });
  });

  it('reads the cost from the usage chunk', async () => {
    const { out, sent } = await collect([
      chunk({ content: 'x' }, 'stop'),
      `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0.0123 } })}`,
      'data: [DONE]',
    ]);
    expect(out.at(-1)).toEqual({ type: 'end', finish: 'stop', toolCalls: [], costUsd: 0.0123 });
    expect(JSON.parse(String(sent[0]!.body)).usage).toEqual({ include: true });
  });

  it('reports the length cap', async () => {
    const { out } = await collect([chunk({ content: 'x' }, 'length')]);
    expect(out.at(-1)).toMatchObject({ finish: 'length' });
  });

  it('retries a busy service, then streams', async () => {
    const statuses = [429, 503, 200];
    const waits: number[] = [];
    const fetcher = (async () => {
      const status = statuses.shift()!;
      return status === 200
        ? new Response(sse([chunk({ content: 'ok' }, 'stop')]), { status })
        : new Response('busy', { status, headers: status === 429 ? { 'retry-after': '2' } : {} });
    }) as unknown as typeof fetch;
    const model = createOpenRouterModel({ apiKey: 'k', fetcher, sleep: async (ms) => void waits.push(ms) });
    const out: ModelEvent[] = [];
    for await (const e of model.stream({ messages: [], tools: [], maxTokens: 1 })) out.push(e);
    expect(out[0]).toEqual({ type: 'text', delta: 'ok' });
    expect(waits).toEqual([2000, 4000]);
  });

  it('gives up after two retries with the last status', async () => {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response('busy', { status: 429 });
    }) as unknown as typeof fetch;
    const model = createOpenRouterModel({ apiKey: 'k', fetcher, sleep: async () => undefined });
    const run = async () => {
      for await (const _ of model.stream({ messages: [], tools: [], maxTokens: 1 })) void _;
    };
    await expect(run()).rejects.toEqual(new ModelHttpError(429));
    expect(calls).toBe(3);
  });

  it('does not retry a refused key', async () => {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response('no', { status: 401 });
    }) as unknown as typeof fetch;
    const model = createOpenRouterModel({ apiKey: 'k', fetcher, sleep: async () => undefined });
    const run = async () => {
      for await (const _ of model.stream({ messages: [], tools: [], maxTokens: 1 })) void _;
    };
    await expect(run()).rejects.toBeInstanceOf(ModelHttpError);
    expect(calls).toBe(1);
  });

  it('throws on an HTTP error without echoing the body', async () => {
    await expect(collect([], 401)).rejects.toThrow('OpenRouter answered 401');
  });

  it('sends the key only as a bearer header', async () => {
    const { sent } = await collect([chunk({ content: 'x' }, 'stop')]);
    expect((sent[0]!.headers as Record<string, string>).authorization).toBe('Bearer test-key');
    expect(String(sent[0]!.body)).not.toContain('test-key');
  });
});
