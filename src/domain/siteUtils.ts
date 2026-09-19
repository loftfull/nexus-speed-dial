import type { SiteRecord } from './types';

export type NormalizedSiteAddress = { domain: string; url: string };

export function normalizeSiteAddress(value: string): NormalizedSiteAddress | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const domain = parsed.host.replace(/^www\./i, '');
    const validHost = domain.includes('.') || /^localhost(?::\d{1,5})?$/i.test(domain);
    if (!validHost) return null;
    return { domain, url: parsed.toString() };
  } catch {
    return null;
  }
}

export function normalizeDomain(value: string): string {
  return normalizeSiteAddress(value)?.domain ?? '';
}

export type SiteScope = { projectId?: string | null; categoryId?: string | null; groupId?: string | null };

/**
 * Narrow the grid to the selected place in the Project → Category → Group tree.
 * `categoryIdsOfProject` lets the caller scope a bare project selection without
 * siteUtils needing the category list itself.
 */
export function filterSites(
  sites: SiteRecord[],
  query: string,
  scope: SiteScope = {},
  section = 'Быстрый доступ',
  categoryIdsOfProject?: (projectId: string) => string[],
): SiteRecord[] {
  const needle = query.trim().toLowerCase();
  let result = sites.filter(site => {
    const matchesQuery = !needle || `${site.title} ${site.desc} ${site.domain} ${site.url ?? ''} ${site.note ?? ''} ${(site.tags ?? []).join(' ')}`.toLowerCase().includes(needle);
    let matchesScope = true;
    if (scope.groupId) matchesScope = site.groupId === scope.groupId;
    else if (scope.categoryId) matchesScope = site.categoryId === scope.categoryId;
    else if (scope.projectId && categoryIdsOfProject) matchesScope = categoryIdsOfProject(scope.projectId).includes(site.categoryId ?? '');
    const matchesSection = section !== 'Избранное' || Boolean(site.favorite);
    return matchesQuery && matchesScope && matchesSection;
  });
  if (section === 'Недавние') result = result.sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0)).slice(0, 6);
  if (section === 'Заметки') result = result.filter(site => Boolean(site.note));
  if (section === 'Загрузки') result = [];
  return result;
}

/** `dragged` and `target` are site ids; domains are not unique. */
export function reorderSites(sites: SiteRecord[], dragged: string, target: string): SiteRecord[] {
  if (!dragged || dragged === target) return sites;
  const next = [...sites];
  const from = next.findIndex(site => site.id === dragged);
  const to = next.findIndex(site => site.id === target);
  if (from < 0 || to < 0) return sites;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function createSiteId(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `site-${random}`;
}

export function createSite(input: Partial<SiteRecord>): SiteRecord {
  const title = (input.title ?? '').trim();
  const address = normalizeSiteAddress(input.url ?? input.domain ?? '');
  if (!title || !address) throw new Error('Название и адрес сайта обязательны');
  return {
    id: input.id || createSiteId(),
    title,
    domain: address.domain,
    url: address.url,
    desc: input.desc?.trim() || 'Сохранённый сайт',
    color: input.color || '#2f7cf6',
    icon: input.icon || title[0].toUpperCase(),
    category: input.category || 'Личное',
    favorite: input.favorite ?? false,
    note: input.note?.trim() || undefined,
  };
}
