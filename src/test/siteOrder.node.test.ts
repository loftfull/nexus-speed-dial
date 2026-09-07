import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderVisibleSites } from '../domain/siteOrder.ts';
import type { Site } from '../domain/types.ts';

const site = (id: string, position: number): Site => ({ id, title:id, url:`https://${id}.example`, domain:`${id}.example`, projectId:'home', spaceId:'home', favorite:false, position });

test('reorders all sites into one canonical space order', () => {
  const result = reorderVisibleSites([site('a',0), site('b',1), site('c',2)], ['a','b','c'], 'c', 'a');
  assert.deepEqual(result.map(item => item.id), ['c','a','b']);
  assert.deepEqual(result.map(item => item.position), [0,1,2]);
});

test('category reorder changes only visible slots and preserves hidden relative order', () => {
  const all = [site('a',0), site('hidden',1), site('b',2), site('c',3)];
  const result = reorderVisibleSites(all, ['a','b','c'], 'c', 'a');
  assert.deepEqual(result.map(item => item.id), ['c','hidden','a','b']);
  assert.deepEqual(result.map(item => item.position), [0,1,2,3]);
});

test('invalid drag leaves canonical order unchanged', () => {
  const all = [site('a',0), site('b',1)];
  assert.deepEqual(reorderVisibleSites(all, ['a','b'], 'missing', 'a').map(item => item.id), ['a','b']);
});
