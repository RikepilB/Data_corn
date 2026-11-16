// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it, vi } from 'vitest';
import { FEEDBACK_ENDPOINT, sendFeedback } from './chatClient';

describe('sendFeedback', () => {
  it('posts only the vote fields', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));
    const ok = await sendFeedback({ rating: 'down', reason: 'wrong', reportId: 'hamilton-ne', locale: 'es' }, fetcher as unknown as typeof fetch);
    expect(ok).toBe(true);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FEEDBACK_ENDPOINT);
    expect(JSON.parse(init.body as string)).toEqual({ rating: 'down', reason: 'wrong', reportId: 'hamilton-ne', locale: 'es' });
  });
  it('reports a refusal or a dropped connection as not sent', async () => {
    expect(await sendFeedback({ rating: 'up', reportId: 'a', locale: 'en' }, (async () => new Response('', { status: 429 })) as typeof fetch)).toBe(false);
    expect(await sendFeedback({ rating: 'up', reportId: 'a', locale: 'en' }, (async () => { throw new Error('x'); }) as typeof fetch)).toBe(false);
  });
});
