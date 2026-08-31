import type { AppSection, TileAppearanceSettings, TilePreset, ViewMode, WorkspaceTab } from '../domain/types.ts';
import { getTilePreset, normalizeTileSettings } from '../domain/tilePresets.ts';
import type { StorageAdapter } from '../storage/StorageAdapter.ts';

export interface AppStoreState {
  section: AppSection;
  workspaceTab: WorkspaceTab;
  viewMode: ViewMode;
  activeProjectId: string;
  activeCategoryId: string | null;
  bookmarkQuery: string;
  tileSettings: TileAppearanceSettings;
  calendarOpen: boolean;
  settingsOpen: boolean;
  mobileNavOpen: boolean;
  setSection(section: AppSection): void;
  setWorkspaceTab(tab: WorkspaceTab): void;
  setViewMode(mode: ViewMode): void;
  setActiveProject(id: string): void;
  setActiveCategory(id: string | null): void;
  setBookmarkQuery(query: string): void;
  setTileSetting<K extends keyof TileAppearanceSettings>(key: K, value: TileAppearanceSettings[K]): void;
  applyTilePreset(preset: TilePreset): void;
  resetTileSettings(): void;
  setCalendarOpen(open: boolean): void;
  setSettingsOpen(open: boolean): void;
  setMobileNavOpen(open: boolean): void;
}

export interface AppStore {
  getState(): AppStoreState;
  subscribe(listener: () => void): () => void;
}

const TILE_SETTINGS_KEY = 'nexus.tileSettings';

export function createAppStore(storage: StorageAdapter): AppStore {
  const listeners = new Set<() => void>();
  const stored = storage.get<TileAppearanceSettings | null>(TILE_SETTINGS_KEY, null);
  let tileSettings = stored ? normalizeTileSettings(stored) : getTilePreset('standard');

  let state: AppStoreState;
  const emit = () => listeners.forEach(listener => listener());
  const patch = (partial: Partial<AppStoreState>) => {
    state = { ...state, ...partial };
    emit();
  };
  const persistTiles = (next: TileAppearanceSettings) => {
    tileSettings = normalizeTileSettings(next);
    storage.set(TILE_SETTINGS_KEY, tileSettings);
    patch({ tileSettings });
  };

  state = {
    section: 'home',
    workspaceTab: 'quick',
    viewMode: 'grid',
    activeProjectId: 'home',
    activeCategoryId: null,
    bookmarkQuery: '',
    tileSettings,
    calendarOpen: false,
    settingsOpen: false,
    mobileNavOpen: false,
    setSection: section => patch({ section }),
    setWorkspaceTab: workspaceTab => patch({ workspaceTab }),
    setViewMode: viewMode => patch({ viewMode }),
    setActiveProject: activeProjectId => patch({ activeProjectId, activeCategoryId: null }),
    setActiveCategory: activeCategoryId => patch({ activeCategoryId }),
    setBookmarkQuery: bookmarkQuery => patch({ bookmarkQuery }),
    setTileSetting: (key, value) => persistTiles({ ...tileSettings, [key]: value }),
    applyTilePreset: preset => persistTiles(getTilePreset(preset)),
    resetTileSettings: () => persistTiles(getTilePreset('standard')),
    setCalendarOpen: calendarOpen => patch({ calendarOpen }),
    setSettingsOpen: settingsOpen => patch({ settingsOpen }),
    setMobileNavOpen: mobileNavOpen => patch({ mobileNavOpen }),
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
