import { describe, expect, it } from "vitest";
import { AI_KEY_STORAGE, LEGACY_KEYS, STORAGE_KEY, loadAiKey, loadBackup, loadLibrary, saveAiKey, saveLibrary } from "../storage";
import { defaultCollections, defaultPrefs } from "../schema";

function memory(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const legacySite = { id: "a", title: "A", url: "https://a.dev", description: "", project: "P", category: "C", group: "G", tags: [], favorite: true, visits: 3, order: 1 };

describe("storage", () => {
  it("returns null on a fresh browser so the app can seed demo data", () => {
    expect(loadLibrary(memory())).toBeNull();
  });

  it("migrates Navigator 2.0 keys", () => {
    const store = memory({
      [LEGACY_KEYS.sites]: JSON.stringify([legacySite]),
      [LEGACY_KEYS.prefs]: JSON.stringify({ theme: "macNight" }),
    });
    const r = loadLibrary(store);
    expect(r?.migrated).toBe(true);
    expect(r?.data.sites[0].id).toBe("a");
    expect(r?.data.prefs.theme).toBe("macNight");
  });

  it("round-trips the current format and keeps an intentionally empty library", () => {
    const store = memory();
    saveLibrary(store, { sites: [], prefs: defaultPrefs, sessions: [], collections: defaultCollections });
    const r = loadLibrary(store);
    expect(r?.migrated).toBe(false);
    expect(r?.data.sites).toEqual([]);
  });

  it("falls back to legacy keys when the current key is corrupted", () => {
    const store = memory({ [STORAGE_KEY]: "{broken", [LEGACY_KEYS.sites]: JSON.stringify([legacySite]) });
    expect(loadLibrary(store)?.data.sites).toHaveLength(1);
  });

  it("reports failed writes instead of throwing", () => {
    const store = { ...memory(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(saveLibrary(store, { sites: [], prefs: defaultPrefs, sessions: [], collections: [] })).toBe(false);
  });

  it("reads the 2.0 backup format ({ timestamp })", () => {
    const store = memory({ [LEGACY_KEYS.backup]: JSON.stringify({ version: 2, timestamp: "2024-01-15T00:00:00Z", sites: [legacySite] }) });
    const b = loadBackup(store);
    expect(b?.exportedAt).toBe("2024-01-15T00:00:00Z");
    expect(b?.data.sites).toHaveLength(1);
  });

  it("moves the AI key off the legacy storage key", () => {
    const store = memory({ [LEGACY_KEYS.aiKey]: "sk-old" });
    expect(loadAiKey(store)).toBe("sk-old");
    saveAiKey(store, "sk-old");
    expect(store.dump()).toEqual({ [AI_KEY_STORAGE]: "sk-old" });
    saveAiKey(store, "");
    expect(store.dump()).toEqual({});
  });
});
