import { describe, expect, it } from 'vitest';
import { buildPaletteItems, fuzzyMatch, looksLikeUrl, rankPaletteItems } from './palette';
import type { PaletteItem } from './palette';
import type { Category, Project, SiteGroup, SiteRecord } from './types';

const project = (id: string, name: string): Project =>
  ({ id, name, color: '#3988ee', icon: 'Home', siteIds: [], createdAt: 0, updatedAt: 0 });

const projects: Project[] = [project('p-home', 'Дом'), project('p-work', 'Работа')];
const categories: Category[] = [
  { id: 'c-read', name: 'Чтение', projectId: 'p-home' },
  { id: 'c-design', name: 'Дизайн', projectId: 'p-work' },
];
const groups: SiteGroup[] = [{ id: 'g-tools', name: 'Инструменты', categoryId: 'c-design' }];
const sites: SiteRecord[] = [
  { id: 's-figma', title: 'Figma', desc: 'Макеты', domain: 'figma.com', url: 'https://figma.com/files',
    color: '#f24e35', icon: 'F', category: 'Дизайн', categoryId: 'c-design', groupId: 'g-tools', lastOpened: 5 },
  { id: 's-habr', title: 'Хабр', desc: 'Статьи', domain: 'habr.com', color: '#111', icon: 'Х',
    category: 'Чтение', categoryId: 'c-read', tags: ['лонгрид'] },
];

const input = {
  sites, projects, categories, groups,
  sections: [{ id: 'trash', label: 'Корзина' }],
  commands: [{ id: 'add-site', title: 'Добавить сайт', hint: 'Новая закладка', shortcut: 'Ctrl N' }],
};

describe('fuzzyMatch', () => {
  it('finds a scattered subsequence across words', () => {
    expect(fuzzyMatch('Toggle Sidebar', 'tg sb')).not.toBeNull();
    expect(fuzzyMatch('Toggle Sidebar', 'xyz')).toBeNull();
  });

  it('reports the matched positions so the UI can highlight them', () => {
    expect(fuzzyMatch('Figma', 'fg')?.positions).toEqual([0, 2]);
  });

  it('scores a title start above a match in the middle', () => {
    const start = fuzzyMatch('Дом', 'до')!.score;
    const middle = fuzzyMatch('Свой дом', 'до')!.score;
    expect(start).toBeGreaterThan(middle);
  });

  it('scores contiguous letters above scattered ones', () => {
    expect(fuzzyMatch('Figma', 'fig')!.score).toBeGreaterThan(fuzzyMatch('Figma', 'fga')!.score);
  });

  it('treats an empty query as a match with no highlight', () => {
    expect(fuzzyMatch('Figma', '  ')).toEqual({ score: 0, positions: [] });
  });
});

describe('buildPaletteItems', () => {
  it('covers sites, commands, sections, projects, categories and groups', () => {
    const kinds = new Set(buildPaletteItems(input).map(item => item.kind));
    expect([...kinds].sort()).toEqual(['category', 'command', 'group', 'project', 'section', 'site']);
  });

  it('puts recently opened sites first and never repeats them', () => {
    const items = buildPaletteItems(input);
    expect(items[0].id).toBe('site:s-figma');
    expect(items.filter(item => item.id === 'site:s-figma')).toHaveLength(1);
  });

  it('spells the full path of a site so its place is visible', () => {
    const figma = buildPaletteItems(input).find(item => item.id === 'site:s-figma')!;
    expect(figma.hint).toBe('figma.com · Работа → Дизайн → Инструменты');
  });

  it('drops bookmarks when bookmark search is switched off', () => {
    const items = buildPaletteItems({ ...input, includeSites: false });
    expect(items.some(item => item.kind === 'site')).toBe(false);
    expect(items.some(item => item.kind === 'command')).toBe(true);
  });
});

describe('rankPaletteItems', () => {
  const items = buildPaletteItems(input);

  it('finds a site that lives in another project', () => {
    expect(rankPaletteItems(items, 'хабр')[0].id).toBe('site:s-habr');
  });

  it('finds a site by its domain, tag and description', () => {
    expect(rankPaletteItems(items, 'habr.com')[0].id).toBe('site:s-habr');
    expect(rankPaletteItems(items, 'лонгрид')[0].id).toBe('site:s-habr');
    expect(rankPaletteItems(items, 'макеты')[0].id).toBe('site:s-figma');
  });

  it('prefers a title hit over a hit hidden in the keywords', () => {
    const ranked = rankPaletteItems(items, 'дизайн');
    expect(ranked[0].id).toBe('category:c-design');
  });

  it('highlights only what matched in the title', () => {
    const ranked = rankPaletteItems(items, 'habr.com');
    expect(ranked[0].positions).toEqual([]);
    expect(rankPaletteItems(items, 'хаб')[0].positions).toEqual([0, 1, 2]);
  });

  it('keeps the build order for an empty query and honours the limit', () => {
    const ranked = rankPaletteItems(items, '', 3);
    expect(ranked.map(item => item.id)).toEqual(items.slice(0, 3).map(item => item.id));
  });

  it('returns nothing when the query matches nothing', () => {
    expect(rankPaletteItems(items, 'щщщ')).toEqual([]);
  });

  it('does not rank a web action: the app appends it itself', () => {
    const web: PaletteItem = { id: 'web:x', kind: 'web', ref: 'x', title: 'Искать', hint: '', keywords: '' };
    expect(rankPaletteItems([web], 'искать')[0].kind).toBe('web');
  });
});

describe('looksLikeUrl', () => {
  it('separates an address from a search phrase', () => {
    expect(looksLikeUrl('figma.com')).toBe(true);
    expect(looksLikeUrl('https://figma.com/files')).toBe(true);
    expect(looksLikeUrl('как сверстать сетку')).toBe(false);
    expect(looksLikeUrl('figma')).toBe(false);
  });
});
