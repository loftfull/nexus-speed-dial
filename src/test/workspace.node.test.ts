import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectWorkspaceSites } from '../domain/workspace.ts';
import type { Category, HistoryEntry, Site } from '../domain/types.ts';

const sites = [
  { id:'telegram', title:'Telegram', url:'https://telegram.org', domain:'telegram.org', spaceId:'home', categoryId:'chat', favorite:false, position:30 },
  { id:'rbk', title:'РБК', url:'https://rbc.ru', domain:'rbc.ru', spaceId:'home', categoryId:'news', favorite:true, position:10 },
  { id:'youtube', title:'YouTube', url:'https://youtube.com', domain:'youtube.com', spaceId:'home', categoryId:'media', favorite:true, position:20 },
  { id:'github', title:'GitHub', url:'https://github.com', domain:'github.com', spaceId:'work', categoryId:'dev', favorite:true, position:5 },
] as Site[];

const categories = [
  { id:'social', name:'Социальные сети', spaceId:'home', icon:'users', position:10 },
  { id:'chat', name:'Общение', spaceId:'home', parentId:'social', icon:'chat', position:20 },
  { id:'news', name:'Новости', spaceId:'home', parentId:'social', icon:'news', position:30 },
  { id:'media', name:'Медиа', spaceId:'home', icon:'video', position:40 },
  { id:'dev', name:'Разработка', spaceId:'work', icon:'code', position:10 },
] as Category[];

const history: HistoryEntry[] = [
  { id:'h1', siteId:'telegram', openedAt:'2026-09-07T15:00:00.000Z' },
  { id:'h2', siteId:'rbk', openedAt:'2026-09-07T14:00:00.000Z' },
  { id:'h3', siteId:'telegram', openedAt:'2026-09-07T13:00:00.000Z' },
  { id:'h4', siteId:'github', openedAt:'2026-09-07T12:00:00.000Z' },
];

test('all mode stays inside active space and follows canonical position', () => {
  const result = selectWorkspaceSites({ sites, categories, history, spaceId:'home', categoryId:null, mode:'all' });
  assert.deepEqual(result.map(site => site.id), ['rbk','youtube','telegram']);
});

test('parent category includes its direct children while space scope remains strict', () => {
  const home = selectWorkspaceSites({ sites, categories, history, spaceId:'home', categoryId:'social', mode:'all' });
  assert.deepEqual(home.map(site => site.id), ['rbk','telegram']);
  const work = selectWorkspaceSites({ sites, categories, history, spaceId:'work', categoryId:null, mode:'all' });
  assert.deepEqual(work.map(site => site.id), ['github']);
});

test('favorites are scoped to active space/category and keep canonical order', () => {
  const result = selectWorkspaceSites({ sites, categories, history, spaceId:'home', categoryId:null, mode:'favorites' });
  assert.deepEqual(result.map(site => site.id), ['rbk','youtube']);
});

test('recent mode follows persisted history order, deduplicates and stays scoped', () => {
  const result = selectWorkspaceSites({ sites, categories, history, spaceId:'home', categoryId:null, mode:'recent' });
  assert.deepEqual(result.map(site => site.id), ['telegram','rbk']);
});

test('workspace does not mark the first tile selected without a user selection', async () => {
  const source = await readFile(new URL('../components/tiles/SpeedDialGrid.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('selected={index === 0}'), false);
  assert.equal(source.includes('selected={index===0}'), false);
});
