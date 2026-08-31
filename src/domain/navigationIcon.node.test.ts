import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationIconKey } from './navigationIcon.ts';

test('navigation icon resolver understands Russian and English project labels', () => {
  assert.equal(navigationIconKey('Дом'), 'home');
  assert.equal(navigationIconKey('Работа'), 'work');
  assert.equal(navigationIconKey('Project Alpha'), 'project');
});

test('navigation icon resolver maps common category names to meaningful keys', () => {
  assert.equal(navigationIconKey('Социальные сети'), 'social');
  assert.equal(navigationIconKey('Финансы'), 'finance');
  assert.equal(navigationIconKey('Покупки'), 'shopping');
  assert.equal(navigationIconKey('Инструменты'), 'tools');
  assert.equal(navigationIconKey('Сервисы'), 'services');
  assert.equal(navigationIconKey('Развлечения'), 'entertainment');
});

test('navigation icon resolver falls back to a neutral tag key', () => {
  assert.equal(navigationIconKey('Новая категория'), 'tag');
});
