import { describe, expect, it } from 'vitest';
import { createSite, destinationKey, filterSites, normalizeDomain, reorderSites } from './siteUtils';
import type { SiteRecord } from './types';

const sites: SiteRecord[] = [
  { id: 's-figma', title: 'Figma', desc: 'Design', domain: 'figma.com', color: '#f24e35', icon: 'F', category: 'Проект', categoryId: 'c-project', favorite: true, lastOpened: 2 },
  { id: 's-notion', title: 'Notion', desc: 'Workspace', domain: 'notion.so', color: '#111', icon: 'N', category: 'Работа', categoryId: 'c-work', groupId: 'g-docs', note: 'План недели', lastOpened: 3 },
  { id: 's-youtube', title: 'YouTube', desc: 'Video', domain: 'youtube.com', color: '#f00', icon: 'Y', category: 'Развлечения', categoryId: 'c-fun', lastOpened: 1 },
];

describe('site utilities', () => {
  it('normalizes a URL to a searchable domain', () => {
    expect(normalizeDomain(' https://www.example.com/path?q=1 ')).toBe('example.com');
  });

  it('filters by query, favorites, notes and recency', () => {
    expect(filterSites(sites, 'workspace')).toHaveLength(1);
    expect(filterSites(sites, '', {}, 'Избранное').map(site => site.title)).toEqual(['Figma']);
    expect(filterSites(sites, '', {}, 'Недавние').map(site => site.title)).toEqual(['Notion', 'Figma', 'YouTube']);
    expect(filterSites(sites, '', {}, 'Заметки').map(site => site.title)).toEqual(['Notion']);
  });

  it('scopes the grid to a project, a category or a group', () => {
    const categoryIdsOfProject = (projectId: string) => projectId === 'p-home' ? ['c-project', 'c-fun'] : ['c-work'];
    expect(filterSites(sites, '', { categoryId: 'c-work' }).map(site => site.title)).toEqual(['Notion']);
    expect(filterSites(sites, '', { groupId: 'g-docs' }).map(site => site.title)).toEqual(['Notion']);
    expect(filterSites(sites, '', { categoryId: 'c-work', groupId: 'g-none' })).toEqual([]);
    expect(filterSites(sites, '', { projectId: 'p-home' }, 'Быстрый доступ', categoryIdsOfProject).map(site => site.title)).toEqual(['Figma', 'YouTube']);
    expect(filterSites(sites, '', { projectId: 'p-work' }, 'Быстрый доступ', categoryIdsOfProject).map(site => site.title)).toEqual(['Notion']);
  });

  it('reorders without mutating the source', () => {
    const reordered = reorderSites(sites, 's-youtube', 's-figma');
    expect(reordered.map(site => site.title)).toEqual(['YouTube', 'Figma', 'Notion']);
    expect(sites.map(site => site.title)).toEqual(['Figma', 'Notion', 'YouTube']);
  });

  it('creates valid sites and rejects empty input', () => {
    const linear = createSite({ title: ' Linear ', domain: 'https://linear.app/projects?view=active' });
    expect(linear.domain).toBe('linear.app');
    expect(linear.url).toBe('https://linear.app/projects?view=active');
    expect(() => createSite({ title: '', domain: 'linear.app' })).toThrow();
  });

  it('assigns a unique identity immediately when a site is created', () => {
    const first = createSite({ title: 'GitHub Docs', domain: 'github.com/docs' });
    const second = createSite({ title: 'GitHub Issues', domain: 'github.com/issues' });
    expect(first.id).toMatch(/^site-/);
    expect(second.id).toMatch(/^site-/);
    expect(first.id).not.toBe(second.id);
  });

  it('reorders by id so two bookmarks on one domain stay independent', () => {
    const withDuplicate = [...sites, { id: 's-yt-subs', title: 'Подписки', desc: '', domain: 'youtube.com', color: '#f00', icon: 'A', category: 'Соцсети' }];
    const reordered = reorderSites(withDuplicate, 's-yt-subs', 's-figma');
    expect(reordered.map(site => site.id)).toEqual(['s-yt-subs', 's-figma', 's-notion', 's-youtube']);
  });

  it('ignores an id that is not in the list', () => {
    expect(reorderSites(sites, 'missing', 's-figma')).toBe(sites);
  });
});

describe('ключ назначения не зависит от www', () => {
  /**
   * Находка разбора кода. `normalizeSiteAddress` чистит `www.` у домена, но
   * оставляет его в `url`. Сверка «тот же сайт?» шла по `url`, поэтому
   * `https://www.youtube.com/` и `https://youtube.com/` считались разными: в
   * импорте закладок рядом с сайтом набора появлялся второй, а восстановление
   * из копии не подменяло запись, а добавляло дубль.
   *
   * Сам `url` при этом не переписывается: иные сайты отдают разное на `www.`
   * и без него, и менять адрес перехода нельзя. Поэтому для сверки заведён
   * отдельный ключ.
   */
  const site = (url: string): SiteRecord => ({
    title: 'X', desc: '', domain: 'x', url, color: '#111', icon: 'X', category: 'Личное',
  });

  it('сводит www и не-www к одному ключу', () => {
    expect(destinationKey(site('https://www.youtube.com/'))).toBe(destinationKey(site('https://youtube.com/')));
  });

  it('но различает разные пути и параметры', () => {
    expect(destinationKey(site('https://a.test/one'))).not.toBe(destinationKey(site('https://a.test/two')));
    expect(destinationKey(site('https://a.test/p?x=1'))).not.toBe(destinationKey(site('https://a.test/p?x=2')));
    expect(destinationKey(site('https://a.test/p#top'))).not.toBe(destinationKey(site('https://a.test/p#end')));
  });

  it('различает разные домены', () => {
    expect(destinationKey(site('https://a.test/'))).not.toBe(destinationKey(site('https://b.test/')));
  });
});
