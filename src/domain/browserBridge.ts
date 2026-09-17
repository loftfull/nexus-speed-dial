import type { SiteRecord } from './types';

export type BrowserTab = {
  id?: number;
  windowId?: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
  pinned: boolean;
  index: number;
};

export type BrowserBridgeRequest = {
  type: 'NEXUS_PING' | 'NEXUS_REQUEST_TABS';
  requestId: string;
};

export type BrowserRuntime = {
  sendMessage: (
    extensionId: string,
    message: BrowserBridgeRequest,
    callback: (response?: unknown) => void,
  ) => void;
  lastError?: { message?: string };
};

export type BrowserImportPlan = {
  newSites: SiteRecord[];
  siteIds: string[];
  existingDomainMatches: number;
  collapsedTabCount: number;
  unsupportedCount: number;
};

export class BrowserBridgeError extends Error {
  constructor(
    public readonly code: 'invalid-extension-id' | 'runtime-unavailable' | 'extension-unavailable' | 'invalid-response' | 'extension-error',
    message: string,
  ) {
    super(message);
    this.name = 'BrowserBridgeError';
  }
}

const SITE_COLORS = ['#3988ee', '#8b63e8', '#2aa879', '#e5a43a'];
const ALLOWED_TAB_PROTOCOLS = new Set(['http:', 'https:', 'ftp:']);
const IMPORTABLE_PROTOCOLS = new Set(['http:', 'https:']);

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `nexus-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function normalizedExtensionId(value: string) {
  return value.trim().toLowerCase();
}

function assertExtensionId(value: string) {
  const id = normalizedExtensionId(value);
  if (!/^[a-p]{32}$/.test(id)) {
    throw new BrowserBridgeError('invalid-extension-id', 'Укажите корректный 32-символьный ID расширения Chrome/Edge.');
  }
  return id;
}

function defaultRuntime(): BrowserRuntime | undefined {
  const root = globalThis as typeof globalThis & { chrome?: { runtime?: BrowserRuntime } };
  return root.chrome?.runtime;
}

function sendMessage(extensionId: string, message: BrowserBridgeRequest, runtime?: BrowserRuntime): Promise<unknown> {
  const target = runtime ?? defaultRuntime();
  if (!target?.sendMessage) {
    return Promise.reject(new BrowserBridgeError('runtime-unavailable', 'Browser extension messaging API недоступен в этом браузере.'));
  }

  return new Promise((resolve, reject) => {
    try {
      target.sendMessage(extensionId, message, response => {
        const runtimeError = target.lastError?.message;
        if (runtimeError) {
          reject(new BrowserBridgeError('extension-unavailable', runtimeError));
          return;
        }
        if (response === undefined) {
          reject(new BrowserBridgeError('extension-unavailable', 'Extension не ответил на запрос Nexus.'));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(new BrowserBridgeError('extension-unavailable', error instanceof Error ? error.message : String(error)));
    }
  });
}

export function isSupportedBrowserImportUrl(value: string) {
  try {
    return IMPORTABLE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function normalizeBrowserTabs(value: unknown): BrowserTab[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tabs: BrowserTab[] = [];

  for (const item of value) {
    const record = asRecord(item);
    if (!record || typeof record.url !== 'string') continue;

    let url: URL;
    try {
      url = new URL(record.url);
    } catch {
      continue;
    }
    if (!ALLOWED_TAB_PROTOCOLS.has(url.protocol)) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    tabs.push({
      id: typeof record.id === 'number' ? record.id : undefined,
      windowId: typeof record.windowId === 'number' ? record.windowId : undefined,
      title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : url.hostname,
      url: url.href,
      favIconUrl: typeof record.favIconUrl === 'string' ? record.favIconUrl : '',
      active: Boolean(record.active),
      pinned: Boolean(record.pinned),
      index: typeof record.index === 'number' ? record.index : tabs.length,
    });
  }

  return tabs;
}

function domainFromUrl(value: string) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
}

function uniqueTitle(preferred: string, usedTitles: Set<string>) {
  const base = preferred.trim() || 'Новая вкладка';
  if (!usedTitles.has(base)) {
    usedTitles.add(base);
    return base;
  }
  let index = 2;
  while (usedTitles.has(`${base} (${index})`)) index += 1;
  const next = `${base} (${index})`;
  usedTitles.add(next);
  return next;
}

export function prepareBrowserImport(tabs: BrowserTab[], existingSites: SiteRecord[]): BrowserImportPlan {
  const existingByDomain = new Map(existingSites.map(site => [site.domain.toLowerCase().replace(/^www\./, ''), site]));
  const createdByDomain = new Map<string, SiteRecord>();
  const usedTitles = new Set(existingSites.map(site => site.title));
  const siteIds: string[] = [];
  let existingDomainMatches = 0;
  let collapsedTabCount = 0;
  let unsupportedCount = 0;

  const addSiteId = (title: string) => {
    if (!siteIds.includes(title)) siteIds.push(title);
  };

  for (const tab of normalizeBrowserTabs(tabs)) {
    if (!isSupportedBrowserImportUrl(tab.url)) {
      unsupportedCount += 1;
      continue;
    }

    const domain = domainFromUrl(tab.url);
    const existing = existingByDomain.get(domain);
    if (existing) {
      existingDomainMatches += 1;
      addSiteId(existing.id||existing.title);
      continue;
    }

    const alreadyCreated = createdByDomain.get(domain);
    if (alreadyCreated) {
      collapsedTabCount += 1;
      addSiteId(alreadyCreated.id||alreadyCreated.title);
      continue;
    }

    const title = uniqueTitle(tab.title || domain, usedTitles);
    const created: SiteRecord = {
      id: `site-${domain.replace(/[^a-z0-9]+/gi, '-')}-${createdByDomain.size}`,
      title,
      desc: 'Импортировано из открытых вкладок браузера',
      domain,
      color: SITE_COLORS[createdByDomain.size % SITE_COLORS.length],
      icon: (title.trim()[0] || domain[0] || '•').toUpperCase(),
      category: 'Личное',
      tags: ['browser-import'],
    };
    createdByDomain.set(domain, created);
    addSiteId(created.id||created.title);
  }

  return {
    newSites: Array.from(createdByDomain.values()),
    siteIds,
    existingDomainMatches,
    collapsedTabCount,
    unsupportedCount,
  };
}

export async function checkBrowserExtension(extensionId: string, runtime?: BrowserRuntime) {
  const id = assertExtensionId(extensionId);
  const message: BrowserBridgeRequest = { type: 'NEXUS_PING', requestId: requestId() };
  const response = asRecord(await sendMessage(id, message, runtime));
  if (!response || response.type !== 'NEXUS_PONG' || response.requestId !== message.requestId) {
    throw new BrowserBridgeError('invalid-response', 'Extension ответил в неизвестном формате.');
  }
  if (typeof response.error === 'string' && response.error) {
    throw new BrowserBridgeError('extension-error', response.error);
  }
}

export async function requestBrowserTabs(extensionId: string, runtime?: BrowserRuntime): Promise<BrowserTab[]> {
  const id = assertExtensionId(extensionId);
  const message: BrowserBridgeRequest = { type: 'NEXUS_REQUEST_TABS', requestId: requestId() };
  const response = asRecord(await sendMessage(id, message, runtime));
  if (!response || response.type !== 'NEXUS_TABS_RESPONSE' || response.requestId !== message.requestId) {
    throw new BrowserBridgeError('invalid-response', 'Extension ответил в неизвестном формате.');
  }
  if (typeof response.error === 'string' && response.error) {
    throw new BrowserBridgeError('extension-error', response.error);
  }
  return normalizeBrowserTabs(response.tabs);
}
