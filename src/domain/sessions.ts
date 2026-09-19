import type { BrowserSession, SiteRecord } from './types';

/**
 * Сессия — папка с набором сайтов: либо тем, что открыт в браузере прямо
 * сейчас (через расширение), либо тем, что выбран в приложении. Сессия знает
 * свой проект, поэтому у каждого проекта своя стопка рабочих наборов.
 */

export const MAX_SESSION_NAME = 60;

function makeSessionId(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `session-${random}`;
}

/** Идентификатор сайта: у старых записей его может не быть, тогда адрес. */
export const siteKey = (site: SiteRecord): string => site.id ?? site.domain;

export function createSession(input: {
  name: string;
  sites: SiteRecord[];
  projectId?: string;
  now?: number;
}): BrowserSession {
  const name = input.name.trim().slice(0, MAX_SESSION_NAME);
  if (!name) throw new Error('У сессии должно быть название');
  const siteIds = [...new Set(input.sites.map(siteKey))];
  if (!siteIds.length) throw new Error('В сессии должен быть хотя бы один сайт');
  return {
    id: makeSessionId(),
    name,
    projectId: input.projectId,
    siteIds,
    createdAt: input.now ?? Date.now(),
  };
}

/**
 * Сайты сессии в том же порядке, в каком их сохранили. Удалённые сайты
 * выпадают: сессия не должна открывать то, чего уже нет.
 */
export function sessionSites(session: BrowserSession, sites: SiteRecord[]): SiteRecord[] {
  const byKey = new Map(sites.map(site => [siteKey(site), site]));
  return session.siteIds.map(id => byKey.get(id)).filter((site): site is SiteRecord => Boolean(site));
}

/** Сколько сайтов сессии ещё существует. */
export const liveCount = (session: BrowserSession, sites: SiteRecord[]): number =>
  sessionSites(session, sites).length;

export function renameSession(sessions: BrowserSession[], id: string, name: string): BrowserSession[] {
  const next = name.trim().slice(0, MAX_SESSION_NAME);
  if (!next) return sessions;
  return sessions.map(session => (session.id === id ? { ...session, name: next } : session));
}

export const removeSession = (sessions: BrowserSession[], id: string): BrowserSession[] =>
  sessions.filter(session => session.id !== id);

/** Отметка об открытии: по ней сессии сортируются свежими вперёд. */
export const touchSession = (sessions: BrowserSession[], id: string, now = Date.now()): BrowserSession[] =>
  sessions.map(session => (session.id === id ? { ...session, lastOpenedAt: now } : session));

/**
 * Сессии текущего проекта идут первыми, внутри — недавно открытые, затем
 * недавно созданные. Сессии без проекта видны всегда: их сохраняли вне дерева.
 */
export function orderSessions(sessions: BrowserSession[], projectId?: string | null): BrowserSession[] {
  const weight = (session: BrowserSession) => (session.projectId === projectId ? 0 : session.projectId ? 2 : 1);
  return [...sessions].sort((a, b) => {
    const byProject = weight(a) - weight(b);
    if (byProject) return byProject;
    return (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
  });
}
