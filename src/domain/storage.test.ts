import { describe, expect, it } from 'vitest';
import { getStorageUsage, readStorage, writeStorage, type StorageAdapter } from './storage';

function memoryStorage(): StorageAdapter {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), key: index => Array.from(data.keys())[index] ?? null };
}

describe('storage adapter', () => {
  it('persists and reads JSON through an injected adapter', () => {
    const storage = memoryStorage();
    writeStorage('sites', [{ title: 'Figma' }], storage);
    expect(readStorage('sites', [], storage)).toEqual([{ title: 'Figma' }]);
  });
  it('returns fallback for malformed data', () => {
    const storage = memoryStorage();
    storage.setItem('broken', '{bad');
    expect(readStorage('broken', ['fallback'], storage)).toEqual(['fallback']);
  });
  it('reports local storage usage from the injected adapter', () => {
    const storage = memoryStorage();
    storage.setItem('sites', '1234567890');
    expect(getStorageUsage(storage, 100).percent).toBe(15);
  });
});
