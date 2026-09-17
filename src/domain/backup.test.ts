import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from './backup';

describe('backup envelope', () => {
  it('creates and parses a versioned full backup', () => {
    const text = createBackup({ sites: [{ title: 'A' }], projects: [], categories: [], groups: [], sessions: [] }, '2026-09-17T00:00:00.000Z');
    expect(JSON.parse(text)).toMatchObject({ schema: 'nexus-speed-dial', version: 1 });
    expect(parseBackup(text).sites).toHaveLength(1);
  });

  it('keeps compatibility with the previous flat backup format', () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, sites: [{ title: 'A' }] }));
    expect(parsed.projects).toEqual([]);
    expect(parsed.sessions).toEqual([]);
  });

  it('rejects malformed backup payloads', () => {
    expect(() => parseBackup('{bad')).toThrow('BACKUP_JSON');
    expect(() => parseBackup('{"version":1}')).toThrow('BACKUP_SCHEMA');
  });

  it('round-trips the Project → Category → Group tree', () => {
    const categories = [{ id: 'c-1', name: 'Соцсети', projectId: 'p-1' }];
    const groups = [{ id: 'g-1', name: 'Видео', categoryId: 'c-1' }];
    const text = createBackup({ sites: [], projects: [{ id: 'p-1' }], categories, groups, sessions: [] });
    const parsed = parseBackup(text);
    expect(parsed.categories).toEqual(categories);
    expect(parsed.groups).toEqual(groups);
  });

  it('treats a backup written before the hierarchy existed as empty, not broken', () => {
    const legacy = JSON.stringify({ sites: [{ title: 'A' }], projects: [], sessions: [] });
    const parsed = parseBackup(legacy);
    expect(parsed.categories).toEqual([]);
    expect(parsed.groups).toEqual([]);
    expect(parsed.sites).toHaveLength(1);
  });
});
