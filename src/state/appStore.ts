import type { BackupSnapshot } from '../domain/backup.ts';
import type {
  AppSection,
  Category,
  ContentMode,
  HistoryEntry,
  LayoutMode,
  Project,
  Site,
  Space,
  StoredNote,
  TileAppearanceSettings,
  TilePreset,
  UserPreferences,
  ViewMode,
  WorkspaceTab,
} from '../domain/types.ts';
import { getTilePreset, normalizeTileSettings } from '../domain/tilePresets.ts';
import { seedCategories, seedProjects, seedSites, seedSpaces } from '../data/seed.ts';
import type { StorageAdapter } from '../storage/StorageAdapter.ts';
import { DEFAULT_WEATHER_LOCATION, normalizeWeatherLocation } from '../weather/weatherLocation.ts';
import type { WeatherLocation } from '../weather/weatherLocation.ts';

export type StructureEditorTarget = { kind: 'project' | 'category'; id?: string } | null;

type PersistedNavigation = {
  activeSpaceId?: string;
  activeCategoryId?: string | null;
  contentMode?: ContentMode;
  layoutMode?: LayoutMode;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  density: 'comfortable',
  background: 'soft',
  glassStrength: 'standard',
  searchEngine: 'google',
  globalSiteSearch: true,
  omniboxSuggestions: true,
};

export interface AppStoreState {
  activeSpaceId: string;
  activeCategoryId: string | null;
  contentMode: ContentMode;
  layoutMode: LayoutMode;
  query: string;
  spaces: Space[];
  preferences: UserPreferences;
  tileSettings: TileAppearanceSettings;
  categories: Category[];
  sites: Site[];
  history: HistoryEntry[];
  notes: StoredNote[];
  structureEditor: StructureEditorTarget;
  siteEditor: 'new' | string | null;
  calendarOpen: boolean;
  settingsOpen: boolean;
  mobileNavOpen: boolean;
  weatherOpen: boolean;
  weatherLocation: WeatherLocation;

  setActiveSpace(id: string): void;
  setActiveCategory(id: string | null): void;
  setContentMode(mode: ContentMode): void;
  setLayoutMode(mode: LayoutMode): void;
  setQuery(query: string): void;
  setPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void;
  resetPreferences(): void;

  addSpace(space: Space): void;
  updateSpace(id: string, patch: Partial<Omit<Space, 'id'>>): void;
  removeSpace(id: string): void;

  setTileSetting<K extends keyof TileAppearanceSettings>(key: K, value: TileAppearanceSettings[K]): void;
  applyTilePreset(preset: TilePreset): void;
  resetTileSettings(): void;

  addCategory(category: Category): void;
  updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): void;
  removeCategory(id: string): void;
  addSite(site: Site): void;
  updateSite(id: string, patch: Partial<Omit<Site, 'id'>>): void;
  removeSite(id: string): void;
  toggleFavorite(id: string): void;
  recordVisit(siteId: string, openedAt?: string): void;
  clearHistory(): void;
  addNote(input: { title: string; body: string; projectId?: string }, now?: string): void;
  updateNote(id: string, patch: Partial<Pick<StoredNote, 'title' | 'body' | 'projectId'>>, now?: string): void;
  removeNote(id: string): void;
  restoreBackup(snapshot: BackupSnapshot): void;

  setStructureEditor(target: StructureEditorTarget): void;
  setSiteEditor(target: 'new' | string | null): void;
  setCalendarOpen(open: boolean): void;
  setSettingsOpen(open: boolean): void;
  setMobileNavOpen(open: boolean): void;
  setWeatherOpen(open: boolean): void;
  setWeatherLocation(location: WeatherLocation): void;

  /** @deprecated Transitional adapter for pre-Pure-Speed-Dial data/UI. */
  section: AppSection;
  workspaceTab: WorkspaceTab;
  viewMode: ViewMode;
  activeProjectId: string;
  bookmarkQuery: string;
  projects: Project[];
  /** @deprecated Transitional adapter for pre-Pure-Speed-Dial data/UI. */
  setSection(section: AppSection): void;
  setWorkspaceTab(tab: WorkspaceTab): void;
  setViewMode(mode: ViewMode): void;
  setActiveProject(id: string): void;
  setBookmarkQuery(query: string): void;
  addProject(project: Project): void;
  updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): void;
  removeProject(id: string): void;
}

