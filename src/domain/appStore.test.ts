import { describe, expect, it } from 'vitest';
import type { StorageAdapter } from './storage';
import { appReducer, createInitialAppState, normalizeMobileMode, persistAppState } from './appStore';

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
    expect(fresh.projects.map(project => project.name)).toEqual(['Дом', 'Работа', 'Личное', 'Обучение', 'Покупки', 'Развлечения']);
    expect(fresh.categories.filter(category => category.projectId === 'project-home').map(category => category.name)).toEqual(['Соцсети', 'Развлечения']);
    expect(fresh.groups.filter(group => group.categoryId === 'cat-home-social').map(group => group.name)).toEqual(['Видео', 'Чаты', 'Почта']);
  });

  it('starts in strict local-first mode without remote screenshots', () => {
    localStorage.removeItem('nexus-ui');
    const fresh = createInitialAppState([]);
    expect(fresh.ui.localOnly).toBe(true);
    expect(fresh.ui.remotePreviews).toBe(false);
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

  it('applies a backup as one state transaction, including saved settings', () => {
    const backup = {
      version: 1,
      exportedAt: '2026-09-19T00:00:00.000Z',
      sites: [{
        id: 'site-backup',
        title: 'Backup docs',
        desc: 'Docs',
        domain: 'backup.test',
        url: 'https://backup.test/docs',
        color: '#123456',
        icon: 'B',
        category: 'Research',
        categoryId: 'cat-backup',
      }],
      projects: [{ id: 'project-backup', name: 'Research', color: '#234567', icon: 'R', siteIds: ['site-backup'], createdAt: 1, updatedAt: 2 }],
      categories: [{ id: 'cat-backup', name: 'Research', projectId: 'project-backup' }],
      groups: [{ id: 'group-backup', name: 'Docs', categoryId: 'cat-backup' }],
      sessions: [{ id: 'session-backup', name: 'Research', siteIds: ['site-backup'], createdAt: 3 }],
      settings: {
        ui: { compact: true, searchEngine: 'Яндекс', mobileMode: 'icons' },
        tile: { preset: 'flat', mode: 'list' },
        appearance: { theme: 'dark', accent: '#c9364f', wallpaper: 'plain' },
      },
    };

    const next = appReducer(initial, { type: 'backup/apply', value: backup } as any);

    expect(next.sites.some(site => site.id === 'site-backup' && site.url === 'https://backup.test/docs')).toBe(true);
    expect(next.projects.some(project => project.id === 'project-backup')).toBe(true);
    expect(next.categories.some(category => category.id === 'cat-backup')).toBe(true);
    expect(next.groups.some(group => group.id === 'group-backup')).toBe(true);
    expect(next.sessions.some(session => session.id === 'session-backup')).toBe(true);
    expect(next.ui).toMatchObject({ compact: true, searchEngine: 'Яндекс', mobileMode: 'icons' });
    expect(next.tile).toMatchObject({ preset: 'flat', mode: 'list' });
    expect(next.appearance).toMatchObject({ theme: 'dark', accent: '#c9364f', wallpaper: 'plain' });
    expect(next.history).toBe(initial.history);
    expect(next.trash).toBe(initial.trash);
  });

  it('keeps a known mobile arrangement and rejects anything else', () => {
    expect(normalizeMobileMode('rows')).toBe('rows');
    expect(normalizeMobileMode('icons')).toBe('icons');
    // Older builds stored a menu label in this key.
    expect(normalizeMobileMode('В виде меню')).toBe('table');
    expect(normalizeMobileMode(undefined)).toBe('table');
  });

  it('starts with the table arrangement on a narrow screen', () => {
    expect(initial.ui.mobileMode).toBe('table');
  });
});

describe('сохранение при переполнении хранилища', () => {
  /**
   * Хранилище с потолком по объёму, как настоящее. Счёт по числу записей не
   * годился: девять ключей из десяти при повторном сохранении не меняются, и
   * места они не просят — переполнение так не наступало вовсе.
   */
  function tight(limitBytes: number) {
    const data = new Map<string, string>();
    const size = () => [...data.entries()].reduce((sum, [key, value]) => sum + key.length + value.length, 0);
    let limit = limitBytes;
    const adapter: StorageAdapter = {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => {
        const without = size() - (data.has(key) ? key.length + (data.get(key) ?? '').length : 0);
        if (without + key.length + value.length > limit) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        data.set(key, value);
      },
      removeItem: key => { data.delete(key); },
      key: index => [...data.keys()][index] ?? null,
    };
    return { adapter, data, shrinkTo: (bytes: number) => { limit = bytes; } };
  }

  const stateWith = (title: string) => ({
    ...createInitialAppState([]),
    sites: [{ id: 'site-1', title, desc: '', domain: 'a.test', color: '#111', icon: 'A', category: 'К', categoryId: 'cat-1' }],
  });

  it('пишет все десять ключей, когда места хватает', () => {
    const store = tight(1_000_000);
    expect(persistAppState(stateWith('Первый'), store.adapter)).toBe(true);
    expect(store.data.size).toBe(10);
  });

  it('не оставляет половину записи, когда место кончилось', () => {
    const store = tight(1_000_000);
    persistAppState(stateWith('Первый'), store.adapter);
    const snapshot = new Map(store.data);
    const used = [...store.data.entries()].reduce((sum, [key, value]) => sum + key.length + value.length, 0);

    // Разрыв надо смоделировать честно: ранний ключ должен поместиться, а
    // поздний — нет. Иначе отказ случается на первом же ключе, рвать нечего,
    // и проверка проходит даже без отката — на этом первая её редакция и
    // попалась.
    //
    // «Второй» ровно той же длины, что «Первый», поэтому nexus-sites ложится
    // без роста. А список сессий вырастает настолько, что до него места уже
    // не хватает.
    store.shrinkTo(used + 40);
    const torn = {
      ...stateWith('Второй'),
      sessions: [{ id: 'session-1', name: 'С'.repeat(400), siteIds: [], createdAt: 1 }],
    };
    expect(persistAppState(torn, store.adapter)).toBe(false);

    // Ни один ключ не изменился: несогласованного состояния не осталось.
    expect([...store.data.entries()].sort()).toEqual([...snapshot.entries()].sort());
    expect(store.data.get('nexus-sites')).toContain('Первый');
    expect(store.data.get('nexus-sites')).not.toContain('Второй');
  });

  it('ключ, которого не было, после отката не появляется', () => {
    // Места нет совсем: ни один ключ не должен остаться.
    const store = tight(20);
    expect(persistAppState(stateWith('Первый'), store.adapter)).toBe(false);
    expect(store.data.size).toBe(0);
  });
});
