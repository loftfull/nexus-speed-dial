import { describe, expect, it } from 'vitest';
import { buildWebSearchUrl, normalizeSearchEngine } from './webSearch';

describe('web search provider', () => {
  it.each([
    ['Google', 'https://www.google.com/search?q=Nexus%20Speed%20Dial'],
    ['Яндекс', 'https://yandex.com/search/?text=Nexus%20Speed%20Dial'],
    ['DuckDuckGo', 'https://duckduckgo.com/?q=Nexus%20Speed%20Dial'],
    ['Bing', 'https://www.bing.com/search?q=Nexus%20Speed%20Dial'],
  ])('builds an encoded %s search URL', (engine, expected) => {
    expect(buildWebSearchUrl(engine, 'Nexus Speed Dial')).toBe(expected);
  });

  it('falls back to Google for unknown stored values', () => {
    expect(normalizeSearchEngine('Unknown')).toBe('Google');
    expect(buildWebSearchUrl('Unknown', 'test')).toBe('https://www.google.com/search?q=test');
  });
});
