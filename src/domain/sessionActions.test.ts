import { describe, expect, it } from 'vitest';
import type { BrowserSession, SiteRecord } from './types';
import { createSessionRestorePlan } from './sessionActions';

const sites: SiteRecord[] = [
  { id: 'a', title: 'Alpha', desc: '', domain: 'alpha.test', color: '#111', icon: 'A', category: 'Работа' },
  { id: 'b', title: 'Beta', desc: '', domain: 'https://beta.test/path', color: '#222', icon: 'B', category: 'Работа' },
];

describe('session restore plan', () => {
  it('resolves stored ids in deterministic session order', () => {
    const session: BrowserSession = { id: 's1', name: 'Work', siteIds: ['b', 'a'], createdAt: 1 };
    expect(createSessionRestorePlan(session, sites).map(item => item.site.id)).toEqual(['b', 'a']);
    expect(createSessionRestorePlan(session, sites).map(item => item.url)).toEqual(['https://beta.test/path', 'https://alpha.test']);
  });

  it('keeps legacy domain and title references working during migration', () => {
    const session: BrowserSession = { id: 's2', name: 'Legacy', siteIds: ['alpha.test', 'Beta'], createdAt: 1 };
    expect(createSessionRestorePlan(session, sites).map(item => item.site.id)).toEqual(['a', 'b']);
  });

  it('skips missing references instead of opening malformed URLs', () => {
    const session: BrowserSession = { id: 's3', name: 'Partial', siteIds: ['missing', 'a'], createdAt: 1 };
    expect(createSessionRestorePlan(session, sites)).toHaveLength(1);
    expect(createSessionRestorePlan(session, sites)[0].site.id).toBe('a');
  });
});
