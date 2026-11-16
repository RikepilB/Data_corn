// SI-assisted (Claude Code); reviewed by <name>
// Vercel function for POST /api/chat-feedback. The vote is printed as one JSON line, which the
// project's runtime logs keep. Nothing the person wrote in the chat is part of it.
import { handleFeedback } from '../server/chat/feedback';
import { createRateLimiter } from '../server/chat/limits';

const limiter = createRateLimiter();

const handle = (request: Request): Promise<Response> =>
  handleFeedback(request, {
    limiter,
    record: (entry) => console.log(JSON.stringify({ event: 'chat_feedback', ...entry })),
  });

export const POST = handle;
export const GET = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
