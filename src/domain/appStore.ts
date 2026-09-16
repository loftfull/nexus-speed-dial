import type { SiteRecord } from './types';
import { readStorage, writeStorage } from './storage';

export type AppState = {
  sites: SiteRecord[];
  categories: string[];
  history: string[];
  density: number;
};

export type AppAction =
  | { type: 'sites/set'; value: SiteRecord[] | ((current: SiteRecord[]) => SiteRecord[]) }
  | { type: 'categories/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'history/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'density/set'; value: number };

export const defaultCategories = ['Проект', 'Работа', 'Личное', 'Развлечения', 'Вдохновение'];

export function createInitialAppState(initialSites: SiteRecord[]): AppState {
  return {
    sites: readStorage('nexus-sites', initialSites),
    categories: readStorage('nexus-categories', defaultCategories),
    history: readStorage('nexus-history', []),
    density: readStorage('nexus-density', 20),
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'sites/set': return { ...state, sites: typeof action.value === 'function' ? action.value(state.sites) : action.value };
    case 'categories/set': return { ...state, categories: typeof action.value === 'function' ? action.value(state.categories) : action.value };
    case 'history/set': return { ...state, history: typeof action.value === 'function' ? action.value(state.history) : action.value };
    case 'density/set': return { ...state, density: Math.max(4, Math.min(32, action.value)) };
    default: return state;
  }
}

export function persistAppState(state: AppState): void {
  writeStorage('nexus-sites', state.sites);
  writeStorage('nexus-categories', state.categories);
  writeStorage('nexus-history', state.history);
  writeStorage('nexus-density', state.density);
}
