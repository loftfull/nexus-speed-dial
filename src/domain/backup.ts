export const BACKUP_SCHEMA = 'nexus-speed-dial';
export const BACKUP_VERSION = 1;

export type NexusBackup = {
  version: 1;
  exportedAt: string;
  sites: unknown[];
  projects: unknown[];
  /** Project → Category → Group, so a restore keeps the whole tree. */
  categories: unknown[];
  groups: unknown[];
  sessions: unknown[];
  settings?: { density?: number; ui?: unknown; tile?: unknown; appearance?: unknown };
};

export function createBackup(data: Omit<NexusBackup, 'version' | 'exportedAt'>, exportedAt = new Date().toISOString()) {
  return JSON.stringify({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt, data }, null, 2);
}

export function parseBackup(text: string): NexusBackup {
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('BACKUP_JSON'); }
  const data = raw?.schema === BACKUP_SCHEMA && raw?.version === BACKUP_VERSION ? raw.data : raw;
  if (!data || typeof data !== 'object' || !Array.isArray(data.sites)) throw new Error('BACKUP_SCHEMA');
  return {
    version: BACKUP_VERSION,
    exportedAt: typeof raw?.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    sites: data.sites,
    projects: Array.isArray(data.projects) ? data.projects : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : undefined,
  };
}
