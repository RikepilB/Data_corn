// SI-assisted (Claude Code); reviewed by <name>
// "Was this answer useful?" under one assistant answer. The vote goes to /api/chat-feedback
// with only the rating, an optional reason from a fixed list, the report id and the language.
// The question, the answer and any file are never sent.
import { useState } from 'react';
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

  const submit = async (vote: Omit<FeedbackVote, 'reportId' | 'locale'>) => {
    setStage('sending');
    setStage((await send({ ...vote, reportId, locale })) ? 'sent' : 'failed');
  };

  if (stage === 'sent') {
    return (
      <p className="chat__feedback chat__feedback--done" role="status">
        {t(locale, 'chat.feedback.thanks')}
      </p>
    );
  }
  if (stage === 'failed') {
    return (
      <p className="chat__feedback" role="alert">
        {t(locale, 'chat.feedback.failed')}{' '}
        <button type="button" className="btn btn--ghost" onClick={() => setStage('idle')}>
          {t(locale, 'chat.feedback.retry')}
        </button>
      </p>
    );
  }
  if (stage === 'reason') {
    return (
      <div className="chat__feedback" role="group" aria-label={t(locale, 'chat.feedback.why')}>
        <span>{t(locale, 'chat.feedback.why')}</span>
        {REASONS.map((reason) => (
          <button
            key={reason}
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
    <div className="chat__feedback" role="group" aria-label={t(locale, 'chat.feedback.label')}>
      <span>{t(locale, 'chat.feedback.label')}</span>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={stage === 'sending'}
        onClick={() => void submit({ rating: 'up' })}
      >
        {t(locale, 'chat.feedback.up')}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={stage === 'sending'}
        onClick={() => setStage('reason')}
      >
        {t(locale, 'chat.feedback.down')}
      </button>
    </div>
  );
}
