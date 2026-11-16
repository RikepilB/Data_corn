// SI-assisted (Claude Code); reviewed by <name>
// The chat assistant (issue #120): questions about the real example report on screen, answered by a
// language model that reads the report through server tools. A native modal <dialog>, like About:
// Escape closes it and focus stays inside. The conversation lives in this component's state only:
// no storage, no cookies; it is gone when the page closes.
import { type SubmitEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { MAX_TEXT_CHARS, type ChatAttachment } from '../../../server/chat/limits';
import type { UnitSystem } from '../../domain/units';
import { type Locale, t } from '../../i18n';
import { Icon } from '../common/Icon';
import { prepareAttachment } from './attachment';
import { type ChatMessage, buildChatRequest, errorKey, plainText, sendChat } from './chatClient';
import { FeedbackRow } from './FeedbackRow';
import './chat.css';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

interface Props {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  units: UnitSystem;
  reportId: string;
  /** The irrigation of the report on screen (default or a precomputed variant). */
  irrigation: string;
}

export function ChatPanel({ open, onClose, locale, units, reportId, irrigation }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ids = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [file, setFile] = useState<{ name: string; attachment: ChatAttachment } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      inputRef.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // A different report on screen starts a new conversation: the old answers were about other numbers.
  useEffect(() => {
    stop();
    setMessages([]);
    setAnswer(null);
    setError(null);
    setFile(null);
  }, [reportId, irrigation, stop]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, answer]);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [onClose, stop]);

  const onPick = useCallback(async (picked: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!picked) return;
    setError(null);
    setPreparing(true);
    try {
      const prepared = await prepareAttachment(picked);
      if (prepared.ok) setFile({ name: prepared.name, attachment: prepared.attachment });
      else setError(prepared.code);
    } finally {
      setPreparing(false);
    }
  }, []);

  const send = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const question = draft.trim();
      if ((!question && !file) || busy || preparing) return;
      const request = buildChatRequest({
        reportId,
        irrigation,
        locale,
        units,
        history: messages,
        question,
        attachment: file?.attachment,
      });
      const asked: ChatMessage = { role: 'user', text: question, attachmentName: file?.name };
      setMessages((m) => [...m, asked]);
      setDraft('');
      setFile(null);
      setError(null);
      setTruncated(false);
      setBusy(true);
      setAnswer('');
      const controller = new AbortController();
      abortRef.current = controller;
      let text = '';
      try {
        const result = await sendChat(
          request,
          (delta) => {
            text += delta;
            setAnswer(text);
          },
          { signal: controller.signal },
        );
        if (!result.ok) setError(result.code);
        else setTruncated(result.truncated);
      } catch {
        // Stopped by the person or by closing the panel: keep what arrived.
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setMessages((m) => (text ? [...m, { role: 'assistant', text }] : m));
        setAnswer(null);
        setBusy(false);
      }
    },
    [draft, file, busy, preparing, reportId, irrigation, locale, units, messages],
  );

  const restart = useCallback(() => {
    stop();
    setMessages([]);
    setAnswer(null);
    setError(null);
    setTruncated(false);
    setFile(null);
    inputRef.current?.focus();
  }, [stop]);

  return (
    <dialog
      ref={ref}
      className="chat glass"
      aria-labelledby={`${ids}-title`}
      onClose={close}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="chat__body">
        <header className="chat__head">
          <h2 id={`${ids}-title`}>{t(locale, 'chat.title')}</h2>
          <button type="button" className="iconbtn" onClick={close} aria-label={t(locale, 'chat.close')}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <p className="chat__notice">
          <Icon name="info" size={16} /> {t(locale, 'chat.notice')}
        </p>

        <div ref={logRef} className="chat__log" aria-live="polite" aria-busy={busy} aria-relevant="additions text">
          {messages.length === 0 && answer === null && <p className="chat__intro">{t(locale, 'chat.intro')}</p>}
          {messages.map((m, i) => (
            <div key={i} className={`chat__msg chat__msg--${m.role}`}>
              <span className="chat__who">{t(locale, m.role === 'user' ? 'chat.you' : 'chat.assistant')}</span>
              {m.attachmentName && (
                <span className="chat__file-tag">{t(locale, 'chat.attached', { name: m.attachmentName })}</span>
              )}
              {m.text && <p>{m.role === 'assistant' ? plainText(m.text) : m.text}</p>}
              {m.role === 'assistant' && m.text && <FeedbackRow locale={locale} reportId={reportId} />}
            </div>
          ))}
          {answer !== null && (
            <div className="chat__msg chat__msg--assistant">
              <span className="chat__who">{t(locale, 'chat.assistant')}</span>
              <p>{answer ? plainText(answer) : t(locale, 'chat.thinking')}</p>
            </div>
          )}
          {truncated && <p className="chat__note">{t(locale, 'chat.truncated')}</p>}
        </div>

        {error && (
          <p className="chat__error" role="alert">
            <Icon name="alert" size={16} /> {t(locale, errorKey(error))}
          </p>
        )}

        <form className="chat__form" onSubmit={send}>
          {(file || preparing) && (
            <div className="chat__file">
              <span>{preparing ? t(locale, 'chat.preparing') : t(locale, 'chat.attached', { name: file!.name })}</span>
              {file && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setFile(null)}
                  aria-label={t(locale, 'chat.attach_remove', { name: file.name })}
                >
                  {t(locale, 'chat.remove')}
                </button>
              )}
            </div>
          )}
          <label className="sr-only" htmlFor={`${ids}-input`}>
            {t(locale, 'chat.input_label')}
          </label>
          <textarea
            ref={inputRef}
            id={`${ids}-input`}
            className="chat__input"
            rows={2}
            maxLength={MAX_TEXT_CHARS}
            value={draft}
            placeholder={t(locale, 'chat.placeholder')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="chat__actions">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => void onPick(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy || preparing || file !== null}
            >
              <Icon name="plus" size={18} /> {t(locale, 'chat.attach')}
            </button>
            {messages.length > 0 && !busy && (
              <button type="button" className="btn btn--ghost" onClick={restart}>
                {t(locale, 'chat.new')}
              </button>
            )}
            {busy ? (
              <button type="button" className="btn btn--secondary chat__send" onClick={stop}>
                {t(locale, 'chat.stop')}
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn--primary chat__send"
                disabled={preparing || (!draft.trim() && !file)}
              >
                {t(locale, 'chat.send')}
              </button>
            )}
          </div>
          <p className="chat__privacy">{t(locale, 'chat.privacy')}</p>
        </form>
      </div>
    </dialog>
  );
}
