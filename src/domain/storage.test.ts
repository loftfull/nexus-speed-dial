import { describe, expect, it } from 'vitest';
import { getStorageUsage, listRecoveryCopies, preserveUnreadable, readStorage, writeStorage, type StorageAdapter } from './storage';

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

  it('подписывает потолок в мегабайтах, а не в килобайтах под видом мегабайт', () => {
    const storage = memoryStorage();
    storage.setItem('a', 'x'.repeat(1024));
    // Пять мегабайт — это 5 МБ, а не 5120: делить надо дважды.
    expect(getStorageUsage(storage).label).toMatch(/из 5 МБ$/);
    expect(getStorageUsage(storage, 10 * 1024 * 1024).label).toMatch(/из 10 МБ$/);
  });

  it('откладывает нечитаемое значение в копию и не трогает читаемые', () => {
    const storage = memoryStorage();
    storage.setItem('nexus-sites', '[{"title":"Мой сайт", broken');
    storage.setItem('nexus-ui', '{"sidebar":true}');
    expect(preserveUnreadable(['nexus-sites', 'nexus-ui', 'nexus-absent'], storage, 1000)).toEqual(['nexus-sites']);
    expect(listRecoveryCopies(storage)).toEqual([
      { key: 'nexus-recovery:nexus-sites:1000', source: 'nexus-sites', savedAt: 1000, raw: '[{"title":"Мой сайт", broken' },
    ]);
  });

  it('не плодит одинаковые копии одной и той же строки', () => {
    const storage = memoryStorage();
    storage.setItem('nexus-sites', '{bad');
    preserveUnreadable(['nexus-sites'], storage, 1);
    preserveUnreadable(['nexus-sites'], storage, 2);
    expect(listRecoveryCopies(storage)).toHaveLength(1);
  });

  it('не бросает, когда места нет даже на копию', () => {
    const storage = memoryStorage();
    storage.setItem('nexus-sites', '{bad');
    const full: StorageAdapter = { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(preserveUnreadable(['nexus-sites'], full)).toEqual([]);
  });
});
