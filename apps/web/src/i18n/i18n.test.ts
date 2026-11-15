// SI-assisted (Claude Code); reviewed by <name>
// English and Spanish must have the same keys and the same {placeholders}, and the Spanish speaks
// to the person as «tú», never «usted».
import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('en and es dictionaries', () => {
  it('have the same keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('use the same placeholders in each string', () => {
    const enMap = en as Record<string, string>;
    const esMap = es as Record<string, string>;
    for (const key of Object.keys(enMap)) {
      expect(placeholders(esMap[key] ?? ''), key).toEqual(placeholders(enMap[key]!));
    }
  });

  it('never use «usted» in Spanish', () => {
    for (const [key, value] of Object.entries(es as Record<string, string>)) {
      expect(/\busted(es)?\b/i.test(value), key).toBe(false);
    }
  });
});