export interface AppStore {
  getState(): AppStoreState;
  subscribe(listener: () => void): () => void;
}

const KEYS = {
  tiles: 'nexus.tileSettings',
  preferences: 'nexus.preferences',
  spaces: 'nexus.spaces',
  projects: 'nexus.projects',
  navigation: 'nexus.navigation',
  categories: 'nexus.categories',
  sites: 'nexus.sites',
  history: 'nexus.history',
  notes: 'nexus.notes',
  weatherLocation: 'nexus.weatherLocation',
} as const;

const spaceIdOfCategory = (category: Category) => category.spaceId ?? category.projectId;
const spaceIdOfSite = (site: Site) => site.spaceId ?? site.projectId;
const toProjects = (spaces: Space[]): Project[] => spaces.map(({ id, name, icon, position }) => ({ id, name, icon, position }));
const tabForMode = (mode: ContentMode): WorkspaceTab => mode === 'all' ? 'quick' : mode;
const modeForTab = (tab: WorkspaceTab): ContentMode => tab === 'quick' ? 'all' : tab;

function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_USER_PREFERENCES };
  const value = raw as Partial<UserPreferences>;
  return {
    theme: value.theme === 'light' || value.theme === 'dark' || value.theme === 'system' ? value.theme : DEFAULT_USER_PREFERENCES.theme,
    density: value.density === 'compact' || value.density === 'comfortable' ? value.density : DEFAULT_USER_PREFERENCES.density,
    background: value.background === 'soft' || value.background === 'clean' || value.background === 'contrast' ? value.background : DEFAULT_USER_PREFERENCES.background,
    glassStrength: value.glassStrength === 'minimal' || value.glassStrength === 'standard' || value.glassStrength === 'strong' ? value.glassStrength : DEFAULT_USER_PREFERENCES.glassStrength,
    searchEngine: value.searchEngine === 'google' || value.searchEngine === 'yandex' || value.searchEngine === 'duckduckgo' ? value.searchEngine : DEFAULT_USER_PREFERENCES.searchEngine,
    globalSiteSearch: typeof value.globalSiteSearch === 'boolean' ? value.globalSiteSearch : DEFAULT_USER_PREFERENCES.globalSiteSearch,
    omniboxSuggestions: typeof value.omniboxSuggestions === 'boolean' ? value.omniboxSuggestions : DEFAULT_USER_PREFERENCES.omniboxSuggestions,
  };
}

function normalizeSpaces(raw: Array<Space | Project>): Space[] {
  const seen = new Set<string>();
  const normalized = raw.flatMap((item, index) => {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) return [];
    seen.add(item.id);
    return [{ id: item.id, name: item.name, icon: item.icon, position: typeof item.position === 'number' ? item.position : index }];
  });
  if (!normalized.some(space => space.id === 'home')) normalized.unshift(seedSpaces[0]);
  return normalized.map((space, index) => ({ ...space, position: Number.isFinite(space.position) ? space.position : index }));
}

function normalizeCategories(raw: Category[], spaces: Space[]): Category[] {
  const spaceIds = new Set(spaces.map(space => space.id));
  const seen = new Set<string>();
  const candidates = raw.flatMap((category, index) => {
    const spaceId = spaceIdOfCategory(category);
    if (!category?.id || seen.has(category.id) || !spaceIds.has(spaceId)) return [];
    seen.add(category.id);
    return [{ ...category, spaceId, projectId: spaceId, position: typeof category.position === 'number' ? category.position : index }];
  });
  const rootIds = new Set(candidates.filter(category => !category.parentId).map(category => category.id));
  const byId = new Map(candidates.map(category => [category.id, category]));
  return candidates.map(category => {
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    const parentId = parent && rootIds.has(parent.id) && parent.spaceId === category.spaceId ? parent.id : undefined;
    return { ...category, parentId };
  });
}

