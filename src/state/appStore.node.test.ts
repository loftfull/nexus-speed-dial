import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppStore } from './appStore.ts';
import { createMemoryStorage } from '../test/memoryStorage.ts';

test('setTileSetting preserves unrelated appearance settings and persists', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  const beforeIcon = store.getState().tileSettings.iconSize;
  store.getState().setTileSetting('radius', 24);
  assert.equal(store.getState().tileSettings.radius, 24);
  assert.equal(store.getState().tileSettings.iconSize, beforeIcon);
  assert.equal(storage.get('nexus.tileSettings', null)?.radius, 24);
});

test('applyTilePreset updates the complete canonical preset', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().applyTilePreset('minimal');
  assert.equal(store.getState().tileSettings.preset, 'minimal');
  assert.equal(store.getState().tileSettings.showSubtitle, false);
  assert.ok(store.getState().tileSettings.height < 150);
});

test('canonical navigation uses space, category, content mode and layout only', () => {
  const store = createAppStore(createMemoryStorage());
  assert.equal(store.getState().activeSpaceId, 'home');
  assert.equal(store.getState().activeCategoryId, null);
  assert.equal(store.getState().contentMode, 'all');
  assert.equal(store.getState().layoutMode, 'grid');

  store.getState().setContentMode('favorites');
  store.getState().setLayoutMode('list');
  store.getState().setActiveSpace('work');

  assert.equal(store.getState().contentMode, 'favorites');
  assert.equal(store.getState().layoutMode, 'list');
  assert.equal(store.getState().activeSpaceId, 'work');
  assert.equal(store.getState().activeCategoryId, null);
});

test('legacy projects, categories and sites migrate to spaces without data loss', () => {
  const storage = createMemoryStorage();
  storage.set('nexus.projects', [
    { id:'home', name:'Дом', icon:'home' },
    { id:'work', name:'Работа', icon:'briefcase' },
  ]);
  storage.set('nexus.categories', [
    { id:'dev', name:'Разработка', projectId:'work', icon:'code' },
  ]);
  storage.set('nexus.sites', [
    { id:'github', title:'GitHub', url:'https://github.com', domain:'github.com', projectId:'work', categoryId:'dev', favorite:true },
    { id:'mail', title:'Почта', url:'https://mail.example.com', domain:'mail.example.com', projectId:'home', favorite:false },
  ]);

  const state = createAppStore(storage).getState();
  assert.deepEqual(state.spaces.map(space => [space.id, space.position]), [['home',0],['work',1]]);
  assert.equal(state.categories.find(category => category.id === 'dev')?.spaceId, 'work');
  assert.equal(state.sites.find(site => site.id === 'github')?.spaceId, 'work');
  assert.deepEqual(state.sites.map(site => site.position), [0,1]);
  assert.equal(state.sites.length, 2);
});

test('user preferences persist independently from low-level tile settings', () => {
  const storage = createMemoryStorage();
  const first = createAppStore(storage);
  first.getState().setPreference('theme', 'dark');
  first.getState().setPreference('searchEngine', 'yandex');
  first.getState().setPreference('omniboxSuggestions', false);

  const restored = createAppStore(storage).getState();
  assert.equal(restored.preferences.theme, 'dark');
  assert.equal(restored.preferences.searchEngine, 'yandex');
  assert.equal(restored.preferences.omniboxSuggestions, false);
  assert.equal(restored.tileSettings.preset, 'standard');
});

test('mobile navigation drawer toggles without changing content mode', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().setContentMode('recent');
  store.getState().setMobileNavOpen(true);
  assert.equal(store.getState().mobileNavOpen, true);
  assert.equal(store.getState().contentMode, 'recent');
  store.getState().setMobileNavOpen(false);
  assert.equal(store.getState().mobileNavOpen, false);
});
