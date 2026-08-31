import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createAppStore } from '../state/appStore.ts';
import { createMemoryStorage } from './memoryStorage.ts';

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8');

test('projects and categories persist through storage adapter', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  store.getState().addProject({ id: 'temp', name: 'Temp', icon: 'folder' });
  store.getState().addCategory({ id: 'cat', name: 'Cat', projectId: 'temp', icon: 'tag' });
  const restored = createAppStore(storage).getState();
  assert.ok(restored.projects.some(project => project.id === 'temp'));
  assert.ok(restored.categories.some(category => category.id === 'cat'));
});

test('destructive structure changes preserve bookmarks', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addProject({ id: 'temp', name: 'Temp', icon: 'folder' });
  store.getState().addCategory({ id: 'parent', name: 'Parent', projectId: 'temp', icon: 'tag' });
  store.getState().addCategory({ id: 'child', name: 'Child', projectId: 'temp', parentId: 'parent', icon: 'tag' });
  store.getState().addSite({ id: 'x', title: 'X', url: 'https://x.test', domain: 'x.test', projectId: 'temp', categoryId: 'child', favorite: false });
  store.getState().removeProject('home');
  assert.ok(store.getState().projects.some(project => project.id === 'home'));
  store.getState().removeCategory('parent');
  assert.equal(store.getState().sites.find(site => site.id === 'x')?.categoryId, undefined);
  store.getState().removeProject('temp');
  assert.equal(store.getState().sites.find(site => site.id === 'x')?.projectId, 'home');
});

test('moving root category moves child categories and sites', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addProject({ id: 'p2', name: 'P2', icon: 'folder' });
  store.getState().addCategory({ id: 'parent2', name: 'Parent2', projectId: 'home', icon: 'tag' });
  store.getState().addCategory({ id: 'child2', name: 'Child2', projectId: 'home', parentId: 'parent2', icon: 'tag' });
  store.getState().addSite({ id: 'site2', title: 'Site2', url: 'https://site2.test', domain: 'site2.test', projectId: 'home', categoryId: 'child2', favorite: false });
  store.getState().updateCategory('parent2', { projectId: 'p2' });
  assert.equal(store.getState().categories.find(category => category.id === 'child2')?.projectId, 'p2');
  assert.equal(store.getState().sites.find(site => site.id === 'site2')?.projectId, 'p2');
});

test('root category with children cannot become a child and create a third level', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addCategory({ id: 'root-a', name: 'Root A', projectId: 'home', icon: 'tag' });
  store.getState().addCategory({ id: 'root-b', name: 'Root B', projectId: 'home', icon: 'tag' });
  store.getState().addCategory({ id: 'child-a', name: 'Child A', projectId: 'home', parentId: 'root-a', icon: 'tag' });
  store.getState().updateCategory('root-a', { parentId: 'root-b' });
  assert.equal(store.getState().categories.find(category => category.id === 'root-a')?.parentId, undefined);
  assert.equal(store.getState().categories.find(category => category.id === 'child-a')?.parentId, 'root-a');
});

test('navigation uses persistent structure and one fixed editor', async () => {
  const [sidebar, mobile, editor, css, app] = await Promise.all([
    read('src/components/sidebar/Sidebar.tsx'),
    read('src/components/sidebar/MobileNavigation.tsx'),
    read('src/components/structure/StructureEditor.tsx'),
    read('src/components/structure/StructureEditor.module.css'),
    read('src/App.tsx'),
  ]);
  for (const source of [sidebar, mobile]) {
    assert.ok(!source.includes('seedProjects'));
    assert.ok(!source.includes('seedCategories'));
    assert.ok(source.includes('setStructureEditor'));
  }
  assert.ok(editor.includes('parentId'));
  assert.ok(editor.includes('removeProject'));
  assert.ok(editor.includes('removeCategory'));
  assert.match(css, /position\s*:\s*fixed/);
  assert.ok(app.includes('<StructureEditor'));
});
