import type { BackupSnapshot } from '../domain/backup.ts';
import type {
  AppSection,
  Category,
  HistoryEntry,
  Project,
  Site,
  StoredNote,
  TileAppearanceSettings,
  TilePreset,
  ViewMode,
  WorkspaceTab,
} from '../domain/types.ts';
import { getTilePreset, normalizeTileSettings } from '../domain/tilePresets.ts';
import { seedCategories, seedProjects, seedSites } from '../data/seed.ts';
import type { StorageAdapter } from '../storage/StorageAdapter.ts';
import { DEFAULT_WEATHER_LOCATION, normalizeWeatherLocation } from '../weather/weatherLocation.ts';
import type { WeatherLocation } from '../weather/weatherLocation.ts';

export type StructureEditorTarget = { kind: 'project' | 'category'; id?: string } | null;

export interface AppStoreState {
  section: AppSection;
  workspaceTab: WorkspaceTab;
  viewMode: ViewMode;
  activeProjectId: string;
  activeCategoryId: string | null;
  bookmarkQuery: string;
  tileSettings: TileAppearanceSettings;
  projects: Project[];
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
  setSection(section: AppSection): void;
  setWorkspaceTab(tab: WorkspaceTab): void;
  setViewMode(mode: ViewMode): void;
  setActiveProject(id: string): void;
  setActiveCategory(id: string | null): void;
  setBookmarkQuery(query: string): void;
  setTileSetting<K extends keyof TileAppearanceSettings>(key: K, value: TileAppearanceSettings[K]): void;
  applyTilePreset(preset: TilePreset): void;
  resetTileSettings(): void;
  addProject(project: Project): void;
  updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): void;
  removeProject(id: string): void;
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
}

export interface AppStore {
  getState(): AppStoreState;
  subscribe(listener: () => void): () => void;
}

const KEYS = {
  tiles: 'nexus.tileSettings',
  projects: 'nexus.projects',
  categories: 'nexus.categories',
  sites: 'nexus.sites',
  history: 'nexus.history',
  notes: 'nexus.notes',
  weatherLocation: 'nexus.weatherLocation',
} as const;

