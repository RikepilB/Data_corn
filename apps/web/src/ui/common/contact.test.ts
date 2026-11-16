// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { ISSUES_URL, SUPPORT_EMAIL, contactChannel, contactHref, contactHrefFor } from './contact';

// The expected strings are spelled out: encodeURIComponent writes ": " as %3A%20, never "+".
describe('contact links without a support address', () => {
  it('open a new GitHub issue titled with the localized prefix', () => {
    expect(ISSUES_URL).toBe('https://github.com/RikepilB/Data_corn/issues/new');
    expect(contactHrefFor('suggestion', 'en', null)).toBe(`${ISSUES_URL}?title=Suggestion%3A%20`);
    expect(contactHrefFor('suggestion', 'es', null)).toBe(`${ISSUES_URL}?title=Sugerencia%3A%20`);
    expect(contactHrefFor('support', 'en', null)).toBe(`${ISSUES_URL}?title=Problem%3A%20`);
    expect(contactHrefFor('support', 'es', null)).toBe(`${ISSUES_URL}?title=Problema%3A%20`);
  });

  it('name GitHub as the channel', () => {
    expect(contactChannel(null)).toBe('github');
  });
});

describe('contact links with a support address', () => {
  const email = 'help@example.org';

  it('open an e-mail with the localized subject', () => {
    expect(contactHrefFor('suggestion', 'en', email)).toBe('mailto:help@example.org?subject=Suggestion%3A%20');
    expect(contactHrefFor('suggestion', 'es', email)).toBe('mailto:help@example.org?subject=Sugerencia%3A%20');
    expect(contactHrefFor('support', 'en', email)).toBe('mailto:help@example.org?subject=Problem%3A%20');
    expect(contactHrefFor('support', 'es', email)).toBe('mailto:help@example.org?subject=Problema%3A%20');
  });

  it('name e-mail as the channel', () => {
    expect(contactChannel(email)).toBe('email');
  });
});

describe('contactHref', () => {
  it('uses SUPPORT_EMAIL, whatever the team sets it to', () => {
    for (const kind of ['suggestion', 'support'] as const) {
      for (const locale of ['en', 'es'] as const) {
        expect(contactHref(kind, locale)).toBe(contactHrefFor(kind, locale, SUPPORT_EMAIL));
      }
    }
    expect(contactChannel()).toBe(contactChannel(SUPPORT_EMAIL));
  });
});
