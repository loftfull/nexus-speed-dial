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
  return folders;
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
      const tags = Array.from(new Set(['импорт', ...folders.slice(1)]));
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

export function withoutExistingDomains(imported: SiteRecord[], existing: SiteRecord[]) {
  const existingDomains = new Set(existing.map(site => site.domain));
  return imported.filter(site => !existingDomains.has(site.domain));
}
