import type { SiteRecord } from './types';
import { normalizeSiteAddress } from './siteUtils';

export type SiteOpenState = {
  sites: SiteRecord[];
  history: string[];
};

export type HistoryTarget = {
  site?: SiteRecord;
  url: string;
};

function hasHttpProtocol(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function resolveSiteUrl(site: SiteRecord): string {
  if (site.url) {
    return normalizeSiteAddress(site.url)?.url ?? site.url.trim();
  }
  const value = site.domain.trim();
  return hasHttpProtocol(value) ? value : `https://${value}`;
}

function historyAliases(site: SiteRecord): Set<string> {
  const aliases = new Set<string>();
  if (site.id) aliases.add(site.id);
  aliases.add(site.title);
  aliases.add(site.domain);
  if (site.url) aliases.add(site.url);
  aliases.add(resolveSiteUrl(site));
  return aliases;
}

export function recordSiteOpen(
  sites: SiteRecord[],
  history: string[],
  site: SiteRecord,
  now: number,
  saveHistory: boolean,
): SiteOpenState {
  const identity = site.id ?? site.url ?? site.domain;
  const aliases = historyAliases(site);
  const nextSites = sites.map(item => {
    const matches = site.id
      ? item.id === site.id
      : resolveSiteUrl(item) === resolveSiteUrl(site) && item.title === site.title;
    return matches ? { ...item, lastOpened: now } : item;
  });

  if (!saveHistory) {
    return { sites: nextSites, history: [...history] };
  }

  return {
    sites: nextSites,
    history: [identity, ...history.filter(item => !aliases.has(item))].slice(0, 20),
  };
}

/**
 * Переводит историю открытий на постоянные ID.
 *
 * Прежние версии писали в историю название, домен или адрес. Такая ссылка
 * неоднозначна: два сохранённых адреса на одном домене — разные записи, и
 * «Недавние» показывали бы первую попавшуюся. Проекты и сессии уже
 * переводятся на ID при загрузке; история проходит тот же путь один раз, после
 * чего сайты в ней ищутся только по ID.
 *
 * `known` — все записи, на которые история может ссылаться, включая корзину:
 * сайт, восстановленный из корзины, возвращается в «Недавние». Ссылки, которые
 * не узнаются ни в одной записи, отбрасываются — открыть по ним нечего.
 */
export function migrateHistory(history: unknown, known: SiteRecord[]): string[] {
  if (!Array.isArray(history)) return [];
  const ids: string[] = [];
  for (const ref of history) {
    if (typeof ref !== 'string') continue;
    const site = known.find(item => item.id === ref)
      ?? known.find(item => item.url === ref || resolveSiteUrl(item) === ref)
      ?? known.find(item => item.domain === ref)
      ?? known.find(item => item.title === ref);
    if (site?.id && !ids.includes(site.id)) ids.push(site.id);
  }
  return ids.slice(0, 20);
}

/** Сайты из истории по порядку, без повторов, только по ID. */
export function recentSites(history: string[], sites: SiteRecord[], limit = Infinity): SiteRecord[] {
  const byId = new Map(sites.filter(site => site.id).map(site => [site.id!, site]));
  const found: SiteRecord[] = [];
  for (const id of new Set(history)) {
    const site = byId.get(id);
    if (!site) continue;
    found.push(site);
    if (found.length >= limit) break;
  }
  return found;
}
