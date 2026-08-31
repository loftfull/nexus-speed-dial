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

test('navigation actions change only their intended state', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().setSection('favorites');
  store.getState().setActiveProject('work');
  assert.equal(store.getState().section, 'favorites');
  assert.equal(store.getState().activeProjectId, 'work');
  assert.equal(store.getState().workspaceTab, 'quick');
});

test('mobile navigation drawer can be opened and closed without changing the current section', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  const before = store.getState().section;
  store.getState().setMobileNavOpen(true);
  assert.equal(store.getState().mobileNavOpen, true);
  assert.equal(store.getState().section, before);
  store.getState().setMobileNavOpen(false);
  assert.equal(store.getState().mobileNavOpen, false);
});
