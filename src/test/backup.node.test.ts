import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, parseBackup } from '../domain/backup.ts';
import { getTilePreset } from '../domain/tilePresets.ts';

const snapshot = {
  preferences: {
    theme:'dark', density:'compact', background:'clean', glassStrength:'strong', searchEngine:'yandex', globalSiteSearch:true, omniboxSuggestions:false,
  } as const,
  tileSettings: getTilePreset('standard'),
  projects: [{ id:'home', name:'Дом', icon:'home' }],
  categories: [],
  sites: [{ id:'github', title:'GitHub', url:'https://github.com', domain:'github.com', projectId:'home', favorite:true }],
  history: [{ id:'v1', siteId:'github', openedAt:'2026-08-31T12:00:00.000Z' }],
  notes: [{ id:'n1', title:'План', body:'Текст', projectId:'home', createdAt:'2026-08-31T12:00:00.000Z', updatedAt:'2026-08-31T12:00:00.000Z' }],
  weatherLocation: { mode:'city', city:'Минск' },
};

test('backup round trips Nexus data and user preferences with explicit schema version', () => {
  const text = createBackup(snapshot, '2026-08-31T12:30:00.000Z');
  const raw = JSON.parse(text);
  assert.equal(raw.schema, 'nexus-speed-dial');
  assert.equal(raw.version, 1);
  assert.equal(raw.exportedAt, '2026-08-31T12:30:00.000Z');
  const parsed = parseBackup(text);
  assert.equal(parsed.sites[0].id, 'github');
  assert.equal(parsed.notes[0].title, 'План');
  assert.equal(parsed.preferences?.theme, 'dark');
  assert.equal(parsed.preferences?.searchEngine, 'yandex');
});

test('legacy v1 backup without preferences remains importable', () => {
  const legacy = JSON.stringify({ schema:'nexus-speed-dial', version:1, exportedAt:'2026-08-31T12:00:00Z', data:{ ...snapshot, preferences:undefined } });
  const parsed = parseBackup(legacy);
  assert.equal(parsed.preferences, undefined);
  assert.equal(parsed.projects[0].id, 'home');
});

test('backup rejects malformed and foreign payloads', () => {
  assert.throws(() => parseBackup('{bad json'), /BACKUP_JSON/);
  assert.throws(() => parseBackup('{"schema":"other","version":1,"data":{}}'), /BACKUP_SCHEMA/);
});

test('backup repairs required home project and removes invalid references', () => {
  const text = JSON.stringify({ schema:'nexus-speed-dial', version:1, exportedAt:'2026-08-31T12:00:00Z', data:{
    ...snapshot,
    projects:[],
    categories:[{ id:'orphan', name:'Лишняя', projectId:'missing', icon:'x' }],
    sites:[{ ...snapshot.sites[0], projectId:'missing' }],
    notes:[{ ...snapshot.notes[0], projectId:'missing' }],
  }});
  const parsed = parseBackup(text);
  assert.equal(parsed.projects[0].id, 'home');
  assert.equal(parsed.categories.length, 0);
  assert.equal(parsed.sites.length, 0);
  assert.equal(parsed.history.length, 0);
  assert.equal(parsed.notes[0].projectId, 'home');
});

test('backup removes imported sites with unsafe URL schemes', () => {
  const text = JSON.stringify({ schema:'nexus-speed-dial', version:1, exportedAt:'2026-08-31T12:00:00Z', data:{
    ...snapshot,
    sites:[{ ...snapshot.sites[0], id:'unsafe', url:'javascript:alert(1)', domain:'unsafe.local' }],
    history:[{ id:'unsafe-history', siteId:'unsafe', openedAt:'2026-08-31T12:00:00.000Z' }],
  }});
  const parsed = parseBackup(text);
  assert.equal(parsed.sites.length, 0);
  assert.equal(parsed.history.length, 0);
});

test('backup deduplicates entity ids and keeps the first valid occurrence', () => {
  const text = JSON.stringify({ schema:'nexus-speed-dial', version:1, exportedAt:'2026-08-31T12:00:00Z', data:{
    ...snapshot,
    projects:[
      { id:'home', name:'Дом', icon:'home' },
      { id:'work', name:'Работа', icon:'briefcase' },
      { id:'work', name:'Дубликат', icon:'x' },
    ],
    sites:[
      { id:'same', title:'One', url:'https://one.example', domain:'one.example', projectId:'home', favorite:false },
      { id:'same', title:'Two', url:'https://two.example', domain:'two.example', projectId:'home', favorite:false },
    ],
    history:[],
  }});
  const parsed = parseBackup(text);
  assert.equal(parsed.projects.filter(project => project.id === 'work').length, 1);
  assert.equal(parsed.projects.find(project => project.id === 'work')?.name, 'Работа');
  assert.equal(parsed.sites.filter(site => site.id === 'same').length, 1);
  assert.equal(parsed.sites[0].title, 'One');
});
