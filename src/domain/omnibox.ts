import type { SearchEngine, Site } from './types.ts';

export type OmniboxResolution =
  | { kind: 'empty' }
  | { kind: 'site'; site: Site }
  | { kind: 'url' | 'search'; url: string };

function normalizeUrl(input: string) {
  const value = input.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSAFE_URL');
  return url.toString();
}

function searchUrl(query: string, engine: SearchEngine): string {
  if (engine === 'yandex') {
    const url = new URL('https://yandex.ru/search/');
    url.searchParams.set('text', query);
    return url.toString();
  }
  if (engine === 'duckduckgo') {
    const url = new URL('https://duckduckgo.com/');
    url.searchParams.set('q', query);
    return url.toString();
  }
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  return url.toString();
}

export function suggestSites(query: string, sites: Site[]) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sites.filter(site => `${site.title} ${site.domain} ${site.subtitle ?? ''}`.toLowerCase().includes(q)).slice(0, 6);
}

export function resolveOmnibox(input: string, sites: Site[], engine: SearchEngine = 'google'): OmniboxResolution {
  const q = input.trim();
  if (!q) return { kind: 'empty' };

  const exact = sites.find(site => [site.title, site.domain, site.url].some(value => value.toLowerCase() === q.toLowerCase()));
  if (exact) return { kind: 'site', site: exact };

  if (!/\s/.test(q) && (q.includes('.') || /^https?:\/\//i.test(q))) {
    try {
      return { kind: 'url', url: normalizeUrl(q) };
    } catch {
      // Unsafe or malformed URL-like input intentionally falls through to web search.
    }
  }

  return { kind: 'search', url: searchUrl(q, engine) };
}
