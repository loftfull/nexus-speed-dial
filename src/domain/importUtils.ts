import type { Category, SiteRecord } from './types';
import { normalizeSiteAddress } from './siteUtils';
import { makeCategoryId } from './hierarchy';

/**
 * Поставить импортированным сайтам `categoryId` — иначе их не видно на сетке.
 *
 * Оба пути импорта, закладки и открытые вкладки браузера, задавали только имя
 * категории (`category: 'Личное'`), а идентификатор оставляли пустым. Сетка же
 * отбирает сайты видом `ids.has(site.categoryId ?? '')` по категориям
 * открытого проекта, и `activeProjectId` всегда задан — он падает на
 * `projects[0].id`. Поэтому «добавлено два» было правдой, а плиток на экране
 * не появлялось. Сайты всплывали только после перезагрузки: при обычной
 * загрузке `migrateHierarchy` привязывает их к категории по имени.
 *
 * Здесь делается то же самое, но сразу: имя ищется среди категорий нужного
 * проекта, а если такой нет — создаётся, с тем же `makeCategoryId`, что и в
 * миграции. Сайт с уже заполненным `categoryId` не трогается.
 */
export function attachImportCategory<T extends SiteRecord>(
  incoming: T[],
  categories: Category[],
  projectId: string | null,
): { sites: T[]; categories: Category[] } {
  if (!projectId) return { sites: incoming, categories };
  const byName = new Map(categories
    .filter(category => category.projectId === projectId)
    .map(category => [category.name.trim().toLowerCase(), category]));
  const added: Category[] = [];

  const sites = incoming.map(site => {
    if (site.categoryId) return site;
    const name = (site.category ?? '').trim() || 'Личное';
    const key = name.toLowerCase();
    let category = byName.get(key);
    if (!category) {
      category = { id: makeCategoryId(name, projectId), name, projectId };
      byName.set(key, category);
      added.push(category);
    }
    return { ...site, categoryId: category.id, category: category.name };
  });

  return { sites, categories: added.length ? [...categories, ...added] : categories };
}

const colors = ['#3988ee', '#8b63e8', '#2aa879', '#e5a43a'];

function bookmarkFolders(anchor: HTMLAnchorElement): string[] {
  const folders: string[] = [];
  let list = anchor.parentElement?.closest('dl') ?? null;
  while (list) {
    const heading = list.previousElementSibling?.querySelector('h3')?.textContent?.trim()
      || (list.previousElementSibling?.tagName === 'H3' ? list.previousElementSibling.textContent?.trim() : '');
    if (heading) folders.unshift(heading);
    list = list.parentElement?.closest('dl') ?? null;
  }
  const structuralRoots = new Set(['bookmarks bar', 'other bookmarks', 'mobile bookmarks', 'favorites bar']);
  return folders.filter(folder => !structuralRoots.has(folder.toLowerCase()));
}

export function parseBookmarkHtml(text: string): SiteRecord[] {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter(anchor => /^https?:/i.test(anchor.href))
    .map((anchor, index) => {
      const url = new URL(anchor.href);
      const title = anchor.textContent?.trim() || url.hostname;
      const folders = bookmarkFolders(anchor);
      const category = folders[0] || 'Личное';
      const bookmarkTags = (anchor.getAttribute('tags') || anchor.getAttribute('TAGS') || '').split(',').map(tag => tag.trim()).filter(Boolean);
      const tags = Array.from(new Set(['импорт', ...folders.slice(1), ...bookmarkTags]));
      return {
        title,
        domain: url.host.replace(/^www\./i, ''),
        url: url.toString(),
        desc: 'Импортированная закладка',
        color: colors[index % colors.length],
        icon: title[0].toUpperCase(),
        category,
        tags,
      };
    });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string));
}

function siteDestination(site: SiteRecord): string {
  return normalizeSiteAddress(site.url ?? site.domain)?.url ?? `https://${site.domain}`;
}

export function createBookmarkHtml(sites: SiteRecord[]) {
  const grouped = new Map<string, SiteRecord[]>();
  sites.forEach(site => { const category = site.category || 'Личное'; grouped.set(category, [...(grouped.get(category) ?? []), site]); });
  const folders = Array.from(grouped, ([category, items]) => `<DT><H3>${escapeHtml(category)}</H3><DL><p>${items.map(site => `<DT><A HREF="${escapeHtml(siteDestination(site))}" TAGS="${escapeHtml((site.tags ?? []).filter(tag => tag !== 'импорт').join(','))}">${escapeHtml(site.title)}</A>`).join('')}</DL>`).join('');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1><META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"><TITLE>Nexus bookmarks</TITLE><H1>Nexus bookmarks</H1><DL><p>${folders}</DL>`;
}

/**
 * Legacy export name kept for callers. Dedupe is now destination-based:
 * two different pages on the same hostname are independent bookmarks.
 */
export function withoutExistingDomains(imported: SiteRecord[], existing: SiteRecord[]) {
  const existingDestinations = new Set(existing.map(siteDestination));
  return imported.filter(site => !existingDestinations.has(siteDestination(site)));
}
