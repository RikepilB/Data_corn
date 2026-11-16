// SI-assisted (Claude Code); reviewed by <name>
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { type Locale, t } from '../../i18n';
import { RISK_ICON } from './RiskBadge';
import { type ContactKind, contactChannel, contactHref } from './contact';

const TABS = ['questions', 'suggestions', 'support'] as const;
type Tab = (typeof TABS)[number];

// Each answer repeats only what the app already says or does; none adds a claim of its own.
const FAQ = ['forecast', 'data', 'sample', 'pdf', 'account', 'draw', 'risk'] as const;

/** Button names and symbols quoted in the answers come from their own keys, so the two cannot drift apart. */
function faqParams(locale: Locale): Record<string, string> {
  const keys = {
    about: 'about.link',
    tag: 'results.mock',
    example: 'globe.sample',
    none: 'irrigation.none',
    pivot: 'irrigation.pivot',
    furrow: 'irrigation.furrow',
    drip: 'irrigation.drip',
    open: 'results.pdf_open',
    display: 'display.button',
    locate: 'globe.locate',
    search: 'globe.search',
    undo: 'draw.undo',
    close: 'draw.close',
    low: 'risk.low',
    medium: 'risk.medium',
    high: 'risk.high',
    no_data: 'risk.no_data',
    hybrid: 'card.hybrid',
    rotation: 'card.rotation',
  };
  const params: Record<string, string> = {
    low_icon: RISK_ICON.low,
    medium_icon: RISK_ICON.medium,
    high_icon: RISK_ICON.high,
    no_data_icon: RISK_ICON.no_data,
  };
  for (const [name, key] of Object.entries(keys)) params[name] = t(locale, key);
  return params;
}

/** One way out of the app, no form: an e-mail or a new GitHub issue, and the text says which. */
function ContactLink({ kind, locale }: { kind: ContactKind; locale: Locale }) {
  const href = contactHref(kind, locale);
  // A web link opens in a new tab so the app stays where it was; a mailto: opens the mail app instead.
  const web = href.startsWith('https:');
  return (
    <a className="btn btn--primary help__cta" href={href} {...(web ? { target: '_blank', rel: 'noopener' } : {})}>
      {t(locale, `help.${kind}.link_${contactChannel()}`)}
      {web && <span className="sr-only"> {t(locale, 'help.new_tab')}</span>}
    </a>
  );
}

/**
 * Help: frequent questions, suggestions and support, in three tabs (WAI-ARIA tabs pattern with
 * automatic activation). A native <dialog> like About: Esc closes it and the focus stays inside.
 */
export function HelpDialog({ open, locale, onClose }: { open: boolean; locale: Locale; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tab, setTab] = useState<Tab>('questions');
  const id = useId();
  const titleId = `${id}-title`;
  const tabId = (k: Tab) => `${id}-tab-${k}`;
  const panelId = (k: Tab) => `${id}-panel-${k}`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Every way of closing (Esc, the button, the backdrop) ends here; the next opening starts at the questions.
  const close = () => {
    setTab('questions');
    onClose();
  };

  // Left and Right move along the tabs and wrap around; Home and End jump to the ends.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = tabs.current.findIndex((el) => el === e.target);
    const i = from >= 0 ? from : TABS.indexOf(tab);
    const last = TABS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: i === last ? 0 : i + 1,
      ArrowLeft: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(TABS[next]!);
    tabs.current[next]?.focus();
  };

  const params = faqParams(locale);
  const github = contactChannel() === 'github';
  const panel = (k: Tab) => ({
    role: 'tabpanel',
    id: panelId(k),
    'aria-labelledby': tabId(k),
    tabIndex: 0,
    hidden: tab !== k,
    className: 'help__panel',
  });

  return (
    <dialog
      ref={ref}
      className="about help glass"
      aria-labelledby={titleId}
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="about__body">
        <header className="about__head">
          <h2 id={titleId}>{t(locale, 'help.title')}</h2>
          <button type="button" className="btn about__close" onClick={close}>
            {t(locale, 'help.close')}
          </button>
        </header>

        <div role="tablist" aria-labelledby={titleId} className="help__tabs" onKeyDown={onTabKey}>
          {TABS.map((k, i) => (
            <button
              key={k}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(k)}
              aria-selected={tab === k}
              aria-controls={panelId(k)}
              tabIndex={tab === k ? 0 : -1}
              className={`chip${tab === k ? ' is-on' : ''}`}
              onClick={() => setTab(k)}
            >
              {t(locale, `help.tab.${k}`)}
            </button>
          ))}
        </div>

        <div {...panel('questions')}>
          {FAQ.map((q) => (
            <details key={q} className="help__q">
              <summary>{t(locale, `help.faq.${q}.q`, params)}</summary>
              <p>{t(locale, `help.faq.${q}.a`, params)}</p>
            </details>
          ))}
        </div>

        <div {...panel('suggestions')}>
          <p>{t(locale, 'help.suggestion.text')}</p>
          <ContactLink kind="suggestion" locale={locale} />
          {github && <p className="muted small">{t(locale, 'help.github_signin')}</p>}
        </div>

        <div {...panel('support')}>
          <p>{t(locale, 'help.support.text')}</p>
          <ContactLink kind="support" locale={locale} />
          <p className="muted small">{t(locale, 'help.support.device')}</p>
          {github && <p className="muted small">{t(locale, 'help.github_signin')}</p>}
        </div>
      </div>
    </dialog>
  );
}
