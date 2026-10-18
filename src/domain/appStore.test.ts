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

  it('starts without remote screenshots and does not keep retired UI flags', () => {
    localStorage.removeItem('nexus-ui');
    const fresh = createInitialAppState([]);
    expect(fresh.ui.remotePreviews).toBe(false);
    expect(fresh.ui).not.toHaveProperty('localOnly');
    expect(fresh.ui).not.toHaveProperty('analytics');
  });

  it('drops retired UI flags from legacy persisted state', () => {
    localStorage.setItem('nexus-ui', JSON.stringify({
      sidebar: true,
      localOnly: false,
      analytics: true,
      searchEngine: 'Яндекс',
    }));
    const migrated = createInitialAppState([]);
    expect(migrated.ui.searchEngine).toBe('Яндекс');
    expect(migrated.ui).not.toHaveProperty('localOnly');
    expect(migrated.ui).not.toHaveProperty('analytics');
    localStorage.removeItem('nexus-ui');
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

  it('keeps existing project, session and history links when a backup replaces a site by URL', () => {
    const existing = {
      ...initial,
      sites: [{ ...initial.sites[0], id: 'old-id', url: 'https://figma.com/docs' }],
      projects: [{ ...initial.projects[0], siteIds: ['old-id'] }],
      sessions: [{ id: 'old-session', name: 'Open tabs', siteIds: ['old-id'], noteSiteIds: ['old-id'], createdAt: 1 }],
      history: ['old-id'],
    };
    const next = appReducer(existing, { type: 'backup/apply', value: {
      version: 1, exportedAt: '2026-09-28T00:00:00.000Z',
      sites: [{ ...existing.sites[0], id: 'new-id' }],
      projects: [], categories: [], groups: [], sessions: [],
    } });

    expect(next.sites.filter(site => site.url === 'https://figma.com/docs')).toHaveLength(1);
    expect(next.projects[0].siteIds).toEqual(['new-id']);
    expect(next.sessions[0].siteIds).toEqual(['new-id']);
    expect(next.sessions[0].noteSiteIds).toEqual(['new-id']);
    expect(next.history).toEqual(['new-id']);
  });

  it('restores trash and history, deduplicating repeated imports without reviving deleted sites', () => {
    const deleted = { id: 'deleted', title: 'Old', domain: 'old.test', url: 'https://old.test/', desc: '', color: '#111', icon: 'O', category: 'Personal' };
    const backup = {
      version: 1 as const, exportedAt: '2026-09-28T00:00:00.000Z',
      sites: [], trash: [deleted], history: ['deleted', 'missing'],
      projects: [], categories: [], groups: [], sessions: [],
    };
    const first = appReducer(initial, { type: 'backup/apply', value: backup });
    const second = appReducer(first, { type: 'backup/apply', value: backup });
    expect(second.trash).toEqual([deleted]);
    expect(second.sites.some(site => site.id === 'deleted')).toBe(false);
    expect(second.history).toEqual(['deleted', 'missing']);
  });

  /**
   * Восстановление из копии обязано отбрасывать узлы без имени.
   *
   * Проверка заведена по следу находки разбора кода. `parseBackup` смотрит
   * только `Array.isArray(data.sites)`, а `applyBackup` прогоняет через
   * нормализацию только сайты и корзину: проекты, категории, группы и сессии
   * проходят через `isRecord` и приведение типа. Безымянный узел попадает в
   * состояние, и `NodeMark name={project.name}` зовёт
   * `normalizeName(undefined).toLowerCase()` — исключение на отрисовке, то
   * есть пустая страница вместо приложения.
   *
   * Защита уже есть в `migrateHierarchy` при обычной загрузке
   * (`hierarchy.ts`: `if (!item.name) continue`), но восстановление её
   * обходило.
   */
  it('отбрасывает из копии узлы без имени, а не пускает их в состояние', () => {
    const next = appReducer(initial, { type: 'backup/apply', value: {
      version: 1 as const, exportedAt: '2026-10-18T00:00:00.000Z',
      sites: [],
      projects: [
        { id: 'p-good', name: 'Рабочее', color: '#111', icon: 'Р', siteIds: [], createdAt: 1, updatedAt: 1 },
        { id: 'p-nameless', color: '#222', icon: 'X', siteIds: [], createdAt: 1, updatedAt: 1 },
        { id: 'p-blank', name: '   ', color: '#333', icon: 'Y', siteIds: [], createdAt: 1, updatedAt: 1 },
      ],
      categories: [
        { id: 'c-good', name: 'Документы', projectId: 'p-good' },
        { id: 'c-nameless', projectId: 'p-good' },
      ],
      groups: [
        { id: 'g-good', name: 'Чтение', categoryId: 'c-good' },
        { id: 'g-nameless', categoryId: 'c-good' },
      ],
      sessions: [
        { id: 's-good', name: 'Утро', siteIds: [], createdAt: 1 },
        { id: 's-nameless', siteIds: [], createdAt: 1 },
      ],
    } as any });

    // Годные узлы на месте.
    expect(next.projects.some(project => project.id === 'p-good')).toBe(true);
    expect(next.categories.some(category => category.id === 'c-good')).toBe(true);
    expect(next.groups.some(group => group.id === 'g-good')).toBe(true);
    expect(next.sessions.some(session => session.id === 's-good')).toBe(true);

    // Безымянных нет ни одного — ни с отсутствующим именем, ни с пустым.
    for (const project of next.projects) expect(typeof project.name === 'string' && project.name.trim()).toBeTruthy();
    for (const category of next.categories) expect(typeof category.name === 'string' && category.name.trim()).toBeTruthy();
    for (const group of next.groups) expect(typeof group.name === 'string' && group.name.trim()).toBeTruthy();
    for (const session of next.sessions) expect(typeof session.name === 'string' && session.name.trim()).toBeTruthy();
  });

  /**
   * У записи в корзине обязан быть идентификатор.
   *
   * Находка разбора кода. Сайты при загрузке получают `id` («site.id ||
   * сгенерированный»), а `nexus-trash` читался сырым. Запись без `id` ломала
   * восстановление: обработчик отбирал остаток видом `item.id !== site.id`, и
   * при двух безымянных записях `undefined !== undefined` ложно — из корзины
   * вычищались все записи без `id`, а не одна восстановленная. В остальных
   * местах проекта этот случай оговорён явно: `!item.id || !ids.has(item.id)`.
   */
  it('выдаёт идентификатор записи в корзине, как и сайту', () => {
    localStorage.setItem('nexus-trash', JSON.stringify([
      { title: 'Без id один', domain: 'one.test', desc: '', color: '#111', icon: 'О', category: 'Личное' },
      { title: 'Без id два', domain: 'two.test', desc: '', color: '#222', icon: 'Д', category: 'Личное' },
      { id: 'trash-kept', title: 'Со своим id', domain: 'three.test', desc: '', color: '#333', icon: 'С', category: 'Личное' },
    ]));
    const fresh = createInitialAppState([]);
    localStorage.removeItem('nexus-trash');

    expect(fresh.trash).toHaveLength(3);
    for (const item of fresh.trash) expect(item.id).toBeTruthy();
    // Идентификаторы разные — иначе отбор по `id` снова свалит их в одну.
    expect(new Set(fresh.trash.map(item => item.id)).size).toBe(3);
    // Свой идентификатор не переписывается.
    expect(fresh.trash.some(item => item.id === 'trash-kept')).toBe(true);
  });

  /**
   * Копия с адресом на `www.` подменяет запись, а не плодит дубль.
   *
   * Находка разбора кода: сверка «тот же сайт?» шла по `url`, в котором
   * `www.` остаётся, хотя у домена он снимается. Теперь сверка идёт по
   * отдельному ключу.
   */
  it('узнаёт тот же сайт по адресу с www и без него', () => {
    const existing = {
      ...initial,
      sites: [{ ...initial.sites[0], id: 'old-id', domain: 'figma.com', url: 'https://figma.com/docs' }],
    };
    const next = appReducer(existing, { type: 'backup/apply', value: {
      version: 1 as const, exportedAt: '2026-10-18T00:00:00.000Z',
      sites: [{ ...existing.sites[0], id: 'new-id', url: 'https://www.figma.com/docs' }],
      projects: [], categories: [], groups: [], sessions: [],
    } as any });

    expect(next.sites.filter(site => site.domain === 'figma.com')).toHaveLength(1);
    expect(next.sites[0].id).toBe('new-id');
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
