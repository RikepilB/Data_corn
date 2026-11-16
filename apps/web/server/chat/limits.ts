// SI-assisted (Claude Code); reviewed by <name>
// Limits of the chat assistant. The server enforces them (handler.ts) and the chat panel shows the
// same numbers (src/ui/chat). This file is pure: no Node API, so the browser can import it too.

/**
 * Whole JSON body of one request, attachment included. A Vercel function accepts about 4.5 MB of
 * request body, so this stays under it.
 */
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
/**
 * One photo or one PDF, 2.5 MB counted as 2,500,000 bytes of the file itself. Base64 makes it a
 * third larger (3,333,336 characters), which leaves room for the conversation inside MAX_BODY_BYTES.
 * The panel shrinks photos before sending them (IMAGE_MAX_SIDE_PX) and refuses larger PDFs.
 */
export const MAX_ATTACHMENT_BYTES = 2_500_000;
/** The panel redraws a photo so its long side is at most this many pixels, as JPEG. */
export const IMAGE_MAX_SIDE_PX = 1568;
export const MAX_MESSAGES = 20;
/** Characters a person can type in one message. */
export const MAX_TEXT_CHARS = 2000;
/** An earlier answer sent back as history; the panel cuts longer ones before sending. */
export const MAX_ASSISTANT_CHARS = 12_000;

export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 10 * 60_000;

/** Answer plus the model's thinking, per model call. Answers are a few sentences. */
export const MAX_OUTPUT_TOKENS = 6000;
/** Model calls per question: each round of tool lookups is one more call. */
export const MAX_TOOL_ITERATIONS = 6;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PDF_TYPE = 'application/pdf';
export const ATTACHMENT_TYPES = [...IMAGE_TYPES, PDF_TYPE] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const CHAT_LOCALES = ['en', 'es'] as const;
export const CHAT_UNITS = ['imperial', 'metric'] as const;
export const CHAT_IRRIGATION = ['none', 'pivot', 'furrow', 'drip'] as const;
export type ChatLocale = (typeof CHAT_LOCALES)[number];
export type ChatUnits = (typeof CHAT_UNITS)[number];
export type ChatIrrigation = (typeof CHAT_IRRIGATION)[number];

/** A report id is a file name under public/data/reports, never a path or a URL. */
export const REPORT_ID = /^[a-z0-9-]{1,40}$/;

export interface ChatAttachment {
  mediaType: AttachmentType;
  /** The file's bytes as base64, without a `data:` prefix. */
  data: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** Only on the last message: an attachment is sent once, with the question it belongs to. */
  attachment?: ChatAttachment;
}

export interface ChatRequest {
  reportId: string;
  /** Which precomputed report of the field is on screen (the default or an irrigation variant). */
  irrigation: ChatIrrigation;
  locale: ChatLocale;
  units: ChatUnits;
  messages: ChatTurn[];
}

export type ChatErrorCode =
  | 'method_not_allowed'
  | 'rate_limited'
  | 'not_configured'
  | 'body_too_large'
  | 'bad_json'
  | 'bad_request'
  | 'unknown_field'
  | 'invalid_report_id'
  | 'unknown_report'
  | 'report_unavailable'
  | 'too_many_messages'
  | 'text_too_long'
  | 'bad_attachment_type'
  | 'attachment_too_large'
  | 'attachment_mismatch';

export type Parsed<T> = { ok: true; value: T } | { ok: false; status: number; code: ChatErrorCode };

