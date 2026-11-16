// SI-assisted (Claude Code); reviewed by <name>
// Vercel function for POST /api/chat. It only wires the pieces in server/chat together; all the
// checks are in handleChat. The OpenRouter key comes from the project's environment variables and
// is never logged or sent to the browser.
import { handleChat } from '../server/chat/handler';
import { createRateLimiter } from '../server/chat/limits';
import { createOpenRouterModel } from '../server/chat/openrouter';
import { createReportFetcher } from '../server/chat/reports';

/** Same as `site` in astro.config.mjs. */
const SITE_ORIGIN = 'https://field-shift-datacorn.vercel.app';
const origin = process.env.CHAT_SITE_ORIGIN || SITE_ORIGIN;

const apiKey = process.env.OPENROUTER_API_KEY;
const model = apiKey
  ? createOpenRouterModel({ apiKey, model: process.env.OPENROUTER_MODEL, referer: SITE_ORIGIN })
  : null;
const fetchReport = createReportFetcher(origin);
// One per running instance. Instances do not share it (see createRateLimiter).
const limiter = createRateLimiter();

const handle = (request: Request): Promise<Response> => handleChat(request, { model, fetchReport, limiter });

export const POST = handle;
// Every other method gets 405 from handleChat.
export const GET = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
