import { describe, expect, it } from 'vitest';
import {
  createSession, liveCount, orderSessions, removeSession, renameSession, sessionSites, touchSession,
} from './sessions';
import type { BrowserSession, SiteRecord } from './types';

const site = (id: string, title: string): SiteRecord =>
  ({ id, title, desc: '', domain: `${id}.com`, color: '#000', icon: title[0], category: 'Тест' });

const sites = [site('a', 'Alpha'), site('b', 'Beta'), site('c', 'Gamma')];

describe('createSession', () => {
  it('собирает сессию из выбранных сайтов', () => {
    const session = createSession({ name: '  Работа на утро  ', sites, projectId: 'p1', now: 10 });
    expect(session.name).toBe('Работа на утро');
    expect(session.siteIds).toEqual(['a', 'b', 'c']);
    expect(session.projectId).toBe('p1');
    expect(session.createdAt).toBe(10);
  });

  it('не повторяет один сайт дважды', () => {
    expect(createSession({ name: 'Набор', sites: [sites[0], sites[0], sites[1]] }).siteIds).toEqual(['a', 'b']);
  });

  it('отказывается от пустого названия и пустого набора', () => {
    expect(() => createSession({ name: '   ', sites })).toThrow();
    expect(() => createSession({ name: 'Пусто', sites: [] })).toThrow();
  });

  it('обрезает слишком длинное название', () => {
    expect(createSession({ name: 'я'.repeat(200), sites }).name).toHaveLength(60);
  });
});

describe('sessionSites', () => {
  const session: BrowserSession = { id: 's1', name: 'Набор', siteIds: ['c', 'a', 'нет'], createdAt: 0 };

  it('возвращает сайты в порядке сохранения', () => {
    expect(sessionSites(session, sites).map(item => item.id)).toEqual(['c', 'a']);
  });

  it('пропускает удалённые сайты, а не открывает пустоту', () => {
    expect(liveCount(session, sites)).toBe(2);
    expect(liveCount(session, [])).toBe(0);
  });
});

describe('изменение списка', () => {
  const list: BrowserSession[] = [
    { id: 's1', name: 'Первая', siteIds: ['a'], createdAt: 1 },
    { id: 's2', name: 'Вторая', siteIds: ['b'], createdAt: 2 },
  ];

  it('переименовывает и не даёт стереть название пустой строкой', () => {
    expect(renameSession(list, 's1', ' Новое ')[0].name).toBe('Новое');
    expect(renameSession(list, 's1', '   ')[0].name).toBe('Первая');
  });

  it('удаляет по идентификатору', () => {
    expect(removeSession(list, 's1').map(item => item.id)).toEqual(['s2']);
  });

  it('отмечает время открытия', () => {
    expect(touchSession(list, 's2', 99).find(item => item.id === 's2')?.lastOpenedAt).toBe(99);
    expect(touchSession(list, 's2', 99).find(item => item.id === 's1')?.lastOpenedAt).toBeUndefined();
  });
});

describe('orderSessions', () => {
  const list: BrowserSession[] = [
    { id: 'other', name: 'Чужой проект', projectId: 'p2', siteIds: ['a'], createdAt: 5 },
    { id: 'free', name: 'Без проекта', siteIds: ['a'], createdAt: 6 },
    { id: 'mine-old', name: 'Мой старый', projectId: 'p1', siteIds: ['a'], createdAt: 1 },
    { id: 'mine-new', name: 'Мой свежий', projectId: 'p1', siteIds: ['a'], createdAt: 2 },
  ];

  it('сначала текущий проект, потом ничейные, потом чужие', () => {
    expect(orderSessions(list, 'p1').map(item => item.id)).toEqual(['mine-new', 'mine-old', 'free', 'other']);
  });

  it('внутри группы недавно открытые идут первыми', () => {
    const touched = touchSession(list, 'mine-old', 100);
    expect(orderSessions(touched, 'p1')[0].id).toBe('mine-old');
  });

  it('без выбранного проекта ничейные оказываются впереди', () => {
    expect(orderSessions(list, null)[0].id).toBe('free');
  });
});
