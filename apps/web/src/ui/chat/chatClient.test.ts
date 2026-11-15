// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { MAX_ATTACHMENT_BYTES, MAX_MESSAGES, parseChatRequest } from '../../../server/chat/limits';
import { t } from '../../i18n';
import { chatAvailable } from './availability';
import {
  KNOWN_ERRORS,
  type ChatMessage,
  buildChatRequest,
  chatIrrigation,
  createNdjsonReader,
  errorKey,
  fitsAttachmentLimit,
  scaledSize,
  sendChat,
  toBase64,
} from './chatClient';

describe('NDJSON reader', () => {
  it('joins lines split across chunks', () => {
    const r = createNdjsonReader();
    expect(r.push('{"type":"text","del')).toEqual([]);
    expect(r.push('ta":"Hi"}\n{"type":"text","delta":" there"}\n{"type":"do')).toEqual([
      { type: 'text', delta: 'Hi' },
      { type: 'text', delta: ' there' },
    ]);
    expect(r.push('ne","truncated":true}')).toEqual([]);
    expect(r.end()).toEqual([{ type: 'done', truncated: true }]);
  });

  it('skips blank and broken lines', () => {
    const r = createNdjsonReader();
    expect(r.push('\nnot json\n{"type":"mystery"}\n{"type":"error","code":"model_error"}\n')).toEqual([
      { type: 'error', code: 'model_error' },
    ]);
  });
});

describe('error messages', () => {
  it('has a sentence in both languages for every known code and the fallback', () => {
    for (const code of [...KNOWN_ERRORS, 'generic']) {
      for (const locale of ['en', 'es'] as const) {
        const key = errorKey(code);
        expect(t(locale, key), `${locale} ${key}`).not.toBe(key);
      }
    }
  });

  it('falls back to the generic sentence', () => {
    expect(errorKey('bad_json')).toBe('chat.error.generic');
    expect(errorKey(undefined)).toBe('chat.error.generic');
    expect(errorKey('rate_limited')).toBe('chat.error.rate_limited');
  });
});

describe('buildChatRequest', () => {
  const base = { reportId: 'hamilton-ne', irrigation: 'pivot', locale: 'es' as const, units: 'metric' as const };

  it('passes the server checks with the attachment on the last question', () => {
    const history: ChatMessage[] = [
      { role: 'user', text: 'one' },
      { role: 'assistant', text: 'answer' },
    ];
    const req = buildChatRequest({
      ...base,
      history,
      question: 'two',
      attachment: { mediaType: 'application/pdf', data: btoa('%PDF-1.4\n') },
    });
    expect(parseChatRequest(req)).toMatchObject({ ok: true });
    expect(req.messages.at(-1)).toMatchObject({ role: 'user', text: 'two', attachment: { mediaType: 'application/pdf' } });
    expect(req.messages.slice(0, -1).every((m) => !('attachment' in m))).toBe(true);
  });

  it('drops a question that got no answer, so turns still alternate', () => {
    const history: ChatMessage[] = [
      { role: 'user', text: 'failed' },
      { role: 'user', text: 'q' },
      { role: 'assistant', text: 'a' },
    ];
    const req = buildChatRequest({ ...base, history, question: 'next' });
    expect(req.messages.map((m) => m.text)).toEqual(['q', 'a', 'next']);
    expect(parseChatRequest(req)).toMatchObject({ ok: true });
  });

  it('keeps only as many turns as the server accepts', () => {
    const history: ChatMessage[] = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `m${i}`,
    }));
    const req = buildChatRequest({ ...base, history, question: 'last' });
    expect(req.messages.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(req.messages.at(-2)?.text).toBe('m39');
    expect(parseChatRequest(req)).toMatchObject({ ok: true });
  });

  it('maps an unknown irrigation to rainfed', () => {
    expect(chatIrrigation('drip')).toBe('drip');
    expect(chatIrrigation('sprinkler')).toBe('none');
  });
});

describe('attachment helpers', () => {
  it('shrinks the long side to the limit and never enlarges', () => {
    expect(scaledSize(4000, 3000, 1568)).toEqual({ width: 1568, height: 1176 });
    expect(scaledSize(1000, 3136, 1568)).toEqual({ width: 500, height: 1568 });
    expect(scaledSize(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it('refuses files over 2.5 MB and empty ones', () => {
    expect(fitsAttachmentLimit(MAX_ATTACHMENT_BYTES)).toBe(true);
    expect(fitsAttachmentLimit(MAX_ATTACHMENT_BYTES + 1)).toBe(false);
    expect(fitsAttachmentLimit(0)).toBe(false);
  });

  it('encodes base64 without a data: prefix, also for large files', () => {
    expect(toBase64(new TextEncoder().encode('%PDF-'))).toBe('JVBERi0=');
    const big = new Uint8Array(100_000).fill(65);
    expect(atob(toBase64(big))).toHaveLength(100_000);
  });
});

describe('sendChat', () => {
  const request = buildChatRequest({
    reportId: 'hamilton-ne',
    irrigation: 'none',
    locale: 'en',
    units: 'imperial',
    history: [],
    question: 'q',
  });
  const reply = (body: BodyInit, init: ResponseInit = {}) => (async () => new Response(body, init)) as unknown as typeof fetch;

  it('streams the text and reports the end', async () => {
    const parts: string[] = [];
    const result = await sendChat(request, (d) => parts.push(d), {
      fetcher: reply('{"type":"text","delta":"A"}\n{"type":"text","delta":"B"}\n{"type":"done"}\n'),
    });
    expect(parts.join('')).toBe('AB');
    expect(result).toEqual({ ok: true, truncated: false });
  });

  it('reads the code of a refusal', async () => {
    const result = await sendChat(request, () => undefined, {
      fetcher: reply('{"code":"rate_limited","message":"x"}', { status: 429 }),
    });
    expect(result).toEqual({ ok: false, code: 'rate_limited' });
  });

  it('reports an error line and a stream cut short', async () => {
    expect(await sendChat(request, () => undefined, { fetcher: reply('{"type":"error","code":"model_error"}\n') })).toEqual({
      ok: false,
      code: 'model_error',
    });
    expect(await sendChat(request, () => undefined, { fetcher: reply('{"type":"text","delta":"A"}\n') })).toEqual({
      ok: false,
      code: 'network',
    });
  });

  it('reports a network failure', async () => {
    const fetcher = (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await sendChat(request, () => undefined, { fetcher })).toEqual({ ok: false, code: 'network' });
  });
});

describe('chatAvailable', () => {
  const on = { enabled: true, step: 'results', isSample: true, precomputedAt: '2026-11-15', hasReport: true };
  it('shows only on the real example results with the flag on', () => {
    expect(chatAvailable(on)).toBe(true);
    expect(chatAvailable({ ...on, enabled: false })).toBe(false);
    expect(chatAvailable({ ...on, step: 'form' })).toBe(false);
    expect(chatAvailable({ ...on, isSample: false })).toBe(false);
    expect(chatAvailable({ ...on, precomputedAt: null })).toBe(false);
    expect(chatAvailable({ ...on, hasReport: false })).toBe(false);
  });
});
