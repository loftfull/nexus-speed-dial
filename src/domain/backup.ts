import type { Category, HistoryEntry, Project, Site, StoredNote, TileAppearanceSettings, UserPreferences } from './types.ts';

export interface BackupSnapshot {
  preferences?: UserPreferences;
  tileSettings: Partial<TileAppearanceSettings>;
  projects: Project[];
  categories: Category[];
  sites: Site[];
  history: HistoryEntry[];
  notes: StoredNote[];
  weatherLocation: unknown;
}

interface BackupEnvelope {
  schema: 'nexus-speed-dial';
  version: 1;
  exportedAt: string;
  data: BackupSnapshot;
}

const homeProject: Project = { id: 'home', name: 'Дом', icon: 'home' };
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isSafeHttpUrl = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const isProject = (value: unknown): value is Project => isObject(value) && isString(value.id) && isString(value.name) && isString(value.icon);
const isCategory = (value: unknown): value is Category => isObject(value) && isString(value.id) && isString(value.name) && isString(value.projectId) && isString(value.icon) && (value.parentId === undefined || typeof value.parentId === 'string');
const isSite = (value: unknown): value is Site => isObject(value) && isString(value.id) && isString(value.title) && isSafeHttpUrl(value.url) && isString(value.domain) && isString(value.projectId) && typeof value.favorite === 'boolean';
const isHistory = (value: unknown): value is HistoryEntry => isObject(value) && isString(value.id) && isString(value.siteId) && isString(value.openedAt);
const isNote = (value: unknown): value is StoredNote => isObject(value) && isString(value.id) && typeof value.title === 'string' && typeof value.body === 'string' && isString(value.createdAt) && isString(value.updatedAt) && (value.projectId === undefined || typeof value.projectId === 'string');
const isPreferences = (value: unknown): value is UserPreferences => isObject(value)
  && ['system', 'light', 'dark'].includes(String(value.theme))
  && ['comfortable', 'compact'].includes(String(value.density))
  && ['soft', 'clean', 'contrast'].includes(String(value.background))
  && ['minimal', 'standard', 'strong'].includes(String(value.glassStrength))
  && ['google', 'yandex', 'duckduckgo'].includes(String(value.searchEngine))
  && typeof value.globalSiteSearch === 'boolean'
  && typeof value.omniboxSuggestions === 'boolean';
const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export function createBackup(snapshot: BackupSnapshot, exportedAt = new Date().toISOString()): string {
  const envelope: BackupEnvelope = { schema: 'nexus-speed-dial', version: 1, exportedAt, data: snapshot };
  return JSON.stringify(envelope, null, 2);
}

export function parseBackup(text: string): BackupSnapshot {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('BACKUP_JSON'); }
  if (!isObject(raw) || raw.schema !== 'nexus-speed-dial' || raw.version !== 1 || !isObject(raw.data)) throw new Error('BACKUP_SCHEMA');
  const data = raw.data;
  if (!isObject(data.tileSettings) || !Array.isArray(data.projects) || !Array.isArray(data.categories) || !Array.isArray(data.sites) || !Array.isArray(data.history) || !Array.isArray(data.notes)) throw new Error('BACKUP_DATA');

  let projects = uniqueById(data.projects.filter(isProject));
  if (!projects.some(project => project.id === 'home')) projects = [homeProject, ...projects];
  const projectIds = new Set(projects.map(project => project.id));

  const candidateCategories = uniqueById(data.categories.filter(isCategory)).filter(category => projectIds.has(category.projectId));
  const rootIds = new Set(candidateCategories.filter(category => !category.parentId).map(category => category.id));
  const categories = candidateCategories.map(category => ({
    ...category,
    parentId: category.parentId && rootIds.has(category.parentId) && candidateCategories.find(parent => parent.id === category.parentId)?.projectId === category.projectId ? category.parentId : undefined,
  }));
  const categoryById = new Map(categories.map(category => [category.id, category]));

  const sites = uniqueById(data.sites.filter(isSite)).filter(site => projectIds.has(site.projectId)).map(site => {
    const category = site.categoryId ? categoryById.get(site.categoryId) : undefined;
    return { ...site, categoryId: category?.projectId === site.projectId ? category.id : undefined };
  });
  const siteIds = new Set(sites.map(site => site.id));
  const history = uniqueById(data.history.filter(isHistory)).filter(entry => siteIds.has(entry.siteId)).slice(0, 100);
  const notes = uniqueById(data.notes.filter(isNote)).map(note => ({ ...note, projectId: note.projectId && projectIds.has(note.projectId) ? note.projectId : 'home' }));

  return {
    preferences: isPreferences(data.preferences) ? data.preferences : undefined,
    tileSettings: data.tileSettings as Partial<TileAppearanceSettings>,
    projects,
    categories,
    sites,
    history,
    notes,
    weatherLocation: data.weatherLocation,
  };
}
