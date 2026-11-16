// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { type FeedbackEntry, handleFeedback, parseFeedback } from './feedback';
import { createRateLimiter } from './limits';

const post = (body: unknown) =>
  new Request('http://x/api/chat-feedback', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

function setup(max = 20) {
  const seen: FeedbackEntry[] = [];
  return { seen, deps: { limiter: createRateLimiter(max), record: (e: FeedbackEntry) => seen.push(e), now: () => 0 } };
}

describe('parseFeedback', () => {
  it('accepts a vote and drops unknown fields such as free text', () => {
    expect(parseFeedback({ rating: 'up', reportId: 'hamilton-ne', locale: 'en', text: 'my farm is at 12 Main St' })).toEqual({
      rating: 'up', reason: null, reportId: 'hamilton-ne', locale: 'en',
    });
  });
  it('accepts a reason only with a down vote', () => {
    expect(parseFeedback({ rating: 'down', reason: 'wrong', reportId: 'a', locale: 'es' })?.reason).toBe('wrong');
    expect(parseFeedback({ rating: 'up', reason: 'wrong', reportId: 'a', locale: 'es' })).toBeNull();
  });
  it.each([
    [{ rating: 'meh', reportId: 'a', locale: 'en' }],
    [{ rating: 'down', reason: 'rude', reportId: 'a', locale: 'en' }],
    [{ rating: 'up', reportId: 'Bad Id!', locale: 'en' }],
    [{ rating: 'up', reportId: 'a', locale: 'fr' }],
    [null],
    ['x'],
  ])('rejects %j', (body) => expect(parseFeedback(body)).toBeNull());
});

describe('handleFeedback', () => {
  it('records a valid vote', async () => {
    const { seen, deps } = setup();
    const res = await handleFeedback(post({ rating: 'down', reason: 'unclear', reportId: 'hamilton-ne', locale: 'en' }), deps);
    expect(res.status).toBe(200);
    expect(seen).toEqual([{ rating: 'down', reason: 'unclear', reportId: 'hamilton-ne', locale: 'en' }]);
  });
  it('refuses other methods, bad JSON, bad votes and big bodies without recording', async () => {
    const { seen, deps } = setup();
    expect((await handleFeedback(new Request('http://x', { method: 'GET' }), deps)).status).toBe(405);
    expect((await handleFeedback(post('{nope'), deps)).status).toBe(400);
    expect((await handleFeedback(post({ rating: 'x' }), deps)).status).toBe(400);
    expect((await handleFeedback(post({ rating: 'up', pad: 'a'.repeat(2000) }), deps)).status).toBe(413);
    expect(seen).toEqual([]);
  });
  it('rate limits', async () => {
    const { deps } = setup(1);
    const vote = { rating: 'up', reportId: 'a', locale: 'en' };
    expect((await handleFeedback(post(vote), deps)).status).toBe(200);
    expect((await handleFeedback(post(vote), deps)).status).toBe(429);
  });
});
