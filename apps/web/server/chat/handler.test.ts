// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES, MAX_TOOL_ITERATIONS, createRateLimiter } from './limits';
import { handleChat, toModelMessages } from './handler';
import { type ChatModel, ModelHttpError } from './openrouter';
import { SAMPLE_FILES, body, callTool, deps, events, post, say, scriptedModel } from './testKit';

describe('handleChat refusals', () => {
  it('refuses other methods with 405', async () => {
    const res = await handleChat(new Request('http://localhost/api/chat'), deps(scriptedModel([])));
    expect(res.status).toBe(405);
    expect(await res.json()).toMatchObject({ code: 'method_not_allowed' });
  });

  it('says not_configured without a model', async () => {
    const res = await handleChat(post(body()), deps(null));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'not_configured' });
  });

  it('rate-limits per client', async () => {
    const d = deps(scriptedModel([say('a'), say('b')]), { limiter: createRateLimiter(1, 60_000) });
    expect((await handleChat(post(body(), { 'x-forwarded-for': '1.1.1.1' }), d)).status).toBe(200);
    const second = await handleChat(post(body(), { 'x-forwarded-for': '1.1.1.1' }), d);
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).toBe('60');
    expect((await handleChat(post(body(), { 'x-forwarded-for': '2.2.2.2' }), d)).status).toBe(200);
  });

  it('refuses a body over the limit', async () => {
    const res = await handleChat(post('x'.repeat(MAX_BODY_BYTES + 1)), deps(scriptedModel([])));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'body_too_large' });
  });

  it('refuses bad JSON and extra fields', async () => {
    expect(await (await handleChat(post('{'), deps(scriptedModel([])))).json()).toMatchObject({ code: 'bad_json' });
    const extra = await handleChat(post({ ...body(), url: 'http://evil' }), deps(scriptedModel([])));
    expect(await extra.json()).toMatchObject({ code: 'unknown_field' });
  });

  it('refuses a report that is not the real example', async () => {
    const res = await handleChat(post(body({ reportId: 'thomas-ks' })), deps(scriptedModel([])));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'unknown_report' });
  });

  it('says report_unavailable when the files cannot be read', async () => {
    const res = await handleChat(post(body()), deps(scriptedModel([]), { fetchReport: async () => null }));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'report_unavailable' });
  });
});

describe('handleChat stream', () => {
  it('streams text and done', async () => {
    const res = await handleChat(post(body()), deps(scriptedModel([say('Hello')])));
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    expect(await events(res)).toEqual([{ type: 'text', delta: 'Hello' }, { type: 'done' }]);
  });

  it('runs tools against the report and sends their results back', async () => {
    const model = scriptedModel([callTool('get_summary'), say('It is high.')]);
    const res = await handleChat(post(body()), deps(model));
    expect(await events(res)).toEqual([{ type: 'text', delta: 'It is high.' }, { type: 'done' }]);
    const second = model.calls[1]!.messages;
    const toolReply = second.at(-1);
    expect(toolReply).toMatchObject({ role: 'tool', toolCallId: 'id_get_summary' });
    expect(JSON.parse((toolReply as { content: string }).content)).toMatchObject({ overall_level: 'High' });
  });

  it('marks a truncated answer', async () => {
    const model = scriptedModel([[{ type: 'text', delta: 'Long' }, { type: 'end', finish: 'length', toolCalls: [] }]]);
    expect(await events(await handleChat(post(body()), deps(model)))).toEqual([
      { type: 'text', delta: 'Long' },
      { type: 'done', truncated: true },
    ]);
  });

  it('stops after too many tool rounds', async () => {
    const model = scriptedModel(Array.from({ length: MAX_TOOL_ITERATIONS }, () => callTool('get_summary')));
    expect((await events(await handleChat(post(body()), deps(model)))).at(-1)).toEqual({
      type: 'error',
      code: 'too_many_tool_rounds',
    });
  });

  it('turns a model failure into model_error without details', async () => {
    const reasons: string[] = [];
    const res = await handleChat(post(body()), deps(scriptedModel([]), { onModelError: (r) => reasons.push(r) }));
    expect(await events(res)).toEqual([{ type: 'error', code: 'model_error' }]);
    expect(reasons).toEqual(['Error']);
  });

  it('reports only the HTTP status of a refused model call', async () => {
    const reasons: string[] = [];
    const refused: ChatModel = {
      // eslint-disable-next-line require-yield
      async *stream() {
        throw new ModelHttpError(402);
      },
    };
    await events(await handleChat(post(body()), deps(refused, { onModelError: (r) => reasons.push(r) })));
    expect(reasons).toEqual(['HTTP 402']);
  });

  it('says model_busy when the model service is still rate limited', async () => {
    const busy: ChatModel = {
      // eslint-disable-next-line require-yield
      async *stream() {
        throw new ModelHttpError(429);
      },
    };
    expect(await events(await handleChat(post(body()), deps(busy)))).toEqual([{ type: 'error', code: 'model_busy' }]);
  });

  it('uses the irrigation variant on screen', async () => {
    const model = scriptedModel([callTool('get_summary'), say('ok')]);
    await events(await handleChat(post(body({ irrigation: 'pivot' })), deps(model)));
    const result = JSON.parse((model.calls[1]!.messages.at(-1) as { content: string }).content);
    expect(result.choices.irrigation).toBe('Center pivot');
  });
});

describe('toModelMessages', () => {
  it('puts an image before the question', () => {
    const msgs = toModelMessages(
      body({ messages: [{ role: 'user', text: 'What is this?', attachment: { mediaType: 'image/jpeg', data: SAMPLE_FILES.jpeg } }] }),
    );
    expect(msgs[0]!.role).toBe('system');
    expect(msgs[1]).toEqual({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${SAMPLE_FILES.jpeg}` } },
        { type: 'text', text: 'What is this?' },
      ],
    });
  });

  it('sends a PDF as a file', () => {
    const msgs = toModelMessages(
      body({ messages: [{ role: 'user', text: '', attachment: { mediaType: 'application/pdf', data: SAMPLE_FILES.pdf } }] }),
    );
    expect(msgs[1]).toMatchObject({ content: [{ type: 'file', file: { filename: 'attachment.pdf' } }] });
  });

  it('asks for tú in Spanish', () => {
    const system = toModelMessages(body({ locale: 'es' }))[0] as { content: string };
    expect(system.content).toContain('tú');
  });
});
