import type { LibraryData } from "../types";
import { parseLibrary, serializeLibrary } from "./schema";

export const STORAGE_KEY = "nexus-navigator-v3";
export const BACKUP_KEY = "nexus-navigator-backup";
export const AI_KEY_STORAGE = "nexus-navigator-ai-key";

/** Keys written by Navigator 2.0; read once and migrated into STORAGE_KEY. */
export const LEGACY_KEYS = {
  sites: "nexus-v7-sites",
  prefs: "nexus-v7-prefs",
  sessions: "nexus-v7-sessions",
  aiKey: "nexus-v7-ai-key",
  backup: "nexus-backup",
} as const;

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readJson(store: KV, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Loads the library. Order: current key → legacy 2.0 keys → null (caller seeds demo data).
 * A corrupted current key falls through to the legacy keys instead of crashing the app.
 */
export function loadLibrary(store: KV): { data: LibraryData; migrated: boolean } | null {
  const current = parseLibrary(readJson(store, STORAGE_KEY));
  if (current.ok) return { data: current.data, migrated: false };

  const legacySites = readJson(store, LEGACY_KEYS.sites);
  if (Array.isArray(legacySites) && legacySites.length > 0) {
    const legacy = parseLibrary({
      version: 2,
      sites: legacySites,
      prefs: readJson(store, LEGACY_KEYS.prefs),
      sessions: readJson(store, LEGACY_KEYS.sessions),
    });
    if (legacy.ok) return { data: legacy.data, migrated: true };
  }
  return null;
}

export function saveLibrary(store: KV, data: LibraryData): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(serializeLibrary(data)));
    return true;
  } catch {
    return false; // quota exceeded or storage disabled
  }
}

export function saveBackup(store: KV, data: LibraryData) {
  try {
    store.setItem(BACKUP_KEY, JSON.stringify(serializeLibrary(data)));
  } catch {
    /* backup is best-effort */
  }
}

export function loadBackup(store: KV): { data: LibraryData; exportedAt?: string } | null {
  const raw = readJson(store, BACKUP_KEY) ?? readJson(store, LEGACY_KEYS.backup);
  const parsed = parseLibrary(raw);
  if (!parsed.ok) return null;
  const r = raw as { exportedAt?: string; timestamp?: string };
  return { data: parsed.data, exportedAt: r.exportedAt ?? r.timestamp };
}

export function loadAiKey(store: KV): string {
  try {
    return store.getItem(AI_KEY_STORAGE) ?? store.getItem(LEGACY_KEYS.aiKey) ?? "";
  } catch {
    return "";
  }
}

export function saveAiKey(store: KV, key: string) {
  try {
    if (key) store.setItem(AI_KEY_STORAGE, key);
    else store.removeItem(AI_KEY_STORAGE);
    store.removeItem(LEGACY_KEYS.aiKey);
  } catch {
    /* ignore */
  }
}
