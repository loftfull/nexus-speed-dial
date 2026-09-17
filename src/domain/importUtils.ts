import type { SiteRecord } from './types';

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
        domain: url.hostname.replace(/^www\./, ''),
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

export function createBookmarkHtml(sites: SiteRecord[]) {
  const grouped = new Map<string, SiteRecord[]>();
  sites.forEach(site => { const category = site.category || 'Личное'; grouped.set(category, [...(grouped.get(category) ?? []), site]); });
  const folders = Array.from(grouped, ([category, items]) => `<DT><H3>${escapeHtml(category)}</H3><DL><p>${items.map(site => `<DT><A HREF="https://${escapeHtml(site.domain)}" TAGS="${escapeHtml((site.tags ?? []).filter(tag => tag !== 'импорт').join(','))}">${escapeHtml(site.title)}</A>`).join('')}</DL>`).join('');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1><META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"><TITLE>Nexus bookmarks</TITLE><H1>Nexus bookmarks</H1><DL><p>${folders}</DL>`;
}

export function withoutExistingDomains(imported: SiteRecord[], existing: SiteRecord[]) {
  const existingDomains = new Set(existing.map(site => site.domain));
  return imported.filter(site => !existingDomains.has(site.domain));
}
