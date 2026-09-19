/**
 * Перемещение фокуса по сетке плиток.
 *
 * Сетка выложена потоком (`grid-auto-flow: row`), поэтому список плиток —
 * линейный, а строка определяется числом колонок. Влево-вправо ходят по
 * списку и потому переходят на соседнюю строку на её краях; вверх-вниз
 * шагают ровно на строку.
 */
export const GRID_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'] as const;
export type GridKey = typeof GRID_KEYS[number];

export const isGridKey = (key: string): key is GridKey => (GRID_KEYS as readonly string[]).includes(key);

/**
 * Куда уйдёт фокус. `null` — клавиша не про сетку либо двигаться некуда
 * (например, вверх из первой строки): тогда фокус остаётся на месте.
 */
export function nextGridIndex(key: string, current: number, total: number, columns: number): number | null {
  if (!isGridKey(key) || total <= 0) return null;
  const last = total - 1;
  const step = Math.max(1, Math.round(columns) || 1);
  const index = Math.min(Math.max(current, 0), last);

  const stay = (target: number) => (target === index ? null : target);

  switch (key) {
    case 'ArrowRight': return index < last ? index + 1 : null;
    case 'ArrowLeft': return index > 0 ? index - 1 : null;
    case 'ArrowUp': {
      const target = index - step;
      return target >= 0 ? target : null;
    }
    case 'ArrowDown': {
      const target = index + step;
      if (target <= last) return target;
      // Последняя строка неполная: опускаемся на последнюю плитку, но только
      // если она и правда ниже текущей, иначе фокус стоял бы на месте.
      return Math.floor(last / step) > Math.floor(index / step) ? last : null;
    }
    case 'Home': return stay(0);
    default: return stay(last);
  }
}

/**
 * Сколько плиток стоит в первой строке. Считается по фактической вёрстке,
 * а не по настройке: раскладки «строка» и «иконки» дают своё число колонок,
 * и на узком экране оно тоже другое.
 */
export function columnsFromTops(tops: number[]): number {
  if (!tops.length) return 1;
  const first = Math.round(tops[0]);
  const inRow = tops.filter(top => Math.round(top) === first).length;
  return Math.max(1, inRow);
}
