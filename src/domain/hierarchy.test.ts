import { describe, expect, it } from 'vitest';
import { migrateHierarchy, makeCategoryId } from './hierarchy';
import type { Project, SiteRecord } from './types';

const projects: Project[] = [
  { id: 'p-home', name: 'Дом', color: '#3988ee', icon: 'Д', siteIds: [], createdAt: 0, updatedAt: 0 },
  { id: 'p-work', name: 'Работа', color: '#8b63e8', icon: 'Р', siteIds: [], createdAt: 0, updatedAt: 0 },
];

const site = (over: Partial<SiteRecord>): SiteRecord => ({
  id: 'site-1', title: 'Figma', desc: '', domain: 'figma.com', color: '#000', icon: 'F', category: 'Дизайн', ...over,
});

describe('workspace hierarchy migration', () => {
  it('turns a legacy string[] of categories into records under the first project', () => {
    const result = migrateHierarchy({ projects, categories: ['Соцсети', 'Финансы'], groups: [], sites: [] });
    expect(result.categories).toEqual([
      { id: makeCategoryId('Соцсети', 'p-home'), name: 'Соцсети', projectId: 'p-home' },
      { id: makeCategoryId('Финансы', 'p-home'), name: 'Финансы', projectId: 'p-home' },
    ]);
  });

  it('links sites to their category by name and keeps the denormalised label', () => {
    const result = migrateHierarchy({ projects, categories: ['Дизайн'], groups: [], sites: [site({})] });
    expect(result.sites[0].categoryId).toBe(makeCategoryId('Дизайн', 'p-home'));
    expect(result.sites[0].category).toBe('Дизайн');
  });

  it('creates a category for a site whose name is missing from the list', () => {
    const result = migrateHierarchy({ projects, categories: [], groups: [], sites: [site({ category: 'Покупки' })] });
    expect(result.categories.map(item => item.name)).toEqual(['Покупки']);
    expect(result.sites[0].categoryId).toBe(makeCategoryId('Покупки', 'p-home'));
  });

  it('keeps already migrated records and their project assignment', () => {
    const categories = [{ id: 'c-1', name: 'Соцсети', projectId: 'p-work' }];
    const result = migrateHierarchy({ projects, categories, groups: [], sites: [site({ categoryId: 'c-1', category: 'Соцсети' })] });
    expect(result.categories).toEqual(categories);
    expect(result.sites[0].categoryId).toBe('c-1');
  });

  it('drops groups whose category no longer exists and keeps valid ones', () => {
    const categories = [{ id: 'c-1', name: 'Соцсети', projectId: 'p-home' }];
    const groups = [{ id: 'g-1', name: 'Видео', categoryId: 'c-1' }, { id: 'g-x', name: 'Потеряшка', categoryId: 'c-gone' }];
    const result = migrateHierarchy({ projects, categories, groups, sites: [] });
    expect(result.groups).toEqual([{ id: 'g-1', name: 'Видео', categoryId: 'c-1' }]);
  });

  it('clears a group reference that does not belong to the site category', () => {
    const categories = [{ id: 'c-1', name: 'Соцсети', projectId: 'p-home' }, { id: 'c-2', name: 'Финансы', projectId: 'p-home' }];
    const groups = [{ id: 'g-1', name: 'Видео', categoryId: 'c-1' }];
    const result = migrateHierarchy({ projects, categories, groups, sites: [site({ categoryId: 'c-2', category: 'Финансы', groupId: 'g-1' })] });
    expect(result.sites[0].groupId).toBeUndefined();
  });

  it('falls back to the first project when a category points at a missing one', () => {
    const result = migrateHierarchy({ projects, categories: [{ id: 'c-1', name: 'Соцсети', projectId: 'p-gone' }], groups: [], sites: [] });
    expect(result.categories[0].projectId).toBe('p-home');
  });
});
