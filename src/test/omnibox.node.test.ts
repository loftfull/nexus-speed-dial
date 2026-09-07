import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOmnibox, suggestSites } from '../domain/omnibox.ts';
import type { Site } from '../domain/types.ts';

const sites: Site[] = [
  { id:'github', title:'GitHub', domain:'github.com', url:'https://github.com', subtitle:'Разработка', projectId:'home', spaceId:'home', favorite:true },
  { id:'youtube', title:'YouTube', domain:'youtube.com', url:'https://youtube.com', subtitle:'Видео', projectId:'home', spaceId:'home', favorite:false },
];

test('exact saved site wins', () => {
  const result = resolveOmnibox('github', sites);
  assert.equal(result.kind, 'site');
  if (result.kind === 'site') assert.equal(result.site.id, 'github');
});

test('bare domain becomes https url', () => {
  assert.deepEqual(resolveOmnibox('openai.com', sites), { kind:'url', url:'https://openai.com/' });
});

test('plain query uses configured web search engine', () => {
  const google = resolveOmnibox('glass design', sites, 'google');
  const yandex = resolveOmnibox('glass design', sites, 'yandex');
  const duck = resolveOmnibox('glass design', sites, 'duckduckgo');
  assert.equal(google.kind, 'search');
  assert.equal(yandex.kind, 'search');
  assert.equal(duck.kind, 'search');
  if (google.kind === 'search') assert.match(google.url, /google\.com\/search/);
  if (yandex.kind === 'search') assert.match(yandex.url, /yandex\.ru\/search/);
  if (duck.kind === 'search') assert.match(duck.url, /duckduckgo\.com/);
});

test('suggestions match metadata', () => {
  assert.deepEqual(suggestSites('разраб', sites).map(item => item.id), ['github']);
});
