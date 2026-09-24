/**
 * Порядок сайтов в сетке.
 *
 * Сортировка вынесена отдельно, потому что у неё есть что проверять: как
 * себя ведут сайты без времени открытия, как сравниваются русские названия
 * и не пляшет ли порядок у равных.
 */

import type { SiteRecord } from './types';

export type SortKey = 'name' | 'recent' | 'added';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

/**
 * Возвращает новый массив: исходный не трогаем, иначе сортировка чинила бы
 * порядок в хранилище как побочный эффект отрисовки.
 *
 * Сайты, которые ещё ни разу не открывали, уходят в конец при сортировке по
 * последнему открытию — иначе они оказались бы «самыми давними» и вытеснили
 * бы наверх то, чем как раз не пользуются.
 */
export function sortSites(sites: SiteRecord[], key: SortKey): SiteRecord[] {
  const list = [...sites];
  if (key === 'name') {
    return list.sort((a, b) => collator.compare(a.title, b.title));
  }
  if (key === 'recent') {
    return list.sort((a, b) => {
      const left = a.lastOpened ?? 0;
      const right = b.lastOpened ?? 0;
      if (left === right) return collator.compare(a.title, b.title);
      return right - left;
    });
  }
  // 'added' — порядок хранилища: новые записи дописываются в начало.
  return list;
}
