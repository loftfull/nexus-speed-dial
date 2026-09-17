import { describe, expect, it } from 'vitest';
import type { SiteRecord } from './types';
import { recordSiteOpen, resolveHistoryTarget, resolveSiteUrl } from './siteOpen';

const github: SiteRecord = {
  id: 'site-github',
  title: 'GitHub',
  desc: 'Код',
  domain: 'github.com',
  color: '#111827',
  icon: 'GH',
  category: 'Работа',
};

const legacyHttp: SiteRecord = {
  id: 'site-legacy',
  title: 'Legacy',
  desc: 'Архив',
  domain: 'http://example.com/archive',
  color: '#334155',
  icon: 'L',
  category: 'Работа',
};

describe('siteOpen domain action', () => {
  it('normalizes domains to https without corrupting an existing protocol', () => {
    expect(resolveSiteUrl(github)).toBe('https://github.com');
    expect(resolveSiteUrl(legacyHttp)).toBe('http://example.com/archive');
  });

  it('records lastOpened and stable site id at the front of history', () => {
    const result = recordSiteOpen([github], ['old.example'], github, 123456, true);

    expect(result.sites[0].lastOpened).toBe(123456);
    expect(result.history).toEqual(['site-github', 'old.example']);
  });

  it('deduplicates legacy title/domain history entries for the same saved site', () => {
    const result = recordSiteOpen(
      [github],
      ['GitHub', 'github.com', 'site-github', 'other.example'],
      github,
      55,
      true,
    );

    expect(result.history).toEqual(['site-github', 'other.example']);
  });

  it('updates lastOpened but does not add history when history persistence is disabled', () => {
    const result = recordSiteOpen([github], ['existing.example'], github, 777, false);

    expect(result.sites[0].lastOpened).toBe(777);
    expect(result.history).toEqual(['existing.example']);
  });

  it('resolves stable ids, legacy titles, legacy domains and raw urls safely', () => {
    const sites = [github];

    expect(resolveHistoryTarget('site-github', sites)).toEqual({ site: github, url: 'https://github.com' });
    expect(resolveHistoryTarget('GitHub', sites)).toEqual({ site: github, url: 'https://github.com' });
    expect(resolveHistoryTarget('github.com', sites)).toEqual({ site: github, url: 'https://github.com' });
    expect(resolveHistoryTarget('http://example.com/archive', sites)).toEqual({ site: undefined, url: 'http://example.com/archive' });
    expect(resolveHistoryTarget('example.org', sites)).toEqual({ site: undefined, url: 'https://example.org' });
  });
});
