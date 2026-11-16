// SI-assisted (Claude Code); reviewed by <name>
// "Was this answer useful?" under one assistant answer. The vote goes to /api/chat-feedback
// with only the rating, an optional reason from a fixed list, the report id and the language.
// The question, the answer and any file are never sent.
//
// Accessibility: each step replaces the buttons the person just used, so focus is moved to the
// next thing to act on or read (first reason, the thank-you line, the retry button). Without
// that, focus would fall to the page behind the modal. Every control is a real <button>.
import { useEffect, useRef, useState } from 'react';
import { type Locale, t } from '../../i18n';
import { type FeedbackVote, sendFeedback } from './chatClient';

const REASONS = ['wrong', 'unclear', 'not_useful'] as const;

type Stage = 'idle' | 'reason' | 'sending' | 'sent' | 'failed';

interface Props {
  locale: Locale;
  reportId: string;
  /** Test seam: replaces the network call. */
  send?: (vote: FeedbackVote) => Promise<boolean>;
}

export function FeedbackRow({ locale, reportId, send = sendFeedback }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const firstReason = useRef<HTMLButtonElement>(null);
  const thanks = useRef<HTMLParagraphElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const up = useRef<HTMLButtonElement>(null);
  // Focus moves only after a person's action, never when the row first appears.
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    if (stage === 'reason') firstReason.current?.focus();
    else if (stage === 'sent') thanks.current?.focus();
    else if (stage === 'failed') retry.current?.focus();
    else if (stage === 'idle') up.current?.focus();
  }, [stage]);

  const go = (next: Stage) => {
    moveFocus.current = true;
    setStage(next);
  };

  const submit = async (vote: Omit<FeedbackVote, 'reportId' | 'locale'>) => {
    go('sending');
    go((await send({ ...vote, reportId, locale })) ? 'sent' : 'failed');
  };

  if (stage === 'sent') {
    return (
      <p ref={thanks} tabIndex={-1} className="chat__feedback chat__feedback--done" role="status">
        {t(locale, 'chat.feedback.thanks')}
      </p>
    );
  }
  if (stage === 'failed') {
    return (
      <p className="chat__feedback" role="alert">
        {t(locale, 'chat.feedback.failed')}
        <button ref={retry} type="button" className="btn btn--ghost" onClick={() => go('idle')}>
          {t(locale, 'chat.feedback.retry')}
        </button>
      </p>
    );
  }
  if (stage === 'reason') {
    return (
      <div className="chat__feedback" role="group" aria-label={t(locale, 'chat.feedback.why')}>
        <span aria-hidden="true">{t(locale, 'chat.feedback.why')}</span>
        {REASONS.map((reason, i) => (
          <button
            key={reason}
            ref={i === 0 ? firstReason : undefined}
            type="button"
            className="btn btn--secondary"
            onClick={() => void submit({ rating: 'down', reason })}
          >
            {t(locale, `chat.feedback.reason.${reason}`)}
          </button>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => void submit({ rating: 'down' })}>
          {t(locale, 'chat.feedback.skip')}
        </button>
      </div>
    );
  }
  return (
    <div className="chat__feedback" role="group" aria-label={t(locale, 'chat.feedback.label')} aria-busy={stage === 'sending'}>
      <span aria-hidden="true">{t(locale, 'chat.feedback.label')}</span>
      <button
        ref={up}
        type="button"
        className="btn btn--ghost"
        disabled={stage === 'sending'}
        onClick={() => void submit({ rating: 'up' })}
      >
        {t(locale, 'chat.feedback.up')}
      </button>
      <button type="button" className="btn btn--ghost" disabled={stage === 'sending'} onClick={() => go('reason')}>
        {t(locale, 'chat.feedback.down')}
      </button>
    </div>
  );
}
