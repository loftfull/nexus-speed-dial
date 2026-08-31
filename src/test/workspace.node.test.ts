import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkspaceSites } from '../domain/workspace.ts';
import type { Category, HistoryEntry, Site } from '../domain/types.ts';

const sites: Site[] = [
  { id:'telegram', title:'Telegram', url:'https://telegram.org', domain:'telegram.org', projectId:'home', categoryId:'chat', favorite:false },
  { id:'rbk', title:'РБК', url:'https://rbc.ru', domain:'rbc.ru', projectId:'home', categoryId:'news', favorite:true },
  { id:'github', title:'GitHub', url:'https://github.com', domain:'github.com', projectId:'work', categoryId:'dev', favorite:true },
];
const categories: Category[] = [
  { id:'social', name:'Социальные сети', projectId:'home', icon:'users' },
  { id:'chat', name:'Общение', projectId:'home', parentId:'social', icon:'chat' },
  { id:'news', name:'Новости', projectId:'home', parentId:'social', icon:'news' },
  { id:'dev', name:'Разработка', projectId:'work', icon:'code' },
];
const history: HistoryEntry[] = [
  { id:'h1', siteId:'rbk', openedAt:'2026-08-31T15:00:00.000Z' },
  { id:'h2', siteId:'telegram', openedAt:'2026-08-31T14:00:00.000Z' },
  { id:'h3', siteId:'rbk', openedAt:'2026-08-31T13:00:00.000Z' },
];

test('recent workspace follows persisted history order and deduplicates sites', () => {
  const result = selectWorkspaceSites({ sites, categories, history, projectId:'home', categoryId:null, tab:'recent', query:'' });
  assert.deepEqual(result.map(site => site.id), ['rbk','telegram']);
});

test('parent category includes its direct children while project scope remains strict', () => {
  const home = selectWorkspaceSites({ sites, categories, history, projectId:'home', categoryId:'social', tab:'quick', query:'' });
  assert.deepEqual(home.map(site => site.id), ['telegram','rbk']);
  const work = selectWorkspaceSites({ sites, categories, history, projectId:'work', categoryId:null, tab:'quick', query:'' });
  assert.deepEqual(work.map(site => site.id), ['github']);
});

test('favorites and search compose with project/category filters', () => {
  const result = selectWorkspaceSites({ sites, categories, history, projectId:'home', categoryId:'social', tab:'favorites', query:'рб' });
  assert.deepEqual(result.map(site => site.id), ['rbk']);
});
