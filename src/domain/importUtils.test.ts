import { describe, expect, it } from 'vitest';
import { parseBookmarkHtml, withoutExistingDomains } from './importUtils';

describe('import utilities', () => {
  it('parses browser bookmark HTML and ignores unsupported URLs', () => {
    const sites = parseBookmarkHtml('<DL><a href="https://www.example.com/docs"> Example </a><a href="javascript:alert(1)">No</a><a href="http://news.test">News</a></DL>');
    expect(sites).toHaveLength(2);
    expect(sites[0]).toMatchObject({ title: 'Example', domain: 'example.com', tags: ['импорт'] });
    expect(sites[1].icon).toBe('N');
  });

  it('removes imported domains already present locally', () => {
    const imported = [{ title: 'A', domain: 'a.test' }, { title: 'B', domain: 'b.test' }] as any[];
    const fresh = withoutExistingDomains(imported, [{ title: 'Existing', domain: 'a.test' }] as any[]);
    expect(fresh.map(site => site.domain)).toEqual(['b.test']);
  });
});
