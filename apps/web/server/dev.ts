// SI-assisted (Claude Code); reviewed by <name>
// Local server for the chat: `npm run chat:dev`, next to `npm run dev`. Astro's dev server sends
// /api/chat here (astro.config.mjs). It turns each Node request into a standard Request, calls
// handleChat, and streams the Response back. Nothing about a request is logged.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handleChat } from './chat/handler';
import { withBudget } from './chat/budget';
import { RATE_LIMIT_MAX, createRateLimiter } from './chat/limits';
import { type ChatModel, createOpenRouterModel } from './chat/openrouter';
import { createReportFetcher } from './chat/reports';

const PORT = 8787;
const origin = process.env.CHAT_SITE_ORIGIN || 'http://localhost:4321';
const apiKey = process.env.OPENROUTER_API_KEY;
// Local testing only: a spending cap in US dollars, and a higher limit of questions per 10 minutes
// (every local request comes from the same address, so the normal limit is reached quickly).
const budgetUsd = Number(process.env.CHAT_DEV_BUDGET_USD) || 0;
const rateMax = Number(process.env.CHAT_DEV_RATE_LIMIT) || RATE_LIMIT_MAX;

let model: ChatModel | null = apiKey
  ? createOpenRouterModel({ apiKey, model: process.env.OPENROUTER_MODEL, referer: origin })
  : null;
if (model && budgetUsd > 0) {
  model = withBudget(model, budgetUsd, (call, total) =>
    console.log(`Model call $${call.toFixed(4)} · total $${total.toFixed(4)} of $${budgetUsd.toFixed(2)}`),
  );
}

const deps = {
  model,
  fetchReport: createReportFetcher(origin),
  limiter: createRateLimiter(rateMax),
  // Only the HTTP status or an error class name: never the question, the file or the answer.
  onModelError: (reason: string) => console.error(`Model call failed: ${reason}`),
};

const server = createServer(async (req, res) => {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(', '));
    }
    headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'local');
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://localhost:${PORT}${req.url ?? '/'}`, {
      method: req.method,
      headers,
      body: hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined,
      signal: controller.signal,
      // Node's fetch needs this to accept a streamed body.
      duplex: 'half',
    } as RequestInit);

    const response =
      new URL(request.url).pathname === '/api/chat'
        ? await handleChat(request, deps)
        : new Response(JSON.stringify({ code: 'not_found' }), { status: 404 });

    // A request refused before its body was read (too large, wrong method) is still read to the end
    // and thrown away, so the client gets the answer instead of a dropped connection.
    if (!req.readableEnded) req.resume();
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) {
      res.end();
      return;
    }
    const reader = response.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Chat server on http://localhost:${PORT}/api/chat (reports from ${origin})`);
  console.log(model ? 'Model: OpenRouter' : 'No OPENROUTER_API_KEY: every request answers not_configured.');
  if (model && budgetUsd > 0) console.log(`Spending cap: $${budgetUsd.toFixed(2)} (CHAT_DEV_BUDGET_USD)`);
  if (rateMax !== RATE_LIMIT_MAX) console.log(`Rate limit: ${rateMax} questions per 10 minutes (CHAT_DEV_RATE_LIMIT)`);
});
