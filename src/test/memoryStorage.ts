import type { StorageAdapter } from '../storage/StorageAdapter.ts';

export function createMemoryStorage(): StorageAdapter {
  const values = new Map<string, unknown>();
  return {
    get<T>(key: string, fallback: T): T { return values.has(key) ? values.get(key) as T : fallback; },
    set<T>(key: string, value: T): void { values.set(key, value); },
    remove(key: string): void { values.delete(key); },
  };
}
