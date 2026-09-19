import type { SiteRecord, Project, BrowserSession, Category, SiteGroup } from './types';
import { normalizeSiteAddress } from './siteUtils';
import { normalizeTileAppearance, type TileAppearance } from './tileAppearance';
import { migrateHierarchy } from './hierarchy';
import { seedCategories, seedGroups, seedProjects } from './seed';
import { readStorage, writeStorage } from './storage';
import type { NexusBackup } from './backup';

/** Внешний вид плитки целиком описан в `tileAppearance`. */
export type TileState = TileAppearance;
/** veil — плотность светлой вуали поверх своего изображения, 0…100. */
/**
 * veil — плотность светлой вуали поверх фотографии, 0…100.
 * panelBlur — насколько панели пропускают сцену сквозь себя, 0…20 px.
 */
export type AppearanceState = { theme: string; accent: string; wallpaper: string; veil?: number; panelBlur?: number };

/** Three arrangements the grid falls back to on a narrow screen. */
export type MobileMode = 'table' | 'rows' | 'icons';
export const MOBILE_MODES: MobileMode[] = ['table', 'rows', 'icons'];

export type UiState = { sidebar: boolean; weather: boolean; compact: boolean; animations: boolean; newTab: boolean; searchLocal: boolean; searchSuggestions: boolean; searchEngine: string; weatherCity: string; weatherUnits: string; weatherAuto: boolean; localOnly: boolean; saveHistory: boolean; analytics: boolean; remotePreviews?: boolean; siteIcons?: boolean; projects?: boolean; sidebarWidth?: string; mobileMode?: MobileMode; favoritesBar?: boolean; favoritesCount?: number; favoritesLabels?: boolean; panelRecent?: boolean; panelRecentCount?: number; panelRecentLabels?: boolean; rail?: boolean; homeLayout?: 'board' | 'grid'; folderSites?: number };

export type AppState = {
  sites: SiteRecord[];
  /** Deleted sites wait here until they are restored or purged. */
  trash: SiteRecord[];
  categories: Category[];
  groups: SiteGroup[];
  history: string[];
  ui: UiState;
  tile: TileState;
  appearance: AppearanceState;
  projects: Project[];
  sessions: BrowserSession[];
};

export type AppAction =
  | { type: 'sites/set'; value: SiteRecord[] | ((current: SiteRecord[]) => SiteRecord[]) }
  | { type: 'trash/set'; value: SiteRecord[] | ((current: SiteRecord[]) => SiteRecord[]) }
  | { type: 'categories/set'; value: Category[] | ((current: Category[]) => Category[]) }
  | { type: 'groups/set'; value: SiteGroup[] | ((current: SiteGroup[]) => SiteGroup[]) }
  | { type: 'history/set'; value: string[] | ((current: string[]) => string[]) }
  | { type: 'ui/set'; value: UiState | ((current: UiState) => UiState) }
  | { type: 'tile/set'; value: TileState | ((current: TileState) => TileState) }
  | { type: 'appearance/set'; value: AppearanceState | ((current: AppearanceState) => AppearanceState) }
  | { type: 'projects/set'; value: Project[] | ((current: Project[]) => Project[]) }
  | { type: 'sessions/set'; value: BrowserSession[] | ((current: BrowserSession[]) => BrowserSession[]) }
  | { type: 'backup/apply'; value: NexusBackup };

export const defaultProjects = seedProjects;
export const defaultCategories = seedCategories;

function normalizeSidebarWidth(value: unknown): string {
  if (typeof value !== 'string') return '292px';
  const match = value.trim().match(/^(240|292|340)\s*px$/i);
  return match ? `${match[1]}px` : '292px';
}

/** Older builds stored a menu label here; anything unknown falls back to the table. */
export function normalizeMobileMode(value: unknown): MobileMode {
  return MOBILE_MODES.includes(value as MobileMode) ? value as MobileMode : 'table';
}

