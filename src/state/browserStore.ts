import { createAppStore } from './appStore.ts';
import { createLocalStorageAdapter } from '../storage/localStorageAdapter.ts';

const memory = new Map<string, string>();
const fallbackStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};

const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : fallbackStorage;
export const appStore = createAppStore(createLocalStorageAdapter(storage));
