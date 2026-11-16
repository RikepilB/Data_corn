// SI-assisted (Claude Code); reviewed by <name>
// When the chat assistant shows. It is off unless the build sets PUBLIC_CHAT_ENABLED=true, and even
// then it only shows on the results of the real example report (computed in advance), never on
// sample data or a field somebody drew: there would be nothing real to explain.

/** True when the build turned the chat on. */
export const CHAT_ENABLED = import.meta.env.PUBLIC_CHAT_ENABLED === 'true';

export function chatAvailable(state: {
  enabled: boolean;
  step: string;
  /** The globe's "See an example" field. */
  isSample: boolean;
  /** Set only when the report on screen is the real one computed in advance. */
  precomputedAt: string | null;
  hasReport: boolean;
}): boolean {
  return state.enabled && state.step === 'results' && state.isSample && state.precomputedAt !== null && state.hasReport;
}
