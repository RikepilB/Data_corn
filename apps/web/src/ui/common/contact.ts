// SI-assisted (Claude Code); reviewed by <name>
// Where the Help dialog sends suggestions and problem reports: a plain link, no form, no backend,
// nothing stored. Until the team picks a support address the link opens a new GitHub issue.
import { type Locale, t } from '../../i18n';

/** The team's support address. Null until the team picks one; the links go to GitHub meanwhile. */
export const SUPPORT_EMAIL: string | null = null; // set when the team picks an address

export const ISSUES_URL = 'https://github.com/RikepilB/Data_corn/issues/new';

export type ContactKind = 'suggestion' | 'support';
export type ContactChannel = 'email' | 'github';

/** Email when an address is set, GitHub otherwise. The link text names the channel. */
export const contactChannel = (email: string | null = SUPPORT_EMAIL): ContactChannel => (email ? 'email' : 'github');

/**
 * The link for `kind` with a given address (null: GitHub), so the tests can pass an address while
 * SUPPORT_EMAIL is unset. Only the localized subject is sent: no page URL, device or field data.
 */
export function contactHrefFor(kind: ContactKind, locale: Locale, email: string | null): string {
  const subject = encodeURIComponent(t(locale, `help.subject.${kind}`));
  return email ? `mailto:${email}?subject=${subject}` : `${ISSUES_URL}?title=${subject}`;
}

export function contactHref(kind: ContactKind, locale: Locale): string {
  return contactHrefFor(kind, locale, SUPPORT_EMAIL);
}
