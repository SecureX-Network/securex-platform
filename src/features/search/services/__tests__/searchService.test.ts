import { describe, expect, it } from 'vitest';
import { groupSearchResults, searchEntities } from '@/features/search/services/searchService';

describe('searchEntities', () => {
  it('returns nothing for an empty query', () => {
    expect(searchEntities('')).toEqual([]);
    expect(searchEntities('   ')).toEqual([]);
  });

  it('finds credentials by title, holder, and public ID', () => {
    const byTitle = searchEntities('Computer Science');
    expect(byTitle.some((r) => r.category === 'credential')).toBe(true);

    const byId = searchEntities('SX-');
    expect(byId.some((r) => r.category === 'credential')).toBe(true);
  });

  it('finds institutions and issuers by name', () => {
    const institutions = searchEntities('Stanford');
    expect(institutions.some((r) => r.category === 'institution')).toBe(true);

    const issuers = searchEntities('Registrar');
    expect(issuers.some((r) => r.category === 'issuer')).toBe(true);
  });

  it('finds users by name or email', () => {
    const users = searchEntities('morgan');
    expect(users.some((r) => r.category === 'user')).toBe(true);
  });

  it('resolves credential results to the public verification route', () => {
    const results = searchEntities('SX-');
    const credential = results.find((r) => r.category === 'credential');
    expect(credential?.path).toMatch(/^\/verify\/SX-/);
  });

  it('produces no results for gibberish', () => {
    expect(searchEntities('zzzzqqqyyy')).toEqual([]);
  });
});

describe('groupSearchResults', () => {
  it('groups results by entity group preserving order', () => {
    const groups = groupSearchResults(searchEntities('s'));
    const labels = groups.map((g) => g.group);
    expect(labels.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});