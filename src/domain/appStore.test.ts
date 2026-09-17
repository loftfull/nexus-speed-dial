import { describe, expect, it } from 'vitest';
import { appReducer, createInitialAppState } from './appStore';

describe('app store reducer', () => {
  const initial = createInitialAppState([{ title: 'Figma', desc: '', domain: 'figma.com', color: '#f00', icon: 'F', category: 'Проект' }]);
  it('updates collections through functional actions', () => {
    const next = appReducer(initial, { type: 'sites/set', value: sites => [...sites, { title: 'Notion', desc: '', domain: 'notion.so', color: '#111', icon: 'N', category: 'Работа' }] });
    expect(next.sites).toHaveLength(2);
    const categories = [{ id: 'c-1', name: 'Проект', projectId: 'project-home' }, { id: 'c-2', name: 'Работа', projectId: 'project-home' }];
    expect(appReducer(next, { type: 'categories/set', value: categories }).categories).toEqual(categories);
    const groups = [{ id: 'g-1', name: 'Видео', categoryId: 'c-1' }];
    expect(appReducer(next, { type: 'groups/set', value: groups }).groups).toEqual(groups);
  });
  it('attaches a legacy site to a category created from its name', () => {
    expect(initial.categories.map(category => category.name)).toContain('Проект');
    expect(initial.sites[0].categoryId).toBe(initial.categories.find(category => category.name === 'Проект')?.id);
  });

  it('ships the default hierarchy when nothing is stored yet', () => {
    const fresh = createInitialAppState([]);
    expect(fresh.projects.map(project => project.name)).toEqual(['Дом', 'Работа', 'Личное']);
    expect(fresh.categories.filter(category => category.projectId === 'project-home').map(category => category.name)).toEqual(['Соцсети', 'Развлечения']);
    expect(fresh.groups.filter(group => group.categoryId === 'cat-home-social').map(group => group.name)).toEqual(['Видео', 'Чаты', 'Почта']);
  });

  it('clamps density to a safe range', () => {
    expect(appReducer(initial, { type: 'density/set', value: 1 }).density).toBe(4);
    expect(appReducer(initial, { type: 'density/set', value: 100 }).density).toBe(32);
  });

  it('migrates legacy sidebar width values stored with a space', () => {
    localStorage.setItem('nexus-ui', JSON.stringify({ sidebar: true, sidebarWidth: '292 px' }));
    const migrated = createInitialAppState([]);
    expect(migrated.ui.sidebarWidth).toBe('292px');
    localStorage.removeItem('nexus-ui');
  });

  it('migrates legacy project and session references to persisted site ids', () => {
    localStorage.setItem('nexus-sites', JSON.stringify([{ title: 'Figma', desc: '', domain: 'figma.com', color: '#f00', icon: 'F', category: 'Проект' }]));
    localStorage.setItem('nexus-projects', JSON.stringify([{ id: 'project-legacy', name: 'Research', color: '#111', icon: 'R', siteIds: ['Figma'], createdAt: 1, updatedAt: 1 }]));
    localStorage.setItem('nexus-sessions', JSON.stringify([{ id: 'session-legacy', name: 'Research', siteIds: ['figma.com'], createdAt: 1 }]));
    const migrated = createInitialAppState([]);
    expect(migrated.sites[0].id).toBe('site-figma-com-0');
    expect(migrated.projects[0].siteIds).toEqual(['site-figma-com-0']);
    expect(migrated.sessions[0].siteIds).toEqual(['site-figma-com-0']);
    ['nexus-sites', 'nexus-projects', 'nexus-sessions'].forEach(key => localStorage.removeItem(key));
  });
});
