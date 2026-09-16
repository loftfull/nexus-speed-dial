import { describe, expect, it } from 'vitest';
import { appReducer, createInitialAppState } from './appStore';

describe('app store reducer', () => {
  const initial = createInitialAppState([{ title: 'Figma', desc: '', domain: 'figma.com', color: '#f00', icon: 'F', category: 'Проект' }]);
  it('updates collections through functional actions', () => {
    const next = appReducer(initial, { type: 'sites/set', value: sites => [...sites, { title: 'Notion', desc: '', domain: 'notion.so', color: '#111', icon: 'N', category: 'Работа' }] });
    expect(next.sites).toHaveLength(2);
    expect(appReducer(next, { type: 'categories/set', value: ['Проект', 'Работа'] }).categories).toEqual(['Проект', 'Работа']);
  });
  it('clamps density to a safe range', () => {
    expect(appReducer(initial, { type: 'density/set', value: 1 }).density).toBe(4);
    expect(appReducer(initial, { type: 'density/set', value: 100 }).density).toBe(32);
  });
});
