// SI-assisted (Claude Code); reviewed by <name>
// The model behind the assistant, reached through OpenRouter's chat completions API (streaming,
// with tools). The handler only sees the small ChatModel interface, so tests use a fake model and
// never call the network. The API key stays inside this module: it is never logged or returned.

/** A tool call the model asked for. `arguments` is the model's raw JSON text. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

export type ModelMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface ModelTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ModelEvent =
  | { type: 'text'; delta: string }
  /** Last event of a call. `length`: the answer hit the token cap. */
  | {
      type: 'end';
      finish: 'stop' | 'length' | 'tool_calls';
      toolCalls: ToolCall[];
      /** What this call cost in US dollars, when the service reports it. */
      costUsd?: number;
    };

export interface ModelRequest {
  messages: ModelMessage[];
  tools: readonly ModelTool[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface ChatModel {
  /** One model call. Throws (or the iterator throws) when the call fails. */
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}

/** OpenRouter refused the call. Only the HTTP status is kept: the body may echo the request. */
export class ModelHttpError extends Error {
  constructor(readonly status: number) {
    super(`OpenRouter answered ${status}`);
    this.name = 'ModelHttpError';
  }
}

export interface OpenRouterOptions {
  apiKey: string;
  /** An OpenRouter model id. */
  model?: string;
  /** The site's origin, sent as HTTP-Referer so OpenRouter can attribute the traffic. */
  referer?: string;
  fetcher?: typeof fetch;
  /** Waits between retries; tests pass one that does not wait. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Used when OPENROUTER_MODEL is not set (Claude Opus 5.5 under OpenRouter's naming). Any OpenRouter
 * model with tool use, image input and PDF input works; check the id on openrouter.ai/models.
 */
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-opus-5.5';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function toWire(m: ModelMessage): Record<string, unknown> {
  switch (m.role) {
    case 'assistant':
      return {
        role: 'assistant',
        content: m.content,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: 'function',
                function: { name: c.name, arguments: c.arguments },
              })),
            }
          : {}),
      };
    case 'tool':
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    default:
      return m;
  }
}

/** Splits a server-sent-event stream into the JSON payloads of its `data:` lines. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        if (data) yield data;
      }
      // Other lines (": OPENROUTER PROCESSING" keep-alives, blank separators) carry nothing.
    }
    if (done) return;
  }
}

interface WireChunk {
  error?: { message?: string; code?: unknown };
  /** Sent in the last chunk when the request asks for usage accounting. */
  usage?: { cost?: number };
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
    };
    finish_reason?: string | null;
  }[];
}

/** Statuses worth one more try: rate limited by the service or the model provider, or briefly down. */
const RETRY_STATUS = new Set([429, 502, 503]);
/** Waits before the second and third try, unless the service asks for a (short) Retry-After. */
export const RETRY_DELAYS_MS = [1500, 4000] as const;
const MAX_RETRY_AFTER_MS = 8000;

function retryDelay(response: Response, attempt: number): number {
  const seconds = Number(response.headers.get('retry-after'));
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  return RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

export function createOpenRouterModel(options: OpenRouterOptions): ChatModel {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const model = options.model || DEFAULT_OPENROUTER_MODEL;
  return {
    async *stream({ messages, tools, maxTokens, signal }) {
      const body = JSON.stringify({
        model,
        stream: true,
        max_tokens: maxTokens,
        messages: messages.map(toWire),
        tools: tools.map((t) => ({ type: 'function', function: t })),
        tool_choice: 'auto',
        // Adds the call's cost to the last chunk, so the dev server can keep a spending cap.
        usage: { include: true },
      });
      let response: Response;
      for (let attempt = 0; ; attempt++) {
        response = await fetcher(ENDPOINT, {
          method: 'POST',
          signal,
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            'content-type': 'application/json',
            ...(options.referer ? { 'http-referer': options.referer } : {}),
            'x-title': 'Data Corn',
          },
          body,
        });
        // Busy or briefly down: nothing has streamed yet, so the same call can be sent again.
        if (!RETRY_STATUS.has(response.status) || attempt >= RETRY_DELAYS_MS.length) break;
        await response.body?.cancel();
        await sleep(retryDelay(response, attempt), signal);
      }
      if (!response.ok || !response.body) {
        throw new ModelHttpError(response.status);
      }

      const calls = new Map<number, ToolCall>();
      let finish: 'stop' | 'length' | 'tool_calls' = 'stop';
      let costUsd: number | undefined;
      for await (const data of sseData(response.body)) {
        let chunk: WireChunk;
        try {
          chunk = JSON.parse(data) as WireChunk;
        } catch {
          continue;
        }
        if (chunk.error) throw new Error('OpenRouter stream error');
        if (typeof chunk.usage?.cost === 'number') costUsd = chunk.usage.cost;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) yield { type: 'text', delta: delta.content };
        for (const part of delta?.tool_calls ?? []) {
          const index = part.index ?? 0;
          const call = calls.get(index) ?? { id: '', name: '', arguments: '' };
          if (part.id) call.id = part.id;
          if (part.function?.name) call.name += part.function.name;
          if (part.function?.arguments) call.arguments += part.function.arguments;
          calls.set(index, call);
        }
        if (choice.finish_reason === 'length') finish = 'length';
        else if (choice.finish_reason === 'tool_calls') finish = 'tool_calls';
      }
      const toolCalls = [...calls.entries()]
        .sort(([a], [b]) => a - b)
        .map(([i, c]) => ({ ...c, id: c.id || `call_${i}` }))
        .filter((c) => c.name);
      yield {
        type: 'end',
        finish: toolCalls.length ? 'tool_calls' : finish,
        toolCalls,
        ...(costUsd === undefined ? {} : { costUsd }),
      };
    },
  };
}
