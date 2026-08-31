import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getSectionPresentation } from './sectionModel.ts';

test('top-level sections expose stable Russian presentation metadata', () => {
  assert.equal(getSectionPresentation('favorites').title, 'Избранное');
  assert.equal(getSectionPresentation('downloads').title, 'Загрузки');
  assert.equal(getSectionPresentation('notes').title, 'Заметки');
});

test('section metadata module contains no demo user data', async () => {
  const source = await readFile(new URL('./sectionModel.ts', import.meta.url), 'utf8');
  for (const forbidden of ['seedDownloads', 'seedNotes', 'seedRecent']) {
    assert.equal(source.includes(forbidden), false, `demo export must not return: ${forbidden}`);
  }
});
