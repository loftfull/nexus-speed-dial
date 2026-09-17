import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from './backup';

describe('backup envelope', () => {
  it('creates and parses a versioned full backup', () => {
    const text = createBackup({ sites: [{ title: 'A' }], projects: [], sessions: [] }, '2026-09-17T00:00:00.000Z');
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
});
