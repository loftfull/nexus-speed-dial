import { describe, expect, it } from 'vitest';
import { createSite, filterSites, normalizeDomain, reorderSites } from './siteUtils';
import type { SiteRecord } from './types';

const sites: SiteRecord[] = [
  { title: 'Figma', desc: 'Design', domain: 'figma.com', color: '#f24e35', icon: 'F', category: 'Проект', favorite: true, lastOpened: 2 },
  { title: 'Notion', desc: 'Workspace', domain: 'notion.so', color: '#111', icon: 'N', category: 'Работа', note: 'План недели', lastOpened: 3 },
  { title: 'YouTube', desc: 'Video', domain: 'youtube.com', color: '#f00', icon: 'Y', category: 'Развлечения', lastOpened: 1 },
];

describe('site utilities', () => {
  it('normalizes a URL to a searchable domain', () => {
    expect(normalizeDomain(' https://www.example.com/path?q=1 ')).toBe('example.com');
  });

  it('filters by query, category, favorites, notes and recency', () => {
    expect(filterSites(sites, 'workspace')).toHaveLength(1);
    expect(filterSites(sites, '', 'Работа').map(site => site.title)).toEqual(['Notion']);
    expect(filterSites(sites, '', 'Все', 'Избранное').map(site => site.title)).toEqual(['Figma']);
    expect(filterSites(sites, '', 'Все', 'Недавние').map(site => site.title)).toEqual(['Notion', 'Figma', 'YouTube']);
    expect(filterSites(sites, '', 'Все', 'Заметки').map(site => site.title)).toEqual(['Notion']);
  });

  it('reorders without mutating the source', () => {
    const reordered = reorderSites(sites, 'YouTube', 'Figma');
    expect(reordered.map(site => site.title)).toEqual(['YouTube', 'Figma', 'Notion']);
    expect(sites.map(site => site.title)).toEqual(['Figma', 'Notion', 'YouTube']);
  });

  it('creates valid sites and rejects empty input', () => {
    expect(createSite({ title: ' Linear ', domain: 'https://linear.app' }).domain).toBe('linear.app');
    expect(() => createSite({ title: '', domain: 'linear.app' })).toThrow();
  });
});
