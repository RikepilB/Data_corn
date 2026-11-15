// SI-assisted (Claude Code); reviewed by <name>
// Helpers for the chat tests: a scripted model (no network), the shipped reports as the report
// source, and a reader for the NDJSON answer.
import index from '../../public/data/reports/index.json';
import hamilton from '../../public/data/reports/hamilton-ne.json';
import { type ChatRequest, createRateLimiter } from './limits';
import type { ChatModel, ModelEvent, ModelRequest } from './openrouter';
import type { ChatDeps } from './handler';
import type { FetchReport } from './reports';

/** Answers each call with the next script; records what it was sent. */
export function scriptedModel(rounds: ModelEvent[][]): ChatModel & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    calls,
    async *stream(request) {
      calls.push({ ...request, messages: [...request.messages] });
      const script = rounds[calls.length - 1];
      if (!script) throw new Error('no script for this call');
      for (const event of script) yield event;
    },
  };
}

export const say = (text: string): ModelEvent[] => [
  { type: 'text', delta: text },
  { type: 'end', finish: 'stop', toolCalls: [] },
];

export const callTool = (name: string, args: unknown = {}): ModelEvent[] => [
  { type: 'end', finish: 'tool_calls', toolCalls: [{ id: `id_${name}`, name, arguments: JSON.stringify(args) }] },
];

export const shippedReports: FetchReport = async (name) =>
  name === 'index' ? index : name === 'hamilton-ne' ? hamilton : null;

export function deps(model: ChatModel | null, extra: Partial<ChatDeps> = {}): ChatDeps {
  return { model, fetchReport: shippedReports, limiter: createRateLimiter(), now: () => 0, ...extra };
}

export const body = (over: Partial<ChatRequest> = {}): ChatRequest => ({
  reportId: 'hamilton-ne',
  irrigation: 'none',
  locale: 'en',
  units: 'imperial',
  messages: [{ role: 'user', text: 'Why is the water risk high?' }],
  ...over,
});

export const post = (payload: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });

export async function events(response: Response): Promise<unknown[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

/** A tiny valid file of each type, as base64. */
export const SAMPLE_FILES = {
  jpeg: btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1)),
  pdf: btoa('%PDF-1.4\n%%EOF\n'),
};
