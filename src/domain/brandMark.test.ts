import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  brandMarkUrl, loadBrandIndex, lookupBrand, parseBrandIndex, resetBrandIndex, siteIconCandidates,
} from './brandMark';

const INDEX = parseBrandIndex([
  'figma.com\tfigma\tF24E1E',
  'spotify.com\tspotify\t1ED760',
  'youtube.com\tyoutube\tFF0000',
  'плохая строка',
].join('\n'));

describe('brandMark', () => {
  beforeEach(() => resetBrandIndex());

  it('разбирает указатель и пропускает мусорные строки', () => {
    expect(INDEX.size).toBe(3);
    expect(INDEX.get('figma.com')).toEqual({ slug: 'figma', hex: '#F24E1E' });
  });

  it('находит знак по точному домену', () => {
    expect(lookupBrand(INDEX, 'figma.com')?.slug).toBe('figma');
  });

  it('отбрасывает поддомены, пока не найдёт знак', () => {
    expect(lookupBrand(INDEX, 'open.spotify.com')?.slug).toBe('spotify');
    expect(lookupBrand(INDEX, 'www.youtube.com')?.slug).toBe('youtube');
    expect(lookupBrand(INDEX, 'music.eu.youtube.com')?.slug).toBe('youtube');
  });

  it('чистит схему, порт и путь', () => {
    expect(lookupBrand(INDEX, 'https://Figma.com:443/files')?.slug).toBe('figma');
  });

  it('возвращает пусто, когда знака нет', () => {
    expect(lookupBrand(INDEX, 'example.org')).toBeNull();
    expect(lookupBrand(INDEX, '')).toBeNull();
    expect(lookupBrand(INDEX, 'localhost')).toBeNull();
  });

  it('строит адрес файла знака', () => {
    expect(brandMarkUrl('figma')).toBe('/brands/figma.svg');
  });

  it('загружает указатель один раз', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => 'figma.com\tfigma\tF24E1E' });
    const first = await loadBrandIndex(fetcher as unknown as typeof fetch);
    const second = await loadBrandIndex(fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.get('figma.com')?.slug).toBe('figma');
  });

  it('переживает недоступный указатель', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('сеть недоступна'));
    await expect(loadBrandIndex(fetcher as unknown as typeof fetch)).resolves.toEqual(new Map());
  });

  it('предлагает крупные иконки сайта раньше мелкого favicon.ico', () => {
    const list = siteIconCandidates('figma.com');
    expect(list[0]).toBe('https://figma.com/apple-touch-icon.png');
    expect(list[list.length - 1]).toBe('https://figma.com/favicon.ico');
    expect(siteIconCandidates('не-домен')).toEqual([]);
  });
});
