import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createAppStore } from '../state/appStore.ts';
import { createMemoryStorage } from './memoryStorage.ts';

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8');

test('spaces and categories persist through storage adapter', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  store.getState().addSpace({ id:'temp', name:'Temp', icon:'folder', position:3 });
  store.getState().addCategory({ id:'cat', name:'Cat', spaceId:'temp', projectId:'temp', icon:'tag', position:0 });
  const restored = createAppStore(storage).getState();
  assert.ok(restored.spaces.some(space => space.id === 'temp'));
  assert.ok(restored.categories.some(category => category.id === 'cat' && category.spaceId === 'temp'));
});

test('destructive structure changes preserve bookmarks', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addSpace({ id:'temp', name:'Temp', icon:'folder', position:3 });
  store.getState().addCategory({ id:'parent', name:'Parent', spaceId:'temp', projectId:'temp', icon:'tag', position:0 });
  store.getState().addCategory({ id:'child', name:'Child', spaceId:'temp', projectId:'temp', parentId:'parent', icon:'tag', position:1 });
  store.getState().addSite({ id:'x', title:'X', url:'https://x.test', domain:'x.test', spaceId:'temp', projectId:'temp', categoryId:'child', favorite:false, position:0 });
  store.getState().removeSpace('home');
  assert.ok(store.getState().spaces.some(space => space.id === 'home'));
  store.getState().removeCategory('parent');
  assert.equal(store.getState().sites.find(site => site.id === 'x')?.categoryId, undefined);
  store.getState().removeSpace('temp');
  const moved = store.getState().sites.find(site => site.id === 'x');
  assert.equal(moved?.spaceId, 'home');
  assert.equal(moved?.projectId, 'home');
});

test('moving root category moves child categories and sites between spaces', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addSpace({ id:'p2', name:'P2', icon:'folder', position:3 });
  store.getState().addCategory({ id:'parent2', name:'Parent2', spaceId:'home', projectId:'home', icon:'tag', position:0 });
  store.getState().addCategory({ id:'child2', name:'Child2', spaceId:'home', projectId:'home', parentId:'parent2', icon:'tag', position:1 });
  store.getState().addSite({ id:'site2', title:'Site2', url:'https://site2.test', domain:'site2.test', spaceId:'home', projectId:'home', categoryId:'child2', favorite:false, position:0 });
  store.getState().updateCategory('parent2', { spaceId:'p2', projectId:'p2' });
  assert.equal(store.getState().categories.find(category => category.id === 'child2')?.spaceId, 'p2');
  assert.equal(store.getState().sites.find(site => site.id === 'site2')?.spaceId, 'p2');
});

test('root category with children cannot become a child and create a third level', () => {
  const store = createAppStore(createMemoryStorage());
  store.getState().addCategory({ id:'root-a', name:'Root A', spaceId:'home', projectId:'home', icon:'tag', position:0 });
  store.getState().addCategory({ id:'root-b', name:'Root B', spaceId:'home', projectId:'home', icon:'tag', position:1 });
  store.getState().addCategory({ id:'child-a', name:'Child A', spaceId:'home', projectId:'home', parentId:'root-a', icon:'tag', position:2 });
  store.getState().updateCategory('root-a', { parentId:'root-b' });
  assert.equal(store.getState().categories.find(category => category.id === 'root-a')?.parentId, undefined);
  assert.equal(store.getState().categories.find(category => category.id === 'child-a')?.parentId, 'root-a');
});

test('desktop and mobile navigation share one structure editor and no seed navigation', async () => {
  const [sidebar, mobile, editor, css, app] = await Promise.all([
    read('src/components/sidebar/Sidebar.tsx'),
    read('src/components/sidebar/MobileNavigation.tsx'),
    read('src/components/structure/StructureEditor.tsx'),
    read('src/components/structure/StructureEditor.module.css'),
    read('src/App.tsx'),
  ]);
  for (const source of [sidebar, mobile]) {
    assert.equal(source.includes('seedProjects'), false);
    assert.equal(source.includes('seedCategories'), false);
    assert.ok(source.includes('setStructureEditor'));
    assert.ok(source.includes('activeSpaceId'));
  }
  assert.ok(editor.includes('parentId'));
  assert.ok(editor.includes('removeSpace'));
  assert.ok(editor.includes('removeCategory'));
  assert.ok(editor.includes('Пространство'));
  assert.match(css, /position\s*:\s*fixed/);
  assert.ok(app.includes('<StructureEditor'));
});
