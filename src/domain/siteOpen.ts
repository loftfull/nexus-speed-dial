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
  return normalizeSiteAddress(site.url ?? site.domain)?.url
    ?? (hasHttpProtocol(site.domain) ? site.domain.trim() : `https://${site.domain.trim()}`);
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

export function resolveHistoryTarget(historyItem: string, sites: SiteRecord[]): HistoryTarget {
  const site = sites.find(item =>
    item.id === historyItem || item.url === historyItem || item.domain === historyItem || item.title === historyItem,
  );

  if (site) {
    return { site, url: resolveSiteUrl(site) };
  }

  const raw = historyItem.trim();
  return {
    site: undefined,
    url: hasHttpProtocol(raw) ? raw : `https://${raw}`,
  };
}
