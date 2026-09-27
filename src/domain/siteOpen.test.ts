import { describe, expect, it } from 'vitest';
import type { SiteRecord } from './types';
import { migrateHistory, recentSites, recordSiteOpen, resolveSiteUrl } from './siteOpen';

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
    expect(resolveSiteUrl({ ...github, url: 'https://github.com/openai/openai/issues/123' }))
      .toBe('https://github.com/openai/openai/issues/123');
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

  it('migrates legacy history references to ids once, dropping unknown ones', () => {
    const docs: SiteRecord = { ...github, id: 'site-docs', title: 'GitHub Docs', url: 'https://github.com/docs' };
    expect(migrateHistory(['GitHub Docs', 'github.com', 'site-github', 'https://github.com/docs', 'gone.example'], [github, docs]))
      .toEqual(['site-docs', 'site-github']);
    expect(migrateHistory('broken', [github])).toEqual([]);
    expect(migrateHistory([42, null, 'site-github'], [github])).toEqual(['site-github']);
  });

  it('keeps two saved addresses on one domain apart in the recent list', () => {
    const docs: SiteRecord = { ...github, id: 'site-docs', title: 'GitHub Docs', url: 'https://github.com/docs' };
    const opened = recordSiteOpen([github, docs], [], docs, 1, true);
    expect(recentSites(opened.history, [github, docs]).map(site => site.id)).toEqual(['site-docs']);
    const both = recordSiteOpen([github, docs], opened.history, github, 2, true);
    expect(recentSites(both.history, [github, docs]).map(site => site.id)).toEqual(['site-github', 'site-docs']);
    expect(recentSites(both.history, [github, docs], 1).map(site => site.id)).toEqual(['site-github']);
  });
});
