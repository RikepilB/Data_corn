// SI-assisted (Claude Code); reviewed by <name>
// POST /api/chat-feedback. A thumbs up or down on one assistant answer. It records only the vote,
// an optional reason from a fixed list, the report id and the language. It never receives or
// logs the question, the answer, a file or free text, so the chat's privacy notice stays true.
import { REPORT_ID, type RateLimiter } from './limits';

export const FEEDBACK_RATINGS = ['up', 'down'] as const;
export const FEEDBACK_REASONS = ['wrong', 'unclear', 'not_useful'] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export interface FeedbackEntry {
  rating: FeedbackRating;
  reason: FeedbackReason | null;
  reportId: string;
  locale: 'en' | 'es';
}

export interface FeedbackDeps {
  limiter: RateLimiter;
  /** Where one entry goes. On Vercel, a printed line is kept in the project's runtime logs. */
  record: (entry: FeedbackEntry) => void;
  now?: () => number;
}

const MAX_BODY = 1024;

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** The entry, or null when the body is not exactly a valid vote. Unknown fields are dropped. */
export function parseFeedback(body: unknown): FeedbackEntry | null {
  if (typeof body !== 'object' || body === null) return null;
  const v = body as Record<string, unknown>;
  const rating = FEEDBACK_RATINGS.find((r) => r === v.rating);
  if (!rating) return null;
  const reason = v.reason == null ? null : (FEEDBACK_REASONS.find((r) => r === v.reason) ?? undefined);
  if (reason === undefined) return null;
  if (reason !== null && rating !== 'down') return null;
  if (typeof v.reportId !== 'string' || !REPORT_ID.test(v.reportId)) return null;
  if (v.locale !== 'en' && v.locale !== 'es') return null;
  return { rating, reason, reportId: v.reportId, locale: v.locale };
}

export async function handleFeedback(request: Request, deps: FeedbackDeps): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { code: 'method_not_allowed' });
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = `feedback:${forwarded || request.headers.get('x-real-ip') || 'local'}`;
  const limit = deps.limiter.check(key, (deps.now ?? Date.now)());
  if (!limit.ok) return reply(429, { code: 'rate_limited' });
  const text = await request.text();
  if (text.length > MAX_BODY) return reply(413, { code: 'body_too_large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400, { code: 'bad_json' });
  }
  const entry = parseFeedback(body);
  if (!entry) return reply(400, { code: 'bad_feedback' });
  deps.record(entry);
  return reply(200, { ok: true });
}
