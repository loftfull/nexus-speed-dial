import { describe, expect, it } from 'vitest';
import { plural, sites, items, projects, tabs } from './plural';

describe('russian plural agreement', () => {
  it('uses the singular form for 1, 21, 101', () => {
    expect(sites(1)).toBe('1 сайт');
    expect(sites(21)).toBe('21 сайт');
    expect(sites(101)).toBe('101 сайт');
  });

  it('uses the paucal form for 2-4 and their compounds', () => {
    expect(sites(2)).toBe('2 сайта');
    expect(sites(3)).toBe('3 сайта');
    expect(sites(4)).toBe('4 сайта');
    expect(sites(22)).toBe('22 сайта');
  });

  it('uses the genitive plural for 0, 5-20 and teens', () => {
    expect(sites(0)).toBe('0 сайтов');
    expect(sites(5)).toBe('5 сайтов');
    expect(sites(11)).toBe('11 сайтов');
    expect(sites(12)).toBe('12 сайтов');
    expect(sites(14)).toBe('14 сайтов');
    expect(sites(25)).toBe('25 сайтов');
  });

  it('applies the same rules to other nouns', () => {
    expect(items(1)).toBe('1 материал');
    expect(projects(3)).toBe('3 проекта');
    expect(tabs(5)).toBe('5 вкладок');
    expect(plural(2, 'тег', 'тега', 'тегов')).toBe('2 тега');
  });
});
