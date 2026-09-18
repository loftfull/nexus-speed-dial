/**
 * Подбор фирменного знака сайта.
 *
 * Знаки лежат в `public/brands` и собираются из simple-icons скриптом
 * `scripts/build-brand-marks.mjs`. Указатель «домен → знак» грузится один раз
 * и лениво: до первой плитки он не нужен.
 */

export type BrandMark = { slug: string; hex: string };
export type BrandIndex = Map<string, BrandMark>;

/**
 * Адреса строятся от базового пути сборки, а не от корня: под GitHub Actions
 * приложение отдаётся из подкаталога, и абсолютный «/brands/…» там даёт 404 —
 * фирменные знаки молча не находились.
 */
const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/*$/, '/');

export const BRAND_INDEX_URL = `${BASE}brands/index.txt`;
export const brandMarkUrl = (slug: string) => `${BASE}brands/${slug}.svg`;

/** Разбирает строки вида «домен\tзнак\tцвет». */
export function parseBrandIndex(text: string): BrandIndex {
  const index: BrandIndex = new Map();
  for (const line of text.split('\n')) {
    const [domain, slug, hex] = line.split('\t');
    if (domain && slug && hex) index.set(domain, { slug, hex: `#${hex}` });
  }
  return index;
}

/**
 * Ищет знак по домену, постепенно отбрасывая поддомены:
 * `open.spotify.com` → `spotify.com`. Так одна запись покрывает всё семейство.
 */
export function lookupBrand(index: BrandIndex, domain: string): BrandMark | null {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '');
  if (!clean) return null;
  let parts = clean.split('.').filter(Boolean);
  while (parts.length >= 2) {
    const candidate = parts.join('.');
    const found = index.get(candidate);
    if (found) return found;
    parts = parts.slice(1);
  }
  return null;
}

let pending: Promise<BrandIndex> | null = null;

/** Загружает указатель один раз на всё приложение. Ошибка сети не роняет плитки. */
export function loadBrandIndex(fetcher: typeof fetch = fetch): Promise<BrandIndex> {
  pending ??= fetcher(BRAND_INDEX_URL)
    .then(response => (response.ok ? response.text() : ''))
    .then(parseBrandIndex)
    .catch(() => new Map<string, BrandMark>());
  return pending;
}

/** Только для тестов: сбрасывает кэш указателя. */
export function resetBrandIndex(): void {
  pending = null;
}

/**
 * Адреса иконки на самом сайте, от крупной к мелкой.
 * `apple-touch-icon` — это 180×180, а `favicon.ico` часто всего 16×16,
 * поэтому порядок именно такой.
 */
export function siteIconCandidates(domain: string): string[] {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  if (!host || !host.includes('.')) return [];
  return [
    `https://${host}/apple-touch-icon.png`,
    `https://${host}/apple-touch-icon-precomposed.png`,
    `https://${host}/favicon.svg`,
    `https://${host}/favicon.ico`,
  ];
}
