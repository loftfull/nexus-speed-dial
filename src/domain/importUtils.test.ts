import { describe, expect, it } from 'vitest';
import { createBookmarkHtml, parseBookmarkHtml, withoutExistingDomains } from './importUtils';

describe('import utilities', () => {
  it('parses browser bookmark HTML and preserves the full destination URL', () => {
    const sites = parseBookmarkHtml('<DL><a href="https://www.example.com/docs?page=2#api"> Example </a><a href="javascript:alert(1)">No</a><a href="http://news.test">News</a></DL>');
    expect(sites).toHaveLength(2);
    expect(sites[0]).toMatchObject({
      title: 'Example',
      domain: 'example.com',
      url: 'https://www.example.com/docs?page=2#api',
      tags: ['импорт'],
    });
    expect(sites[1].icon).toBe('N');
  });

  it('exports categories as bookmark folders and restores them on import', () => {
    const html = createBookmarkHtml([
      { title: 'Docs & notes', domain: 'docs.test', desc: '', color: '#000', icon: 'D', category: 'Работа', tags: ['важное', 'docs'] },
      { title: 'Home', domain: 'home.test', desc: '', color: '#000', icon: 'H', category: 'Личное' },
    ]);
    const sites = parseBookmarkHtml(html);
    expect(html).toContain('<H3>Работа</H3>');
    expect(html).toContain('TAGS="важное,docs"');
    expect(sites).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Docs & notes', domain: 'docs.test', category: 'Работа', tags: ['импорт', 'важное', 'docs'] }),
      expect.objectContaining({ title: 'Home', domain: 'home.test', category: 'Личное' }),
    ]));
  });

  it('ignores browser structural roots while preserving user folders', () => {
    const sites = parseBookmarkHtml('<DL><p><DT><H3>Bookmarks Bar</H3><DL><p><DT><H3>Работа</H3><DL><p><DT><A HREF="https://nested.test">Nested</A></DL></DL></DL>');
    expect(sites[0]).toMatchObject({ category: 'Работа', tags: ['импорт'] });
  });

  it('preserves bookmark folders as category and tags', () => {
    const sites = parseBookmarkHtml('<DL><p><DT><H3>Работа</H3><DL><p><DT><H3>Research</H3><DL><p><DT><A HREF="https://nested.test">Nested</A></DL></DL></DL>');
    expect(sites[0]).toMatchObject({ category: 'Работа', tags: ['импорт', 'Research'] });
  });

  it('deduplicates exact destinations but keeps different pages on the same domain', () => {
    const imported = [
      { title: 'Docs', domain: 'github.com', url: 'https://github.com/openai/openai/tree/main/docs' },
      { title: 'Issues', domain: 'github.com', url: 'https://github.com/openai/openai/issues' },
      { title: 'Other', domain: 'b.test', url: 'https://b.test/' },
    ] as any[];
    const existing = [
      { title: 'Existing docs', domain: 'github.com', url: 'https://github.com/openai/openai/tree/main/docs' },
    ] as any[];
    const fresh = withoutExistingDomains(imported, existing);
    expect(fresh.map(site => site.url)).toEqual([
      'https://github.com/openai/openai/issues',
      'https://b.test/',
    ]);
  });

  it('exports the stored full URL instead of collapsing it to the hostname', () => {
    const html = createBookmarkHtml([
      { title: 'Issue', domain: 'github.com', url: 'https://github.com/openai/openai/issues/123', desc: '', color: '#000', icon: 'G', category: 'Работа' } as any,
    ]);
    expect(html).toContain('HREF="https://github.com/openai/openai/issues/123"');
  });
});
