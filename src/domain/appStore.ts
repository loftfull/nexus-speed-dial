import type { SiteRecord, TileMode, VisualPreset, Project, BrowserSession } from './types';
import { readStorage, writeStorage } from './storage';

export type TileState = { mode: TileMode; preset: VisualPreset; radius: number; iconSize: number; hover: string; shadow: string; font: string; size?: string; showDescription?: boolean; showDomain?: boolean; showNotifications?: boolean };
export type AppearanceState = { theme: string; accent: string; wallpaper: string };

export type UiState = { sidebar: boolean; weather: boolean; compact: boolean; animations: boolean; newTab: boolean; searchLocal: boolean; searchSuggestions: boolean; searchEngine: string; weatherCity: string; weatherUnits: string; weatherAuto: boolean; localOnly: boolean; saveHistory: boolean; analytics: boolean; projects?: boolean; sidebarWidth?: string; mobileMode?: string };

export type AppState = {
  sites: SiteRecord[];
  categories: string[];
  history: string[];
  density: number;
  ui: UiState;
  tile: TileState;
  appearance: AppearanceState;
  projects: Project[];
  sessions: BrowserSession[];
};

export type AppAction =
  | { type: 'sites/set'; value: SiteRecord[] | ((current: SiteRecord[]) => SiteRecord[]) }
  | { type: 'categories/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'history/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'density/set'; value: number }
  | { type: 'ui/set'; value: UiState | ((current: UiState) => UiState) }
  | { type: 'tile/set'; value: TileState | ((current: TileState) => TileState) }
  | { type: 'appearance/set'; value: AppearanceState | ((current: AppearanceState) => AppearanceState) }
  | { type: 'projects/set'; value: Project[] | ((current: Project[]) => Project[]) }
  | { type: 'sessions/set'; value: BrowserSession[] | ((current: BrowserSession[]) => BrowserSession[]) };  

export const defaultCategories = ['Проект', 'Работа', 'Личное', 'Развлечения', 'Вдохновение'];

function normalizeSidebarWidth(value: unknown): string {
  if (typeof value !== 'string') return '292px';
  const match = value.trim().match(/^(240|292|340)\s*px$/i);
  return match ? `${match[1]}px` : '292px';
}

export function createInitialAppState(initialSites: SiteRecord[]): AppState {
  const storedUi = readStorage('nexus-ui', null as UiState | null);
  const defaultUi: UiState = { sidebar: true, weather: true, compact: false, animations: true, newTab: true, searchLocal: true, searchSuggestions: true, searchEngine: 'Google', weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true, localOnly: true, saveHistory: true, analytics: false, projects: true, sidebarWidth: '292px', mobileMode: 'В виде меню' };
  return {
    sites: readStorage('nexus-sites', initialSites),
    categories: readStorage('nexus-categories', defaultCategories),
    history: readStorage('nexus-history', []),
    density: readStorage('nexus-density', 20),
    ui: { ...defaultUi, ...(storedUi ?? {}), sidebarWidth: normalizeSidebarWidth(storedUi?.sidebarWidth) },
    tile: readStorage('nexus-tile', { mode: 'standard' as TileMode, preset: 'glass' as VisualPreset, radius: 20, iconSize: 40, hover: 'lift', shadow: 'soft', font: 'Manrope', size: 'M', showDescription: true, showDomain: true, showNotifications: true }),
    appearance: readStorage('nexus-appearance', { theme: 'light', accent: '#2f7cf6', wallpaper: 'aurora' }),
    sessions: readStorage('nexus-sessions', []),
    projects: readStorage('nexus-projects', defaultCategories.map((name, index) => ({ id: `project-${index}`, name, color: ['#3988ee','#8b63e8','#2aa879','#e5a43a','#e66c83'][index % 5], icon: name[0], siteIds: [], createdAt: Date.now(), updatedAt: Date.now() }))),
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
    case 'appearance/set': return { ...state, appearance: typeof action.value === 'function' ? action.value(state.appearance) : action.value };
    case 'projects/set': return { ...state, projects: typeof action.value === 'function' ? action.value(state.projects) : action.value };
    case 'sessions/set': return { ...state, sessions: typeof action.value === 'function' ? action.value(state.sessions) : action.value };
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
  writeStorage('nexus-appearance', state.appearance);
  writeStorage('nexus-projects', state.projects);
  writeStorage('nexus-sessions', state.sessions);
}
