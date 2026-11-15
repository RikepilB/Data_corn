// SI-assisted (Claude Code); reviewed by <name>
// A spending cap for local testing: wraps a ChatModel, adds up what each call cost (as the model
// service reports it), and refuses new calls once the total reaches the cap. The local chat server
// turns it on with CHAT_DEV_BUDGET_USD. It records amounts only, never what was asked or answered.
import type { ChatModel } from './openrouter';

export class BudgetExceeded extends Error {
  constructor() {
    super('Spending cap reached');
    this.name = 'BudgetExceeded';
  }
}

export interface Budgeted extends ChatModel {
  spentUsd(): number;
  calls(): number;
}

export function withBudget(
  model: ChatModel,
  capUsd: number,
  onCost: (callUsd: number, totalUsd: number) => void = () => undefined,
): Budgeted {
  let spent = 0;
  let calls = 0;
  return {
    spentUsd: () => spent,
    calls: () => calls,
    async *stream(request) {
      if (spent >= capUsd) throw new BudgetExceeded();
      calls++;
      for await (const event of model.stream(request)) {
        if (event.type === 'end' && typeof event.costUsd === 'number') {
          spent += event.costUsd;
          onCost(event.costUsd, spent);
        }
        yield event;
      }
    },
  };
}