function normalizeSites(raw: Site[], spaces: Space[], categories: Category[]): Site[] {
  const spaceIds = new Set(spaces.map(space => space.id));
  const categoryById = new Map(categories.map(category => [category.id, category]));
  const seen = new Set<string>();
  return raw.flatMap((site, index) => {
    const spaceId = spaceIdOfSite(site);
    if (!site?.id || seen.has(site.id) || !spaceIds.has(spaceId)) return [];
    seen.add(site.id);
    const category = site.categoryId ? categoryById.get(site.categoryId) : undefined;
    return [{
      ...site,
      spaceId,
      projectId: spaceId,
      categoryId: category?.spaceId === spaceId ? category.id : undefined,
      position: typeof site.position === 'number' ? site.position : index,
    }];
  });
}

function normalizeNotes(raw: StoredNote[], spaces: Space[]): StoredNote[] {
  const ids = new Set(spaces.map(space => space.id));
  return raw.map(note => ({ ...note, projectId: note.projectId && ids.has(note.projectId) ? note.projectId : 'home' }));
}

function isContentMode(value: unknown): value is ContentMode {
  return value === 'all' || value === 'favorites' || value === 'recent';
}
function isLayoutMode(value: unknown): value is LayoutMode {
  return value === 'grid' || value === 'list';
}

