// SI-assisted (Claude Code); reviewed by <name>
// POST /api/chat. Checks the request, loads the report on the person's screen, and streams the
// model's answer back as newline-delimited JSON:
//   {"type":"text","delta":"..."}   part of the answer
//   {"type":"done","truncated":true?} the end (truncated: the answer hit the length cap)
//   {"type":"error","code":"model_error"|"too_many_tool_rounds"}
// Refusals before the stream starts are plain JSON {code, message} with an HTTP error status.
// Nothing a person types or uploads is logged or stored: it lives only for this request.
import type { FormatContext } from '../../src/domain/format';
import {
  type ChatErrorCode,
  type ChatRequest,
  MAX_BODY_BYTES,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ITERATIONS,
  PDF_TYPE,
  type RateLimiter,
  parseChatRequest,
} from './limits';
import type { ChatModel, ContentPart, ModelEvent, ModelMessage } from './openrouter';
import { systemPrompt } from './prompt';
import { type FetchReport, type LoadedReport, loadReport } from './reports';
import { TOOLS, runTool } from './tools';

export interface ChatDeps {
  /** Null when no API key is configured: every request gets `not_configured`. */
  model: ChatModel | null;
  fetchReport: FetchReport;
  limiter: RateLimiter;
  now?: () => number;
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'done'; truncated?: true }
  | { type: 'error'; code: 'model_error' | 'too_many_tool_rounds' };

const MESSAGES: Partial<Record<ChatErrorCode, string>> = {
  method_not_allowed: 'Use POST.',
  rate_limited: 'Too many questions. Wait a few minutes.',
  not_configured: 'The assistant is not set up on this server.',
  body_too_large: 'The request is too large.',
  bad_json: 'The body is not JSON.',
  unknown_report: 'There is no report computed in advance with that id and irrigation.',
  report_unavailable: 'The report could not be read.',
  attachment_too_large: 'The attachment is too large.',
  bad_attachment_type: 'Attach a JPEG, PNG or WebP photo, or a PDF.',
  attachment_mismatch: 'The attachment is not the type it claims to be.',
};

const STATUS: Partial<Record<ChatErrorCode, number>> = {
  unknown_report: 404,
  report_unavailable: 502,
};

function refuse(status: number, code: ChatErrorCode, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ code, message: MESSAGES[code] ?? 'The request is not valid.' }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** The client's address for the rate limit: the first hop the platform's proxy recorded. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}

/** Reads the body as text, stopping as soon as it passes `limit` bytes. Null when it does. */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** The conversation in the model's format, with the attachment (if any) on the last question. */
export function toModelMessages(chat: ChatRequest): ModelMessage[] {
  const messages: ModelMessage[] = [{ role: 'system', content: systemPrompt(chat.locale, chat.units, chat.irrigation) }];
  for (const turn of chat.messages) {
    if (turn.role === 'assistant') {
      messages.push({ role: 'assistant', content: turn.text });
      continue;
    }
    if (!turn.attachment) {
      messages.push({ role: 'user', content: turn.text });
      continue;
    }
    const { mediaType, data } = turn.attachment;
    const url = `data:${mediaType};base64,${data}`;
    const file: ContentPart =
      mediaType === PDF_TYPE
        ? { type: 'file', file: { filename: 'attachment.pdf', file_data: url } }
        : { type: 'image_url', image_url: { url } };
    const parts: ContentPart[] = [file];
    if (turn.text) parts.push({ type: 'text', text: turn.text });
    messages.push({ role: 'user', content: parts });
  }
  return messages;
}

async function* answer(
  model: ChatModel,
  chat: ChatRequest,
  loaded: LoadedReport,
  signal: AbortSignal | undefined,
): AsyncGenerator<StreamEvent> {
  const ctx: FormatContext = { locale: chat.locale, units: chat.units };
  const messages = toModelMessages(chat);
  for (let round = 0; round < MAX_TOOL_ITERATIONS; round++) {
    let text = '';
    let end: Extract<ModelEvent, { type: 'end' }> | null = null;
    for await (const event of model.stream({ messages, tools: TOOLS, maxTokens: MAX_OUTPUT_TOKENS, signal })) {
      if (event.type === 'text') {
        text += event.delta;
        yield event;
      } else {
        end = event;
      }
    }
    if (!end || end.toolCalls.length === 0) {
      yield end?.finish === 'length' ? { type: 'done', truncated: true } : { type: 'done' };
      return;
    }
    messages.push({ role: 'assistant', content: text, toolCalls: end.toolCalls });
    for (const call of end.toolCalls) {
      messages.push({ role: 'tool', toolCallId: call.id, content: runTool(call.name, call.arguments, loaded, ctx) });
    }
  }
  yield { type: 'error', code: 'too_many_tool_rounds' };
}

function ndjson(events: AsyncGenerator<StreamEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      try {
        const next = await events.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(next.value)}\n`));
      } catch {
        // The reason is not sent or logged: it may contain the person's text.
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'error', code: 'model_error' })}\n`));
        controller.close();
      }
    },
    async cancel() {
      await events.return(undefined);
    },
  });
}

export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  if (request.method !== 'POST') return refuse(405, 'method_not_allowed', { allow: 'POST' });
  if (!deps.model) return refuse(503, 'not_configured');

  const limit = deps.limiter.check(clientKey(request), (deps.now ?? Date.now)());
  if (!limit.ok) return refuse(429, 'rate_limited', { 'retry-after': String(limit.retryAfterS) });

  const raw = await readLimited(request, MAX_BODY_BYTES);
  if (raw === null) return refuse(413, 'body_too_large');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return refuse(400, 'bad_json');
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) return refuse(parsed.status, parsed.code);
  const chat = parsed.value;

  const loaded = await loadReport(deps.fetchReport, chat.reportId, chat.irrigation);
  if (!loaded.ok) return refuse(STATUS[loaded.code] ?? 400, loaded.code);

  return new Response(ndjson(answer(deps.model, chat, loaded.loaded, request.signal)), {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
