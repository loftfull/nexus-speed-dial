import type { SiteRecord, TileMode, VisualPreset } from './types';
import { readStorage, writeStorage } from './storage';

export type TileState = { mode: TileMode; preset: VisualPreset };

export type UiState = { sidebar: boolean; weather: boolean; compact: boolean; animations: boolean; newTab: boolean };

export type AppState = {
  sites: SiteRecord[];
  categories: string[];
  history: string[];
  density: number;
  ui: UiState;
  tile: TileState;
};

export type AppAction =
  | { type: 'sites/set'; value: SiteRecord[] | ((current: SiteRecord[]) => SiteRecord[]) }
  | { type: 'categories/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'history/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'density/set'; value: number }
  | { type: 'ui/set'; value: UiState | ((current: UiState) => UiState) }
  | { type: 'tile/set'; value: TileState | ((current: TileState) => TileState) };

export const defaultCategories = ['Проект', 'Работа', 'Личное', 'Развлечения', 'Вдохновение'];

export function createInitialAppState(initialSites: SiteRecord[]): AppState {
  return {
    sites: readStorage('nexus-sites', initialSites),
    categories: readStorage('nexus-categories', defaultCategories),
    history: readStorage('nexus-history', []),
    density: readStorage('nexus-density', 20),
    ui: readStorage('nexus-ui', { sidebar: true, weather: true, compact: false, animations: true, newTab: true }),
    tile: readStorage('nexus-tile', { mode: 'standard' as TileMode, preset: 'glass' as VisualPreset }),
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'sites/set': return { ...state, sites: typeof action.value === 'function' ? action.value(state.sites) : action.value };
    case 'categories/set': return { ...state, categories: typeof action.value === 'function' ? action.value(state.categories) : action.value };
    case 'history/set': return { ...state, history: typeof action.value === 'function' ? action.value(state.history) : action.value };
    case 'density/set': return { ...state, density: Math.max(4, Math.min(32, action.value)) };
    case 'ui/set': return { ...state, ui: typeof action.value === 'function' ? action.value(state.ui) : action.value };
    case 'tile/set': return { ...state, tile: typeof action.value === 'function' ? action.value(state.tile) : action.value };
    default: return state;
  }
}

export function persistAppState(state: AppState): void {
  writeStorage('nexus-sites', state.sites);
  writeStorage('nexus-categories', state.categories);
  writeStorage('nexus-history', state.history);
  writeStorage('nexus-density', state.density);
  writeStorage('nexus-ui', state.ui);
  writeStorage('nexus-tile', state.tile);
}
