export type SearchEngine = 'Google' | 'Яндекс' | 'DuckDuckGo' | 'Bing';

const SEARCH_ENGINES: SearchEngine[] = ['Google', 'Яндекс', 'DuckDuckGo', 'Bing'];

export function normalizeSearchEngine(value: unknown): SearchEngine {
  return SEARCH_ENGINES.includes(value as SearchEngine) ? value as SearchEngine : 'Google';
}

export function buildWebSearchUrl(engine: unknown, query: string): string {
  const provider = normalizeSearchEngine(engine);
  const encoded = encodeURIComponent(query.trim());
  switch (provider) {
    case 'Яндекс': return `https://yandex.com/search/?text=${encoded}`;
    case 'DuckDuckGo': return `https://duckduckgo.com/?q=${encoded}`;
    case 'Bing': return `https://www.bing.com/search?q=${encoded}`;
    default: return `https://www.google.com/search?q=${encoded}`;
  }
}