export function createInitialAppState(initialSites: SiteRecord[]): AppState {
  const storedSites = readStorage('nexus-sites', initialSites).map((site, index) => {
    const address = normalizeSiteAddress(site.url ?? site.domain);
    return {
      ...site,
      id: site.id || `site-${site.domain.replace(/[^a-z0-9]+/gi, '-')}-${index}`,
      domain: address?.domain ?? site.domain,
      url: address?.url ?? site.url,
    };
  });
  const resolveSiteRef = (reference: string) => storedSites.find(site => site.id === reference || site.url === reference || site.domain === reference || site.title === reference)?.id || reference;
  const storedProjects = readStorage('nexus-projects', defaultProjects).map(project => ({ ...project, siteIds: project.siteIds.map(resolveSiteRef) }));
  const hierarchy = migrateHierarchy({
    projects: storedProjects,
    categories: readStorage<unknown>('nexus-categories', defaultCategories),
    groups: readStorage<unknown>('nexus-groups', seedGroups),
    sites: storedSites,
  });
  const storedSessions = readStorage<BrowserSession[]>('nexus-sessions', []).map(session => ({ ...session, siteIds: session.siteIds.map(resolveSiteRef), noteSiteIds: session.noteSiteIds?.map(resolveSiteRef) }));
  const storedUi = readStorage('nexus-ui', null as UiState | null);
  const defaultUi: UiState = { sidebar: true, weather: true, compact: false, animations: true, newTab: true, searchLocal: true, searchSuggestions: true, searchEngine: 'Google', weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true, localOnly: true, saveHistory: true, analytics: false, remotePreviews: false, siteIcons: true, projects: true, sidebarWidth: '292px', mobileMode: 'table', favoritesBar: true, favoritesCount: 8, favoritesLabels: true, panelRecent: true, panelRecentCount: 6, panelRecentLabels: true };
  return {
    sites: hierarchy.sites,
    trash: readStorage<SiteRecord[]>('nexus-trash', []),
    categories: hierarchy.categories,
    groups: hierarchy.groups,
    history: readStorage('nexus-history', []),
    ui: { ...defaultUi, ...(storedUi ?? {}), sidebarWidth: normalizeSidebarWidth(storedUi?.sidebarWidth), mobileMode: normalizeMobileMode(storedUi?.mobileMode) },
    tile: normalizeTileAppearance(readStorage<unknown>('nexus-tile', null)),
    appearance: readStorage('nexus-appearance', { theme: 'light', accent: '#2f7cf6', wallpaper: 'lake' }),
    sessions: storedSessions,
    projects: storedProjects,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeById<T extends { id?: string }>(incoming: T[], current: T[]): T[] {
  const incomingIds = new Set(incoming.map(item => item.id).filter((id): id is string => Boolean(id)));
  return [...incoming, ...current.filter(item => !item.id || !incomingIds.has(item.id))];
}

function normalizeBackupSite(value: unknown, index: number): SiteRecord | null {
  if (!isRecord(value) || typeof value.title !== 'string') return null;
  const source = typeof value.url === 'string' ? value.url : typeof value.domain === 'string' ? value.domain : '';
  const address = normalizeSiteAddress(source);
  if (!address) return null;
  const title = value.title.trim();
  if (!title) return null;

  return {
    ...(value as SiteRecord),
    id: typeof value.id === 'string' && value.id ? value.id : `site-backup-${Date.now()}-${index}`,
    title,
    domain: address.domain,
    url: address.url,
    desc: typeof value.desc === 'string' ? value.desc : 'Сохранённый сайт',
    color: typeof value.color === 'string' ? value.color : '#2f7cf6',
    icon: typeof value.icon === 'string' && value.icon ? value.icon : title[0].toUpperCase(),
    category: typeof value.category === 'string' ? value.category : 'Личное',
  };
}

function siteDestination(site: SiteRecord): string {
  return normalizeSiteAddress(site.url ?? site.domain)?.url ?? site.domain;
}

export function applyBackup(state: AppState, backup: NexusBackup): AppState {
  const incomingSites = backup.sites
    .map(normalizeBackupSite)
    .filter((site): site is SiteRecord => Boolean(site));
  const incomingIds = new Set(incomingSites.map(site => site.id).filter((id): id is string => Boolean(id)));
  const incomingDestinations = new Set(incomingSites.map(siteDestination));
  const sites = [
    ...incomingSites,
    ...state.sites.filter(site =>
      (!site.id || !incomingIds.has(site.id)) && !incomingDestinations.has(siteDestination(site))),
  ];

  const resolveSiteRef = (reference: string) =>
    sites.find(site => site.id === reference || site.url === reference || site.domain === reference || site.title === reference)?.id || reference;

  const projects = mergeById(
    (backup.projects.filter(isRecord) as unknown as Project[]).map(project => ({
      ...project,
      siteIds: Array.isArray(project.siteIds) ? project.siteIds.map(resolveSiteRef) : [],
    })),
    state.projects,
  );
  const categories = mergeById(backup.categories.filter(isRecord) as unknown as Category[], state.categories);
  const groups = mergeById(backup.groups.filter(isRecord) as unknown as SiteGroup[], state.groups);
  const sessions = mergeById(
    (backup.sessions.filter(isRecord) as unknown as BrowserSession[]).map(session => ({
      ...session,
      siteIds: Array.isArray(session.siteIds) ? session.siteIds.map(resolveSiteRef) : [],
      noteSiteIds: Array.isArray(session.noteSiteIds) ? session.noteSiteIds.map(resolveSiteRef) : session.noteSiteIds,
    })),
    state.sessions,
  );

  const settings = isRecord(backup.settings) ? backup.settings : {};
  const uiPatch = isRecord(settings.ui) ? settings.ui as Partial<UiState> : {};
  const tilePatch = isRecord(settings.tile) ? settings.tile : {};
  const appearancePatch = isRecord(settings.appearance) ? settings.appearance as Partial<AppearanceState> : {};
  const nextUi = { ...state.ui, ...uiPatch };

  return {
    ...state,
    sites,
    projects,
    categories,
    groups,
    sessions,
    ui: {
      ...nextUi,
      sidebarWidth: normalizeSidebarWidth(nextUi.sidebarWidth),
      mobileMode: normalizeMobileMode(nextUi.mobileMode),
    },
    tile: normalizeTileAppearance({ ...state.tile, ...tilePatch }),
    appearance: { ...state.appearance, ...appearancePatch },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'sites/set': return { ...state, sites: typeof action.value === 'function' ? action.value(state.sites) : action.value };
    case 'trash/set': return { ...state, trash: (typeof action.value === 'function' ? action.value(state.trash) : action.value).slice(0, 100) };
    case 'categories/set': return { ...state, categories: typeof action.value === 'function' ? action.value(state.categories) : action.value };
    case 'groups/set': return { ...state, groups: typeof action.value === 'function' ? action.value(state.groups) : action.value };
    case 'history/set': return { ...state, history: typeof action.value === 'function' ? action.value(state.history) : action.value };
    case 'ui/set': return { ...state, ui: typeof action.value === 'function' ? action.value(state.ui) : action.value };
    case 'tile/set': return { ...state, tile: normalizeTileAppearance(typeof action.value === 'function' ? action.value(state.tile) : action.value) };
    case 'appearance/set': return { ...state, appearance: typeof action.value === 'function' ? action.value(state.appearance) : action.value };
    case 'projects/set': return { ...state, projects: typeof action.value === 'function' ? action.value(state.projects) : action.value };
    case 'sessions/set': return { ...state, sessions: typeof action.value === 'function' ? action.value(state.sessions) : action.value };
    case 'backup/apply': return applyBackup(state, action.value);
    default: return state;
  }
}

/** Returns false when at least one key could not be written, e.g. the quota is full. */
export function persistAppState(state: AppState): boolean {
  return [
    writeStorage('nexus-sites', state.sites),
    writeStorage('nexus-trash', state.trash),
    writeStorage('nexus-categories', state.categories),
    writeStorage('nexus-groups', state.groups),
    writeStorage('nexus-history', state.history),
    writeStorage('nexus-ui', state.ui),
    writeStorage('nexus-tile', state.tile),
    writeStorage('nexus-appearance', state.appearance),
    writeStorage('nexus-projects', state.projects),
    writeStorage('nexus-sessions', state.sessions),
  ].every(Boolean);
}
