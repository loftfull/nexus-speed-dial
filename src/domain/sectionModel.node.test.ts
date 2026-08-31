import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionPresentation, seedDownloads, seedNotes } from './sectionModel.ts';

test('top-level sections expose stable Russian presentation metadata', () => {
  assert.equal(getSectionPresentation('favorites').title, 'Избранное');
  assert.equal(getSectionPresentation('downloads').title, 'Загрузки');
  assert.equal(getSectionPresentation('notes').title, 'Заметки');
});

test('downloads and notes have useful first-launch content instead of empty demo shells', () => {
  assert.ok(seedDownloads.some(item => item.status === 'active'));
  assert.ok(seedDownloads.some(item => item.status === 'completed'));
  assert.ok(seedNotes.length >= 3);
});
