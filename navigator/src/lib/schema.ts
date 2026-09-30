import type { LibraryData, Prefs, Session, Site, SmartCollection } from "../types";
import { uid } from "../utils/helpers";

/**
 * Version of the persisted/exported library format.
 * v2 — export format of Navigator 2.0 ({ version: 2, sites, prefs, sessions }).
 * v3 — adds `collections` and `Site.lastVisitedAt`; everything lives under one storage key.
 */
export const SCHEMA_VERSION = 3;

/** Hard limit from the README: larger imports are rejected to keep the UI responsive. */
export const MAX_IMPORT_SITES = 1000;

export const defaultPrefs: Prefs = {
  view: "cards",
  columns: 3,
  iconSize: 44,
  showScreenshot: true,
  sort: "manual",
  theme: "macLight",
  accent: "blue",
  density: "compact",
  focusMode: false,
  showDock: true,
};

export const defaultCollections: SmartCollection[] = [
  { id: "col-favorites", name: "Favorites", rules: { onlyFavorites: true } },
  { id: "col-ai", name: "AI Enriched", rules: { onlyAiEnriched: true } },
];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const oneOf = <T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns a normalized site, or null when the record is unusable (no http(s) URL). */
export function sanitizeSite(raw: unknown, index: number): Site | null {
  if (!isObj(raw)) return null;
  const url = str(raw.url).trim();
  if (!isHttpUrl(url)) return null;
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string" && !!t.trim()) : [];
  return {
    id: optStr(raw.id) ?? uid(),
    title: str(raw.title).trim() || new URL(url).hostname,
    url,
    description: str(raw.description),
    longDescription: optStr(raw.longDescription),
    project: str(raw.project).trim() || "General",
    category: str(raw.category).trim() || "General",
    group: str(raw.group).trim() || "General",
    tags,
    icon: optStr(raw.icon),
    screenshot: optStr(raw.screenshot),
    extractedAt: optStr(raw.extractedAt),
    favorite: raw.favorite === true,
    visits: Math.max(0, Math.floor(num(raw.visits, 0))),
    lastVisitedAt: optStr(raw.lastVisitedAt),
    order: num(raw.order, index + 1),
  };
}

export function sanitizePrefs(raw: unknown): Prefs {
  const p = isObj(raw) ? raw : {};
  const legacyView = p.view === "table" ? "list" : p.view; // v2 had an unrendered "table" view
  return {
    view: oneOf(legacyView, ["cards", "icons", "list"] as const, defaultPrefs.view),
    columns: oneOf(p.columns, [2, 3, 4, 5] as const, defaultPrefs.columns),
    iconSize: Math.min(72, Math.max(24, num(p.iconSize, defaultPrefs.iconSize))),
    showScreenshot: typeof p.showScreenshot === "boolean" ? p.showScreenshot : defaultPrefs.showScreenshot,
    sort: oneOf(p.sort, ["manual", "alphabetical", "mostVisited"] as const, defaultPrefs.sort),
    theme: oneOf(p.theme, ["macLight", "macNight", "autoContrast"] as const, defaultPrefs.theme),
    accent: oneOf(p.accent, ["blue", "indigo", "violet", "teal", "rose", "amber"] as const, defaultPrefs.accent),
    density: oneOf(p.density, ["comfortable", "compact"] as const, defaultPrefs.density),
    focusMode: typeof p.focusMode === "boolean" ? p.focusMode : defaultPrefs.focusMode,
    showDock: typeof p.showDock === "boolean" ? p.showDock : defaultPrefs.showDock,
  };
}

function sanitizeSessions(raw: unknown, siteIds: Set<string>): Session[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): Session[] => {
    if (!isObj(s) || !str(s.name).trim() || !Array.isArray(s.siteIds)) return [];
    return [{
      id: optStr(s.id) ?? uid(),
      name: str(s.name).trim(),
      siteIds: s.siteIds.filter((id): id is string => typeof id === "string" && siteIds.has(id)),
      createdAt: str(s.createdAt) || new Date().toISOString(),
    }];
  });
}

function sanitizeCollections(raw: unknown): SmartCollection[] {
  if (!Array.isArray(raw)) return defaultCollections;
  return raw.flatMap((c): SmartCollection[] => {
    if (!isObj(c) || !str(c.name).trim()) return [];
    const r = isObj(c.rules) ? c.rules : {};
    const rules: SmartCollection["rules"] = {};
    if (Array.isArray(r.tags)) {
      const tags = r.tags.filter((t): t is string => typeof t === "string" && !!t);
      if (tags.length) rules.tags = tags;
    }
    if (optStr(r.project)) rules.project = str(r.project);
    if (r.onlyFavorites === true) rules.onlyFavorites = true;
    if (r.onlyAiEnriched === true) rules.onlyAiEnriched = true;
    if (num(r.minVisits, 0) > 0) rules.minVisits = num(r.minVisits, 0);
    return [{ id: optStr(c.id) ?? uid(), name: str(c.name).trim(), rules }];
  });
}

export type ParseResult =
  | { ok: true; data: LibraryData; skipped: number; fromVersion: number }
  | { ok: false; error: string };

/**
 * Validates and migrates any supported payload (v2 export, v3 export, or a bare array of sites).
 * Invalid site records are skipped and counted; duplicate ids are re-issued.
 */
export function parseLibrary(raw: unknown): ParseResult {
  const payload: Obj | null = Array.isArray(raw) ? { version: 1, sites: raw } : isObj(raw) ? raw : null;
  if (!payload) return { ok: false, error: "File is not a Nexus export (expected a JSON object)." };

  const fromVersion = num(payload.version, 2);
  if (fromVersion > SCHEMA_VERSION) {
    return { ok: false, error: `Export version ${fromVersion} is newer than supported version ${SCHEMA_VERSION}.` };
  }
  if (!Array.isArray(payload.sites)) return { ok: false, error: "Export has no \"sites\" array." };
  if (payload.sites.length > MAX_IMPORT_SITES) {
    return { ok: false, error: `Too many sites (${payload.sites.length}). The limit is ${MAX_IMPORT_SITES} per import.` };
  }

  const seen = new Set<string>();
  const sites: Site[] = [];
  payload.sites.forEach((s, i) => {
    const site = sanitizeSite(s, i);
    if (!site) return;
    if (seen.has(site.id)) site.id = uid();
    seen.add(site.id);
    sites.push(site);
  });

  return {
    ok: true,
    fromVersion,
    skipped: payload.sites.length - sites.length,
    data: {
      sites: normalizeOrder(sites),
      prefs: sanitizePrefs(payload.prefs),
      sessions: sanitizeSessions(payload.sessions, seen),
      collections: sanitizeCollections(payload.collections),
    },
  };
}

/** Re-numbers `order` as 1..n preserving the current manual order. */
export function normalizeOrder(sites: Site[]): Site[] {
  return [...sites].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i + 1 }));
}

export function serializeLibrary(data: LibraryData) {
  return { version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...data };
}
