import { describe, expect, it } from 'vitest';
import { boardColumns, boardCrumbs, projectCards, projectSites } from './dashboard';
import type { Category, Project, SiteGroup, SiteRecord } from './types';

const site = (id: string, categoryId?: string, groupId?: string): SiteRecord => ({
  id, title: id, desc: '', domain: `${id}.test`, color: '#111', icon: 'X', category: '', categoryId, groupId,
});

const project = (id: string, siteIds: string[]): Project => ({
  id, name: id, color: '#111', icon: 'X', siteIds, createdAt: 0, updatedAt: 0,
});

const category = (id: string, projectId: string): Category => ({ id, name: id, projectId });
const group = (id: string, categoryId: string): SiteGroup => ({ id, name: id, categoryId });

describe('projectSites', () => {
  const categories = [category('к1', 'p'), category('к2', 'p'), category('чужая', 'другой')];

  it('берёт сайты через категории проекта, а не через siteIds', () => {
    const sites = [site('a', 'к1'), site('b', 'к2'), site('c', 'чужая'), site('d')];
    // siteIds намеренно пуст: раньше счётчик читал именно его и давал ноль.
    expect(projectSites('p', categories, sites).map(s => s.id)).toEqual(['a', 'b']);
  });

  it('не считает сайты без категории', () => {
    expect(projectSites('p', categories, [site('d')])).toEqual([]);
  });
});

describe('projectCards', () => {
  it('счётчик совпадает с числом сайтов в категориях проекта', () => {
    const categories = [category('к1', 'p1'), category('к2', 'p1'), category('к3', 'p2')];
    const sites = [site('a', 'к1'), site('b', 'к1'), site('c', 'к2'), site('d', 'к3')];
    const cards = projectCards([project('p1', []), project('p2', [])], categories, sites);
    expect(cards.map(c => [c.project.id, c.total])).toEqual([['p1', 3], ['p2', 1]]);
  });

  it('пустой проект показывает ноль, а не пропадает', () => {
    const cards = projectCards([project('p1', [])], [], []);
    expect(cards).toEqual([{ project: cards[0].project, total: 0 }]);
  });
});

describe('boardColumns', () => {
  const categories = [category('к1', 'p'), category('к2', 'p'), category('чужая', 'другой')];
  const groups = [group('г1', 'к1'), group('г2', 'к1')];
  const sites = [
    site('s1', 'к1', 'г1'), site('s2', 'к1', 'г1'), site('s3', 'к1', 'г2'),
    site('s4', 'к1'), site('s5', 'к2'), site('s6', 'чужая'),
  ];

  it('без категории показывает категории проекта и не пускает чужие', () => {
    const columns = boardColumns({ categories, groups, sites, projectId: 'p' });
    expect(columns.map(c => c.id)).toEqual(['к1', 'к2']);
    expect(columns[0].total).toBe(4);
    expect(columns[1].total).toBe(1);
  });

  it('с выбранной категорией показывает её группы', () => {
    const columns = boardColumns({ categories, groups, sites, projectId: 'p', categoryId: 'к1' });
    expect(columns.map(c => c.id)).toEqual(['г1', 'г2', 'к1:loose']);
    expect(columns[0].sites.map(s => s.id)).toEqual(['s1', 's2']);
  });

  it('не теряет сайты категории, не разложенные по группам', () => {
    const columns = boardColumns({ categories, groups, sites, projectId: 'p', categoryId: 'к1' });
    const loose = columns.find(c => c.id === 'к1:loose');
    expect(loose?.sites.map(s => s.id)).toEqual(['s4']);
  });

  it('не добавляет колонку «Без группы», когда таких сайтов нет', () => {
    const tidy = sites.filter(s => s.id !== 's4');
    const columns = boardColumns({ categories, groups, sites: tidy, projectId: 'p', categoryId: 'к1' });
    expect(columns.some(c => c.name === 'Без группы')).toBe(false);
  });

  it('счётчик считает всю ветку, а не только поместившееся', () => {
    const many = Array.from({ length: 9 }, (_, i) => site(`m${i}`, 'к2'));
    const columns = boardColumns({ categories, groups, sites: many, projectId: 'p', limit: 4 });
    const second = columns.find(c => c.id === 'к2');
    expect(second?.total).toBe(9);
    expect(second?.sites).toHaveLength(4);
  });

  it('пустая категория остаётся колонкой: в неё можно положить сайт', () => {
    const columns = boardColumns({ categories, groups, sites: [], projectId: 'p' });
    expect(columns).toHaveLength(2);
    expect(columns[0].total).toBe(0);
  });
});

describe('boardCrumbs', () => {
  it('собирает крошки по мере углубления', () => {
    expect(boardCrumbs({ project: 'П' })).toEqual(['П']);
    expect(boardCrumbs({ project: 'П', category: 'К' })).toEqual(['П', 'К']);
    expect(boardCrumbs({ project: 'П', category: 'К', group: 'Г' })).toEqual(['П', 'К', 'Г']);
  });

  it('не вставляет пустых звеньев', () => {
    expect(boardCrumbs({})).toEqual([]);
    expect(boardCrumbs({ project: 'П', group: 'Г' })).toEqual(['П', 'Г']);
  });
});