export function createAppStore(storage: StorageAdapter): AppStore {
  const listeners = new Set<() => void>();
  let tileSettings = normalizeTileSettings(storage.get<TileAppearanceSettings>(KEYS.tiles, getTilePreset('standard')));
  let preferences = normalizePreferences(storage.get<unknown>(KEYS.preferences, DEFAULT_USER_PREFERENCES));
  const persistedSpaces = storage.get<Space[] | null>(KEYS.spaces, null);
  const legacyProjects = storage.get<Project[]>(KEYS.projects, seedProjects);
  let spaces = normalizeSpaces(persistedSpaces ?? legacyProjects);
  let categories = normalizeCategories(storage.get<Category[]>(KEYS.categories, seedCategories), spaces);
  let sites = normalizeSites(storage.get<Site[]>(KEYS.sites, seedSites), spaces, categories);
  let history = storage.get<HistoryEntry[]>(KEYS.history, []);
  let notes = normalizeNotes(storage.get<StoredNote[]>(KEYS.notes, []), spaces);
  let weatherLocation = normalizeWeatherLocation(storage.get<unknown>(KEYS.weatherLocation, DEFAULT_WEATHER_LOCATION));
  const persistedNavigation = storage.get<PersistedNavigation>(KEYS.navigation, {});
  const initialSpaceId = persistedNavigation.activeSpaceId && spaces.some(space => space.id === persistedNavigation.activeSpaceId) ? persistedNavigation.activeSpaceId : 'home';
  const initialCategoryId = persistedNavigation.activeCategoryId && categories.some(category => category.id === persistedNavigation.activeCategoryId && category.spaceId === initialSpaceId) ? persistedNavigation.activeCategoryId : null;
  const initialContentMode = isContentMode(persistedNavigation.contentMode) ? persistedNavigation.contentMode : 'all';
  const initialLayoutMode = isLayoutMode(persistedNavigation.layoutMode) ? persistedNavigation.layoutMode : 'grid';

  storage.set(KEYS.spaces, spaces);
  storage.set(KEYS.categories, categories);
  storage.set(KEYS.sites, sites);
  storage.set(KEYS.preferences, preferences);

  let state: AppStoreState;
  const emit = () => listeners.forEach(listener => listener());
  const patchState = (partial: Partial<AppStoreState>) => { state = { ...state, ...partial }; emit(); };
  const persistTiles = (next: TileAppearanceSettings) => { tileSettings = normalizeTileSettings(next); storage.set(KEYS.tiles, tileSettings); patchState({ tileSettings }); };
  const persistPreferences = (next: UserPreferences) => { preferences = normalizePreferences(next); storage.set(KEYS.preferences, preferences); patchState({ preferences }); };
  const persistNavigation = (next: Pick<AppStoreState, 'activeSpaceId' | 'activeCategoryId' | 'contentMode' | 'layoutMode'>) => storage.set(KEYS.navigation, next);
  const persistSpaces = (next: Space[]) => { spaces = normalizeSpaces(next); storage.set(KEYS.spaces, spaces); patchState({ spaces, projects: toProjects(spaces) }); };
  const persistCategories = (next: Category[]) => { categories = normalizeCategories(next, spaces); storage.set(KEYS.categories, categories); patchState({ categories }); };
  const persistSites = (next: Site[]) => { sites = normalizeSites(next, spaces, categories); storage.set(KEYS.sites, sites); patchState({ sites }); };
  const persistHistory = (next: HistoryEntry[]) => { history = next; storage.set(KEYS.history, history); patchState({ history }); };
  const persistNotes = (next: StoredNote[]) => { notes = normalizeNotes(next, spaces); storage.set(KEYS.notes, notes); patchState({ notes }); };
  const uniqueId = (prefix: string, requested?: string) => requested && ![...spaces, ...categories, ...sites].some(item => item.id === requested) ? requested : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const applyNavigation = (partial: Partial<Pick<AppStoreState, 'activeSpaceId' | 'activeCategoryId' | 'contentMode' | 'layoutMode' | 'query'>>) => {
    const activeSpaceId = partial.activeSpaceId ?? state.activeSpaceId;
    const requestedCategory = Object.prototype.hasOwnProperty.call(partial, 'activeCategoryId') ? partial.activeCategoryId ?? null : state.activeCategoryId;
    const activeCategoryId = requestedCategory && categories.some(category => category.id === requestedCategory && category.spaceId === activeSpaceId) ? requestedCategory : null;
    const contentMode = partial.contentMode ?? state.contentMode;
    const layoutMode = partial.layoutMode ?? state.layoutMode;
    const query = partial.query ?? state.query;
    persistNavigation({ activeSpaceId, activeCategoryId, contentMode, layoutMode });
    patchState({
      activeSpaceId,
      activeCategoryId,
      contentMode,
      layoutMode,
      query,
      activeProjectId: activeSpaceId,
      workspaceTab: tabForMode(contentMode),
      viewMode: layoutMode,
      bookmarkQuery: query,
    });
  };

  const addSpace = (space: Space) => {
    const id = uniqueId('space', space.id);
    const position = Number.isFinite(space.position) ? space.position : spaces.length;
    persistSpaces([...spaces, { ...space, id, position }]);
  };

  const updateSpace = (id: string, spacePatch: Partial<Omit<Space, 'id'>>) => {
    persistSpaces(spaces.map(space => space.id === id ? { ...space, ...spacePatch } : space));
  };

  const removeSpace = (id: string) => {
    if (id === 'home' || !spaces.some(space => space.id === id)) return;
    persistSites(sites.map(site => site.spaceId === id ? { ...site, spaceId: 'home', projectId: 'home', categoryId: undefined } : site));
    persistCategories(categories.filter(category => category.spaceId !== id));
    persistNotes(notes.map(note => note.projectId === id ? { ...note, projectId: 'home' } : note));
    persistSpaces(spaces.filter(space => space.id !== id));
    if (state.activeSpaceId === id) applyNavigation({ activeSpaceId: 'home', activeCategoryId: null });
  };

  state = {
    activeSpaceId: initialSpaceId,
    activeCategoryId: initialCategoryId,
    contentMode: initialContentMode,
    layoutMode: initialLayoutMode,
    query: '',
    spaces,
    preferences,
    tileSettings,
    categories,
    sites,
    history,
    notes,
    structureEditor: null,
    siteEditor: null,
    calendarOpen: false,
    settingsOpen: false,
    mobileNavOpen: false,
    weatherOpen: false,
    weatherLocation,

    setActiveSpace: activeSpaceId => applyNavigation({ activeSpaceId, activeCategoryId: null }),
    setActiveCategory: activeCategoryId => applyNavigation({ activeCategoryId }),
    setContentMode: contentMode => applyNavigation({ contentMode }),
    setLayoutMode: layoutMode => applyNavigation({ layoutMode }),
    setQuery: query => applyNavigation({ query }),
    setPreference: (key, value) => persistPreferences({ ...preferences, [key]: value }),
    resetPreferences: () => persistPreferences(DEFAULT_USER_PREFERENCES),
    addSpace,
    updateSpace,
    removeSpace,

    setTileSetting: (key, value) => persistTiles({ ...tileSettings, [key]: value }),
    applyTilePreset: preset => persistTiles(getTilePreset(preset)),
    resetTileSettings: () => persistTiles(getTilePreset('standard')),

    addCategory: category => {
      const spaceId = spaceIdOfCategory(category);
      if (!spaces.some(space => space.id === spaceId)) return;
      const parent = category.parentId ? categories.find(item => item.id === category.parentId) : undefined;
      const safeParentId = parent && !parent.parentId && parent.spaceId === spaceId ? parent.id : undefined;
      persistCategories([...categories, { ...category, id: uniqueId('category', category.id), spaceId, projectId: spaceId, parentId: safeParentId, position: category.position ?? categories.length }]);
    },
    updateCategory: (id, categoryPatch) => {
      const current = categories.find(category => category.id === id);
      if (!current) return;
      const nextSpaceId = categoryPatch.spaceId ?? categoryPatch.projectId ?? current.spaceId ?? current.projectId;
      if (!spaces.some(space => space.id === nextSpaceId)) return;
      const requestedParent = Object.prototype.hasOwnProperty.call(categoryPatch, 'parentId') ? categoryPatch.parentId : current.parentId;
      const childIds = current.parentId ? [] : categories.filter(category => category.parentId === id).map(category => category.id);
      const parent = requestedParent ? categories.find(category => category.id === requestedParent) : undefined;
      const parentId = childIds.length === 0 && parent && parent.id !== id && !parent.parentId && parent.spaceId === nextSpaceId ? parent.id : undefined;
      persistCategories(categories.map(category => {
        if (category.id === id) return { ...category, ...categoryPatch, spaceId: nextSpaceId, projectId: nextSpaceId, parentId };
        if (childIds.includes(category.id) && nextSpaceId !== current.spaceId) return { ...category, spaceId: nextSpaceId, projectId: nextSpaceId };
        return category;
      }));
      if (nextSpaceId !== current.spaceId) {
        const movedIds = new Set([id, ...childIds]);
        persistSites(sites.map(site => site.categoryId && movedIds.has(site.categoryId) ? { ...site, spaceId: nextSpaceId, projectId: nextSpaceId } : site));
      }
    },
    removeCategory: id => {
      const ids = new Set([id, ...categories.filter(category => category.parentId === id).map(category => category.id)]);
      persistSites(sites.map(site => site.categoryId && ids.has(site.categoryId) ? { ...site, categoryId: undefined } : site));
      persistCategories(categories.filter(category => !ids.has(category.id)));
      if (state.activeCategoryId && ids.has(state.activeCategoryId)) applyNavigation({ activeCategoryId: null });
    },
    addSite: site => {
      const spaceId = spaceIdOfSite(site);
      if (!spaces.some(space => space.id === spaceId)) return;
      const category = site.categoryId ? categories.find(item => item.id === site.categoryId && item.spaceId === spaceId) : undefined;
      persistSites([...sites, { ...site, id: uniqueId('site', site.id), spaceId, projectId: spaceId, categoryId: category?.id, position: site.position ?? sites.length }]);
    },
    updateSite: (id, sitePatch) => {
      const current = sites.find(site => site.id === id);
      if (!current) return;
      const nextSpaceId = sitePatch.spaceId ?? sitePatch.projectId ?? current.spaceId ?? current.projectId;
      if (!spaces.some(space => space.id === nextSpaceId)) return;
      const requestedCategoryId = Object.prototype.hasOwnProperty.call(sitePatch, 'categoryId') ? sitePatch.categoryId : current.categoryId;
      const category = requestedCategoryId ? categories.find(item => item.id === requestedCategoryId && item.spaceId === nextSpaceId) : undefined;
      persistSites(sites.map(site => site.id === id ? { ...site, ...sitePatch, spaceId: nextSpaceId, projectId: nextSpaceId, categoryId: category?.id } : site));
    },
    removeSite: id => { persistSites(sites.filter(site => site.id !== id)); persistHistory(history.filter(item => item.siteId !== id)); },
    toggleFavorite: id => persistSites(sites.map(site => site.id === id ? { ...site, favorite: !site.favorite } : site)),
    recordVisit: (siteId, openedAt = new Date().toISOString()) => {
      if (!sites.some(site => site.id === siteId)) return;
      if (history[0]?.siteId === siteId) persistHistory([{ ...history[0], openedAt }, ...history.slice(1)]);
      else persistHistory([{ id: `visit-${openedAt}-${siteId}`, siteId, openedAt }, ...history].slice(0, 100));
    },
    clearHistory: () => persistHistory([]),
    addNote: (input, now = new Date().toISOString()) => {
      const title = input.title.trim() || 'Без названия';
      persistNotes([{ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, body: input.body.trim(), projectId: input.projectId, createdAt: now, updatedAt: now }, ...notes]);
    },
    updateNote: (id, notePatch, now = new Date().toISOString()) => persistNotes(notes.map(note => note.id === id ? { ...note, ...notePatch, updatedAt: now } : note)),
    removeNote: id => persistNotes(notes.filter(note => note.id !== id)),
    restoreBackup: snapshot => {
      tileSettings = normalizeTileSettings({ ...getTilePreset('standard'), ...snapshot.tileSettings });
      spaces = normalizeSpaces(snapshot.projects);
      categories = normalizeCategories(snapshot.categories, spaces);
      sites = normalizeSites(snapshot.sites, spaces, categories);
      history = snapshot.history.filter(entry => sites.some(site => site.id === entry.siteId)).slice(0, 100);
      notes = normalizeNotes(snapshot.notes, spaces);
      weatherLocation = normalizeWeatherLocation(snapshot.weatherLocation);
      storage.set(KEYS.tiles, tileSettings);
      storage.set(KEYS.spaces, spaces);
      storage.set(KEYS.categories, categories);
      storage.set(KEYS.sites, sites);
      storage.set(KEYS.history, history);
      storage.set(KEYS.notes, notes);
      storage.set(KEYS.weatherLocation, weatherLocation);
      storage.set(KEYS.navigation, { activeSpaceId: 'home', activeCategoryId: null, contentMode: 'all', layoutMode: 'grid' } satisfies PersistedNavigation);
      patchState({
        tileSettings,
        spaces,
        projects: toProjects(spaces),
        categories,
        sites,
        history,
        notes,
        weatherLocation,
        activeSpaceId: 'home',
        activeProjectId: 'home',
        activeCategoryId: null,
        contentMode: 'all',
        workspaceTab: 'quick',
        layoutMode: 'grid',
        viewMode: 'grid',
        query: '',
        bookmarkQuery: '',
        structureEditor: null,
        siteEditor: null,
      });
    },
    setStructureEditor: structureEditor => patchState({ structureEditor }),
    setSiteEditor: siteEditor => patchState({ siteEditor }),
    setCalendarOpen: calendarOpen => patchState({ calendarOpen }),
    setSettingsOpen: settingsOpen => patchState({ settingsOpen }),
    setMobileNavOpen: mobileNavOpen => patchState({ mobileNavOpen }),
    setWeatherOpen: weatherOpen => patchState({ weatherOpen }),
    setWeatherLocation: location => { weatherLocation = normalizeWeatherLocation(location); storage.set(KEYS.weatherLocation, weatherLocation); patchState({ weatherLocation }); },

    section: 'home',
    workspaceTab: tabForMode(initialContentMode),
    viewMode: initialLayoutMode,
    activeProjectId: initialSpaceId,
    bookmarkQuery: '',
    projects: toProjects(spaces),
    setSection: section => patchState({ section }),
    setWorkspaceTab: workspaceTab => applyNavigation({ contentMode: modeForTab(workspaceTab) }),
    setViewMode: viewMode => applyNavigation({ layoutMode: viewMode }),
    setActiveProject: activeProjectId => applyNavigation({ activeSpaceId: activeProjectId, activeCategoryId: null }),
    setBookmarkQuery: bookmarkQuery => applyNavigation({ query: bookmarkQuery }),
    addProject: project => addSpace({ ...project, position: project.position ?? spaces.length }),
    updateProject: (id, projectPatch) => updateSpace(id, projectPatch),
    removeProject: removeSpace,
  };

  persistNavigation({ activeSpaceId: initialSpaceId, activeCategoryId: initialCategoryId, contentMode: initialContentMode, layoutMode: initialLayoutMode });

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
