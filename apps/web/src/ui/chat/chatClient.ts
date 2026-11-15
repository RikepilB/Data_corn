// SI-assisted (Claude Code); reviewed by <name>
// The chat panel's talk with POST /api/chat, with no React in it so it can be tested: the request
// body, the NDJSON reader, and the mapping from an error code to the words shown to the person.
// The conversation is only held by the panel's state; nothing here stores it.
import {
  ATTACHMENT_TYPES,
  type AttachmentType,
  type ChatAttachment,
  type ChatIrrigation,
  type ChatRequest,
  type ChatTurn,
  CHAT_IRRIGATION,
  MAX_ASSISTANT_CHARS,
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGES,
} from '../../../server/chat/limits';
import type { Locale } from '../../i18n';
import type { UnitSystem } from '../../domain/units';

export const CHAT_ENDPOINT = '/api/chat';

/** One line of the answer stream. */
export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'done'; truncated?: boolean }
  | { type: 'error'; code: string };

/** Codes with their own sentence in the UI; anything else gets the generic one. */
export const KNOWN_ERRORS = [
  'not_configured',
  'rate_limited',
  'unknown_report',
  'report_unavailable',
  'body_too_large',
  'bad_attachment_type',
  'attachment_too_large',
  'model_error',
  'too_many_tool_rounds',
  'network',
] as const;

/** The i18n key of the sentence for an error code. */
export function errorKey(code: string | null | undefined): string {
  return code && (KNOWN_ERRORS as readonly string[]).includes(code) ? `chat.error.${code}` : 'chat.error.generic';
}

/**
 * Reads NDJSON as it arrives. Feed it text chunks in order; it returns the complete lines'
 * events and keeps a partial last line for the next chunk. Lines that are not an event are skipped.
 */
export function createNdjsonReader() {
  let buffer = '';
  const parse = (line: string): StreamEvent | null => {
    if (!line.trim()) return null;
    try {
      const v = JSON.parse(line) as Partial<StreamEvent> & Record<string, unknown>;
      if (v.type === 'text' && typeof v.delta === 'string') return { type: 'text', delta: v.delta };
      if (v.type === 'done') return { type: 'done', truncated: v.truncated === true };
      if (v.type === 'error') return { type: 'error', code: typeof v.code === 'string' ? v.code : 'generic' };
    } catch {
      // A broken line is skipped, not shown.
    }
    return null;
  };
  return {
    push(chunk: string): StreamEvent[] {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      return lines.map(parse).filter((e): e is StreamEvent => e !== null);
    },
    /** The last line when the stream ends without a newline. */
    end(): StreamEvent[] {
      const rest = parse(buffer);
      buffer = '';
      return rest ? [rest] : [];
    },
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Shown in the conversation; the file itself is sent once and not kept. */
  attachmentName?: string;
}

/** The irrigation of the report on screen, as the chat API names it. */
export function chatIrrigation(value: string): ChatIrrigation {
  return (CHAT_IRRIGATION as readonly string[]).includes(value) ? (value as ChatIrrigation) : 'none';
}

/**
 * The request body: the recent turns that fit the server's limits, starting with a question,
 * and the attachment on the last question only. Long earlier answers are cut, as the server expects.
 */
export function buildChatRequest(args: {
  reportId: string;
  irrigation: string;
  locale: Locale;
  units: UnitSystem;
  history: ChatMessage[];
  question: string;
  attachment?: ChatAttachment;
}): ChatRequest {
  const earlier: ChatTurn[] = args.history
    .filter((m) => m.text.trim())
    .map((m) => ({ role: m.role, text: m.role === 'assistant' ? m.text.slice(0, MAX_ASSISTANT_CHARS) : m.text }));
  // Only questions that got an answer go back, as question-answer pairs (a failed question has none).
  const pairs: ChatTurn[] = [];
  for (let i = earlier.length - 1; i > 0; i--) {
    if (earlier[i]!.role === 'assistant' && earlier[i - 1]!.role === 'user') {
      pairs.unshift(earlier[i - 1]!, earlier[i]!);
      i--;
    }
  }
  const room = 2 * Math.floor((MAX_MESSAGES - 1) / 2);
  const alternating = room > 0 ? pairs.slice(-room) : [];
  const last: ChatTurn = { role: 'user', text: args.question, ...(args.attachment ? { attachment: args.attachment } : {}) };
  return {
    reportId: args.reportId,
    irrigation: chatIrrigation(args.irrigation),
    locale: args.locale,
    units: args.units,
    messages: [...alternating, last],
  };
}

/**
 * The panel shows answers as plain text. When the model still writes Markdown emphasis or
 * headings, their marks are dropped so no stray asterisks or # show. Lists ("- ") stay as they are.
 */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
}

export function isAttachmentType(type: string): type is AttachmentType {
  return (ATTACHMENT_TYPES as readonly string[]).includes(type);
}

/** Whether a file of this many bytes (after shrinking a photo) can be sent. */
export const fitsAttachmentLimit = (bytes: number): boolean => bytes > 0 && bytes <= MAX_ATTACHMENT_BYTES;

/** Size of the long side and the scale to bring it to `maxSide`, never enlarging. */
export function scaledSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Bytes as base64 without a data: prefix, in slices so large files do not overflow the stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Sends one question and calls `onText` with each piece of the answer. Resolves with how it ended.
 * The panel passes an AbortSignal so closing it stops the request.
 */
export async function sendChat(
  request: ChatRequest,
  onText: (delta: string) => void,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<{ ok: true; truncated: boolean } | { ok: false; code: string }> {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    return { ok: false, code: 'network' };
  }
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    return { ok: false, code: typeof body?.code === 'string' ? body.code : 'generic' };
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const ndjson = createNdjsonReader();
  const handle = (events: StreamEvent[]) => {
    for (const e of events) {
      if (e.type === 'text') onText(e.delta);
      else return e;
    }
    return null;
  };
  for (;;) {
    const { value, done } = await reader.read();
    const end = handle(done ? ndjson.end() : ndjson.push(value ?? ''));
    if (end?.type === 'done') return { ok: true, truncated: end.truncated === true };
    if (end?.type === 'error') return { ok: false, code: end.code };
    // A stream that stops without "done" was cut off on the way.
    if (done) return { ok: false, code: 'network' };
  }
}