export function createAppStore(storage: StorageAdapter): AppStore {
  const listeners = new Set<() => void>();
  let tileSettings = normalizeTileSettings(storage.get<TileAppearanceSettings>(KEYS.tiles, getTilePreset('standard')));
  let projects = storage.get<Project[]>(KEYS.projects, seedProjects);
  let categories = storage.get<Category[]>(KEYS.categories, seedCategories);
  let sites = storage.get<Site[]>(KEYS.sites, seedSites);
  let history = storage.get<HistoryEntry[]>(KEYS.history, []);
  let notes = storage.get<StoredNote[]>(KEYS.notes, []);
  let weatherLocation = normalizeWeatherLocation(storage.get<unknown>(KEYS.weatherLocation, DEFAULT_WEATHER_LOCATION));
  const home = seedProjects.find(project => project.id === 'home');
  if (!projects.some(project => project.id === 'home') && home) projects = [home, ...projects];

  let state: AppStoreState;
  const emit = () => listeners.forEach(listener => listener());
  const patchState = (partial: Partial<AppStoreState>) => {
    state = { ...state, ...partial };
    emit();
  };
  const persistTiles = (next: TileAppearanceSettings) => {
    tileSettings = normalizeTileSettings(next);
    storage.set(KEYS.tiles, tileSettings);
    patchState({ tileSettings });
  };
  const persistProjects = (next: Project[]) => {
    projects = next;
    storage.set(KEYS.projects, projects);
    patchState({ projects });
  };
  const persistCategories = (next: Category[]) => {
    categories = next;
    storage.set(KEYS.categories, categories);
    patchState({ categories });
  };
  const persistSites = (next: Site[]) => {
    sites = next;
    storage.set(KEYS.sites, sites);
    patchState({ sites });
  };
  const persistHistory = (next: HistoryEntry[]) => {
    history = next;
    storage.set(KEYS.history, history);
    patchState({ history });
  };
  const persistNotes = (next: StoredNote[]) => {
    notes = next;
    storage.set(KEYS.notes, notes);
    patchState({ notes });
  };
  const uniqueId = (prefix: string, requested?: string) =>
    requested && ![...projects, ...categories, ...sites].some(item => item.id === requested)
      ? requested
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  state = {
    section: 'home',
    workspaceTab: 'quick',
    viewMode: 'grid',
    activeProjectId: 'home',
    activeCategoryId: null,
    bookmarkQuery: '',
    tileSettings,
    projects,
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
    setSection: section => patchState({ section }),
    setWorkspaceTab: workspaceTab => patchState({ workspaceTab }),
    setViewMode: viewMode => patchState({ viewMode }),
    setActiveProject: activeProjectId => patchState({ activeProjectId, activeCategoryId: null }),
    setActiveCategory: activeCategoryId => patchState({ activeCategoryId }),
    setBookmarkQuery: bookmarkQuery => patchState({ bookmarkQuery }),
    setTileSetting: (key, value) => persistTiles({ ...tileSettings, [key]: value }),
    applyTilePreset: preset => persistTiles(getTilePreset(preset)),
    resetTileSettings: () => persistTiles(getTilePreset('standard')),
    addProject: project => persistProjects([...projects, { ...project, id: uniqueId('project', project.id) }]),
    updateProject: (id, projectPatch) => persistProjects(projects.map(project => project.id === id ? { ...project, ...projectPatch } : project)),
    removeProject: id => {
      if (id === 'home' || !projects.some(project => project.id === id)) return;
      persistSites(sites.map(site => site.projectId === id ? { ...site, projectId: 'home', categoryId: undefined } : site));
      persistCategories(categories.filter(category => category.projectId !== id));
      persistNotes(notes.map(note => note.projectId === id ? { ...note, projectId: 'home' } : note));
      persistProjects(projects.filter(project => project.id !== id));
      if (state.activeProjectId === id) patchState({ activeProjectId: 'home', activeCategoryId: null });
    },
    addCategory: category => {
      const parent = category.parentId ? categories.find(item => item.id === category.parentId) : undefined;
      const safeParentId = parent && !parent.parentId && parent.projectId === category.projectId ? parent.id : undefined;
      persistCategories([...categories, { ...category, id: uniqueId('category', category.id), parentId: safeParentId }]);
    },
    updateCategory: (id, categoryPatch) => {
      const current = categories.find(category => category.id === id);
      if (!current) return;
      const nextProjectId = categoryPatch.projectId ?? current.projectId;
      const requestedParent = Object.prototype.hasOwnProperty.call(categoryPatch, 'parentId') ? categoryPatch.parentId : current.parentId;
      const parent = requestedParent ? categories.find(category => category.id === requestedParent) : undefined;
      const parentId = parent && parent.id !== id && !parent.parentId && parent.projectId === nextProjectId ? parent.id : undefined;
      const childIds = current.parentId ? [] : categories.filter(category => category.parentId === id).map(category => category.id);
      persistCategories(categories.map(category => {
        if (category.id === id) return { ...category, ...categoryPatch, projectId: nextProjectId, parentId };
        if (childIds.includes(category.id) && nextProjectId !== current.projectId) return { ...category, projectId: nextProjectId };
        return category;
      }));
      if (nextProjectId !== current.projectId) {
        const movedIds = new Set([id, ...childIds]);
        persistSites(sites.map(site => site.categoryId && movedIds.has(site.categoryId) ? { ...site, projectId: nextProjectId } : site));
      }
    },
    removeCategory: id => {
      const ids = new Set([id, ...categories.filter(category => category.parentId === id).map(category => category.id)]);
      persistSites(sites.map(site => site.categoryId && ids.has(site.categoryId) ? { ...site, categoryId: undefined } : site));
      persistCategories(categories.filter(category => !ids.has(category.id)));
      if (state.activeCategoryId && ids.has(state.activeCategoryId)) patchState({ activeCategoryId: null });
    },
    addSite: site => persistSites([...sites, { ...site, id: uniqueId('site', site.id) }]),
    updateSite: (id, sitePatch) => persistSites(sites.map(site => site.id === id ? { ...site, ...sitePatch } : site)),
    removeSite: id => {
      persistSites(sites.filter(site => site.id !== id));
      persistHistory(history.filter(item => item.siteId !== id));
    },
    toggleFavorite: id => persistSites(sites.map(site => site.id === id ? { ...site, favorite: !site.favorite } : site)),
    recordVisit: (siteId, openedAt = new Date().toISOString()) => {
      if (!sites.some(site => site.id === siteId)) return;
      if (history[0]?.siteId === siteId) persistHistory([{ ...history[0], openedAt }, ...history.slice(1)]);
      else persistHistory([{ id: `visit-${openedAt}-${siteId}`, siteId, openedAt }, ...history].slice(0, 100));
    },
    clearHistory: () => persistHistory([]),
    addNote: (input, now = new Date().toISOString()) => {
      const title = input.title.trim() || 'Без названия';
      persistNotes([{
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        body: input.body.trim(),
        projectId: input.projectId,
        createdAt: now,
        updatedAt: now,
      }, ...notes]);
    },
    updateNote: (id, notePatch, now = new Date().toISOString()) => persistNotes(notes.map(note => note.id === id ? { ...note, ...notePatch, updatedAt: now } : note)),
    removeNote: id => persistNotes(notes.filter(note => note.id !== id)),
    restoreBackup: snapshot => {
      tileSettings = normalizeTileSettings({ ...getTilePreset('standard'), ...snapshot.tileSettings });
      projects = snapshot.projects;
      categories = snapshot.categories;
      sites = snapshot.sites;
      history = snapshot.history;
      notes = snapshot.notes;
      weatherLocation = normalizeWeatherLocation(snapshot.weatherLocation);
      storage.set(KEYS.tiles, tileSettings);
      storage.set(KEYS.projects, projects);
      storage.set(KEYS.categories, categories);
      storage.set(KEYS.sites, sites);
      storage.set(KEYS.history, history);
      storage.set(KEYS.notes, notes);
      storage.set(KEYS.weatherLocation, weatherLocation);
      patchState({
        tileSettings,
        projects,
        categories,
        sites,
        history,
        notes,
        weatherLocation,
        activeProjectId: 'home',
        activeCategoryId: null,
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
    setWeatherLocation: location => {
      weatherLocation = normalizeWeatherLocation(location);
      storage.set(KEYS.weatherLocation, weatherLocation);
      patchState({ weatherLocation });
    },
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
