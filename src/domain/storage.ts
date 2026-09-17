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
  const percent = Math.min(100, Math.round((bytes / limitBytes) * 100));
  const kilobytes = Math.max(1, Math.round(bytes / 1024));
  return { bytes, percent, label: `${kilobytes} КБ из ${Math.round(limitBytes / 1024)} МБ` };
}
