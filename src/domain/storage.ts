export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const browserStorage: StorageAdapter = {
  getItem: key => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: (key, value) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
  removeItem: key => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
};

export function readStorage<T>(key: string, fallback: T, storage: StorageAdapter = browserStorage): T {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T, storage: StorageAdapter = browserStorage): void {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* keep the app usable when storage is unavailable */ }
}
