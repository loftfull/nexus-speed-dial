import type { SiteRecord } from './types';

const colors = ['#3988ee', '#8b63e8', '#2aa879', '#e5a43a'];

export function parseBookmarkHtml(text: string): SiteRecord[] {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter(anchor => /^https?:/i.test(anchor.href))
    .map((anchor, index) => {
      const url = new URL(anchor.href);
      const title = anchor.textContent?.trim() || url.hostname;
      return {
        title,
        domain: url.hostname.replace(/^www\./, ''),
        desc: 'Импортированная закладка',
        color: colors[index % colors.length],
        icon: title[0].toUpperCase(),
        category: 'Личное',
        tags: ['импорт'],
      };
    });
}

export function withoutExistingDomains(imported: SiteRecord[], existing: SiteRecord[]) {
  const existingDomains = new Set(existing.map(site => site.domain));
  return imported.filter(site => !existingDomains.has(site.domain));
}