const fail = (status: number, code: ChatErrorCode): { ok: false; status: number; code: ChatErrorCode } => ({
  ok: false,
  status,
  code,
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const onlyKeys = (v: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(v).every((k) => allowed.includes(k));

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Decoded size of a base64 string, or null when it is not base64. Nothing is decoded. */
export function base64Size(data: string): number | null {
  if (data.length === 0 || data.length % 4 !== 0 || !BASE64.test(data)) return null;
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return (data.length / 4) * 3 - padding;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

/** The file type read from its first bytes (magic numbers), or null when it is not one we accept. */
export function sniffMediaType(bytes: Uint8Array): AttachmentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  // %PDF-
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF_TYPE;
  return null;
}

/** The first 12 bytes of a base64 string: enough for every signature above. */
function headBytes(data: string): Uint8Array {
  const head = atob(data.slice(0, 16));
  return Uint8Array.from(head, (c) => c.charCodeAt(0));
}

function parseAttachment(raw: unknown): Parsed<ChatAttachment> {
  if (!isRecord(raw) || !onlyKeys(raw, ['mediaType', 'data'])) return fail(400, 'bad_request');
  if (!oneOf(ATTACHMENT_TYPES, raw.mediaType)) return fail(415, 'bad_attachment_type');
  if (typeof raw.data !== 'string') return fail(400, 'bad_request');
  const size = base64Size(raw.data);
  if (size === null) return fail(400, 'bad_request');
  if (size > MAX_ATTACHMENT_BYTES) return fail(413, 'attachment_too_large');
  // The declared type is only a claim: the bytes decide.
  const sniffed = sniffMediaType(headBytes(raw.data));
  if (sniffed === null) return fail(415, 'bad_attachment_type');
  if (sniffed !== raw.mediaType) return fail(415, 'attachment_mismatch');
  return { ok: true, value: { mediaType: raw.mediaType, data: raw.data } };
}

function parseTurn(raw: unknown, last: boolean): Parsed<ChatTurn> {
  if (!isRecord(raw) || !onlyKeys(raw, ['role', 'text', 'attachment'])) return fail(400, 'bad_request');
  if (raw.role !== 'user' && raw.role !== 'assistant') return fail(400, 'bad_request');
  if (typeof raw.text !== 'string') return fail(400, 'bad_request');
  const max = raw.role === 'user' ? MAX_TEXT_CHARS : MAX_ASSISTANT_CHARS;
  if (raw.text.length > max) return fail(413, 'text_too_long');
  const text = raw.text.trim();
  if (raw.attachment === undefined) {
    return text ? { ok: true, value: { role: raw.role, text } } : fail(400, 'bad_request');
  }
  if (raw.role !== 'user' || !last) return fail(400, 'bad_request');
  const attachment = parseAttachment(raw.attachment);
  if (!attachment.ok) return attachment;
  return { ok: true, value: { role: 'user', text, attachment: attachment.value } };
}

const REQUEST_KEYS = ['reportId', 'irrigation', 'locale', 'units', 'messages'] as const;

/**
 * Checks the JSON body of POST /api/chat. Anything outside the contract is refused, including
 * extra fields: the client names a report by id and can never hand the server a URL to fetch.
 */
export function parseChatRequest(body: unknown): Parsed<ChatRequest> {
  if (!isRecord(body)) return fail(400, 'bad_request');
  if (!onlyKeys(body, REQUEST_KEYS)) return fail(400, 'unknown_field');
  if (typeof body.reportId !== 'string' || !REPORT_ID.test(body.reportId)) return fail(400, 'invalid_report_id');
  if (!oneOf(CHAT_IRRIGATION, body.irrigation)) return fail(400, 'bad_request');
  if (!oneOf(CHAT_LOCALES, body.locale)) return fail(400, 'bad_request');
  if (!oneOf(CHAT_UNITS, body.units)) return fail(400, 'bad_request');
  if (!Array.isArray(body.messages) || body.messages.length === 0) return fail(400, 'bad_request');
  if (body.messages.length > MAX_MESSAGES) return fail(413, 'too_many_messages');

  const messages: ChatTurn[] = [];
  for (const [i, raw] of body.messages.entries()) {
    const turn = parseTurn(raw, i === body.messages.length - 1);
    if (!turn.ok) return turn;
    // A person speaks first and last, and the two take turns.
    if (turn.value.role !== (i % 2 === 0 ? 'user' : 'assistant')) return fail(400, 'bad_request');
    messages.push(turn.value);
  }
  if (messages.at(-1)?.role !== 'user') return fail(400, 'bad_request');

  return {
    ok: true,
    value: {
      reportId: body.reportId,
      irrigation: body.irrigation,
      locale: body.locale,
      units: body.units,
      messages,
    },
  };
}

export interface RateLimiter {
  /** Counts one request for `key`. `retryAfterS` says how long to wait when it is refused. */
  check(key: string, now: number): { ok: boolean; retryAfterS: number };
}

/**
 * Fixed-window limit per client, kept in this process's memory. Good enough for one local server.
 * A real deployment runs several short-lived instances that do not share memory, so it needs a
 * shared store (for example Redis or the host's own rate limiting) to hold the counters.
 */
export function createRateLimiter(max = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    check(key, now) {
      if (windows.size > 5000) {
        for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      }
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return { ok: true, retryAfterS: 0 };
      }
      if (current.count >= max) {
        return { ok: false, retryAfterS: Math.ceil((current.start + windowMs - now) / 1000) };
      }
      windows.set(key, { start: current.start, count: current.count + 1 });
      return { ok: true, retryAfterS: 0 };
    },
  };
}
