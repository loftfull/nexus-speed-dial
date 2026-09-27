export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key?(index: number): string | null;
}

export const browserStorage: StorageAdapter = {
  getItem: key => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: (key, value) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
  removeItem: key => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
  key: index => typeof window === 'undefined' ? null : window.localStorage.key(index),
};

export function readStorage<T>(key: string, fallback: T, storage: StorageAdapter = browserStorage): T {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Префикс резервных копий значений, которые не удалось прочитать. */
export const RECOVERY_PREFIX = 'nexus-recovery:';

export type RecoveryCopy = { key: string; source: string; savedAt: number; raw: string };

/**
 * Откладывает в сторону значения, которые не разбираются как JSON.
 *
 * Без этого повреждённая запись молча заменялась значением по умолчанию, и
 * первое же сохранение затирало исходную строку: данные пропадали без следа,
 * а пользователь видел демонстрационный набор вместо своих сайтов. Копия
 * пишется под отдельным ключом до того, как состояние будет прочитано, и
 * остаётся, пока её не скачают или не удалят вручную.
 *
 * Если места не хватает даже на копию, сделать уже ничего нельзя — функция
 * не бросает, а просто не включает такой ключ в ответ.
 */
export function preserveUnreadable(keys: readonly string[], storage: StorageAdapter = browserStorage, now = Date.now()): string[] {
  const preserved: string[] = [];
  for (const key of keys) {
    let raw: string | null;
    try { raw = storage.getItem(key); } catch { continue; }
    if (raw === null) continue;
    try { JSON.parse(raw); continue; } catch { /* нечитаемое значение — сохраняем ниже */ }
    // Та же строка уже отложена (например, при повторной инициализации в
    // StrictMode или при перезагрузке до того, как копию разобрали).
    if (listRecoveryCopies(storage).some(copy => copy.source === key && copy.raw === raw)) { preserved.push(key); continue; }
    try {
      storage.setItem(`${RECOVERY_PREFIX}${key}:${now}`, raw);
      preserved.push(key);
    } catch { /* места нет даже на копию */ }
  }
  return preserved;
}

/** Все отложенные копии, новые сверху. */
export function listRecoveryCopies(storage: StorageAdapter = browserStorage): RecoveryCopy[] {
  const copies: RecoveryCopy[] = [];
  try {
    for (let index = 0; index < 1000; index += 1) {
      const key = storage.key?.(index);
      if (key === null || key === undefined) break;
      if (!key.startsWith(RECOVERY_PREFIX)) continue;
      const rest = key.slice(RECOVERY_PREFIX.length);
      const split = rest.lastIndexOf(':');
      const savedAt = Number(rest.slice(split + 1));
      if (split <= 0 || !Number.isFinite(savedAt)) continue;
      copies.push({ key, source: rest.slice(0, split), savedAt, raw: storage.getItem(key) ?? '' });
    }
  } catch { return []; }
  return copies.sort((a, b) => b.savedAt - a.savedAt);
}

/** Returns false when the value could not be stored, e.g. the quota is full. */
export function writeStorage<T>(key: string, value: T, storage: StorageAdapter = browserStorage): boolean {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; /* keep the app usable when storage is unavailable */ }
}

export function getStorageUsage(storage: StorageAdapter = browserStorage, limitBytes = 5 * 1024 * 1024) {
  let bytes = 0;
  try {
    for (let index = 0; index < 1000; index += 1) {
      const key = (storage as Storage).key?.(index);
      if (key === null || key === undefined) break;
      bytes += key.length + (storage.getItem(key)?.length ?? 0);
    }
  } catch { return { bytes: 0, percent: 0, label: 'Недоступно' }; }
  const exact = (bytes / limitBytes) * 100;
  // Occupied but under a per cent still has to read as used space, not as zero.
  const percent = Math.min(100, exact > 0 && exact < 1 ? 1 : Math.round(exact));
  const kilobytes = Math.max(1, Math.round(bytes / 1024));
  // Делить надо дважды: limitBytes / 1024 — это килобайты, и подпись «МБ»
  // превращала пятимегабайтный потолок в пятигигабайтный.
  const megabytes = Math.round(limitBytes / 1024 / 1024);
  return { bytes, percent, label: `${kilobytes} КБ из ${megabytes} МБ` };
}
