import { describe, expect, it } from 'vitest';
import { createBookmarkHtml, parseBookmarkHtml, withoutExistingDomains } from './importUtils';

describe('import utilities', () => {
  it('parses browser bookmark HTML and ignores unsupported URLs', () => {
    const sites = parseBookmarkHtml('<DL><a href="https://www.example.com/docs"> Example </a><a href="javascript:alert(1)">No</a><a href="http://news.test">News</a></DL>');
    expect(sites).toHaveLength(2);
    expect(sites[0]).toMatchObject({ title: 'Example', domain: 'example.com', tags: ['импорт'] });
    expect(sites[1].icon).toBe('N');
  });

  it('exports categories as bookmark folders and restores them on import', () => {
    const html = createBookmarkHtml([
      { title: 'Docs & notes', domain: 'docs.test', desc: '', color: '#000', icon: 'D', category: 'Работа' },
      { title: 'Home', domain: 'home.test', desc: '', color: '#000', icon: 'H', category: 'Личное' },
    ]);
    const sites = parseBookmarkHtml(html);
    expect(html).toContain('<H3>Работа</H3>');
    expect(sites).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Docs & notes', domain: 'docs.test', category: 'Работа' }),
      expect.objectContaining({ title: 'Home', domain: 'home.test', category: 'Личное' }),
    ]));
  });

  it('preserves bookmark folders as category and tags', () => {
    const sites = parseBookmarkHtml('<DL><p><DT><H3>Работа</H3><DL><p><DT><H3>Research</H3><DL><p><DT><A HREF="https://nested.test">Nested</A></DL></DL></DL>');
    expect(sites[0]).toMatchObject({ category: 'Работа', tags: ['импорт', 'Research'] });
  });

  it('removes imported domains already present locally', () => {
    const imported = [{ title: 'A', domain: 'a.test' }, { title: 'B', domain: 'b.test' }] as any[];
    const fresh = withoutExistingDomains(imported, [{ title: 'Existing', domain: 'a.test' }] as any[]);
    expect(fresh.map(site => site.domain)).toEqual(['b.test']);
  });
});
