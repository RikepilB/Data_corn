// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { type ModelEvent, createOpenRouterModel } from './openrouter';

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

  it('reports the length cap', async () => {
    const { out } = await collect([chunk({ content: 'x' }, 'length')]);
    expect(out.at(-1)).toMatchObject({ finish: 'length' });
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
