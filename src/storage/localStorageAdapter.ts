import type { BrowserStorageLike, StorageAdapter } from './StorageAdapter.ts';

export function createLocalStorageAdapter(storage: BrowserStorageLike): StorageAdapter {
  return {
    get<T>(key: string, fallback: T): T {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    },
    set<T>(key: string, value: T): void { storage.setItem(key, JSON.stringify(value)); },
    remove(key: string): void { storage.removeItem(key); },
  };
}
