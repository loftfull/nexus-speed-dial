import type { SiteRecord, TileMode, VisualPreset, Project, BrowserSession, Category, SiteGroup } from './types';
import { migrateHierarchy } from './hierarchy';
import { seedCategories, seedGroups, seedProjects } from './seed';
import { readStorage, writeStorage } from './storage';

export type TileState = { mode: TileMode; preset: VisualPreset; radius: number; iconSize: number; hover: string; shadow: string; font: string; size?: string; showDescription?: boolean; showDomain?: boolean; showNotifications?: boolean };
export type AppearanceState = { theme: string; accent: string; wallpaper: string };

export type UiState = { sidebar: boolean; weather: boolean; compact: boolean; animations: boolean; newTab: boolean; searchLocal: boolean; searchSuggestions: boolean; searchEngine: string; weatherCity: string; weatherUnits: string; weatherAuto: boolean; localOnly: boolean; saveHistory: boolean; analytics: boolean; remotePreviews?: boolean; projects?: boolean; sidebarWidth?: string; mobileMode?: string };

export type AppState = {
  sites: SiteRecord[];
  categories: Category[];
  groups: SiteGroup[];
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
  | { type: 'categories/set'; value: Category[] | ((current: Category[]) => Category[]) }
  | { type: 'groups/set'; value: SiteGroup[] | ((current: SiteGroup[]) => SiteGroup[]) }
  | { type: 'history/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'density/set'; value: number }
  | { type: 'ui/set'; value: UiState | ((current: UiState) => UiState) }
  | { type: 'tile/set'; value: TileState | ((current: TileState) => TileState) }
  | { type: 'appearance/set'; value: AppearanceState | ((current: AppearanceState) => AppearanceState) }
  | { type: 'projects/set'; value: Project[] | ((current: Project[]) => Project[]) }
  | { type: 'sessions/set'; value: BrowserSession[] | ((current: BrowserSession[]) => BrowserSession[]) };  

export const defaultProjects = seedProjects;
export const defaultCategories = seedCategories;

function normalizeSidebarWidth(value: unknown): string {
  if (typeof value !== 'string') return '292px';
  const match = value.trim().match(/^(240|292|340)\s*px$/i);
  return match ? `${match[1]}px` : '292px';
}

export function createInitialAppState(initialSites: SiteRecord[]): AppState {
  const storedSites = readStorage('nexus-sites', initialSites).map((site, index) => site.id ? site : { ...site, id: `site-${site.domain.replace(/[^a-z0-9]+/gi, '-')}-${index}` });
  const resolveSiteRef = (reference: string) => storedSites.find(site => site.id === reference || site.domain === reference || site.title === reference)?.id || reference;
  const storedProjects = readStorage('nexus-projects', defaultProjects).map(project => ({ ...project, siteIds: project.siteIds.map(resolveSiteRef) }));
  const hierarchy = migrateHierarchy({
    projects: storedProjects,
    categories: readStorage<unknown>('nexus-categories', defaultCategories),
    groups: readStorage<unknown>('nexus-groups', seedGroups),
    sites: storedSites,
  });
  const storedSessions = readStorage<BrowserSession[]>('nexus-sessions', []).map(session => ({ ...session, siteIds: session.siteIds.map(resolveSiteRef), noteSiteIds: session.noteSiteIds?.map(resolveSiteRef) }));
  const storedUi = readStorage('nexus-ui', null as UiState | null);
  const defaultUi: UiState = { sidebar: true, weather: true, compact: false, animations: true, newTab: true, searchLocal: true, searchSuggestions: true, searchEngine: 'Google', weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true, localOnly: true, saveHistory: true, analytics: false, remotePreviews: false, projects: true, sidebarWidth: '292px', mobileMode: 'В виде меню' };
  return {
    sites: hierarchy.sites,
    categories: hierarchy.categories,
    groups: hierarchy.groups,
    history: readStorage('nexus-history', []),
    density: readStorage('nexus-density', 20),
    ui: { ...defaultUi, ...(storedUi ?? {}), sidebarWidth: normalizeSidebarWidth(storedUi?.sidebarWidth) },
    tile: readStorage('nexus-tile', { mode: 'standard' as TileMode, preset: 'glass' as VisualPreset, radius: 20, iconSize: 40, hover: 'lift', shadow: 'soft', font: 'Manrope', size: 'M', showDescription: true, showDomain: false, showNotifications: true }),
    appearance: readStorage('nexus-appearance', { theme: 'light', accent: '#2f7cf6', wallpaper: 'aurora' }),
    sessions: storedSessions,
    projects: storedProjects,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'sites/set': return { ...state, sites: typeof action.value === 'function' ? action.value(state.sites) : action.value };
    case 'categories/set': return { ...state, categories: typeof action.value === 'function' ? action.value(state.categories) : action.value };
    case 'groups/set': return { ...state, groups: typeof action.value === 'function' ? action.value(state.groups) : action.value };
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

/** Returns false when at least one key could not be written, e.g. the quota is full. */
export function persistAppState(state: AppState): boolean {
  return [
    writeStorage('nexus-sites', state.sites),
    writeStorage('nexus-categories', state.categories),
    writeStorage('nexus-groups', state.groups),
    writeStorage('nexus-history', state.history),
    writeStorage('nexus-density', state.density),
    writeStorage('nexus-ui', state.ui),
    writeStorage('nexus-tile', state.tile),
    writeStorage('nexus-appearance', state.appearance),
    writeStorage('nexus-projects', state.projects),
    writeStorage('nexus-sessions', state.sessions),
  ].every(Boolean);
}
