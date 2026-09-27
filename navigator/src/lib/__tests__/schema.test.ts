import { describe, expect, it } from "vitest";
import { MAX_IMPORT_SITES, SCHEMA_VERSION, defaultCollections, parseLibrary, sanitizePrefs } from "../schema";

const site = (over: Record<string, unknown> = {}) => ({
  id: "a", title: "A", url: "https://a.dev", description: "", project: "Work", category: "Eng", group: "FE",
  tags: ["x"], favorite: false, visits: 1, order: 1, ...over,
});

describe("parseLibrary", () => {
  it("accepts a Navigator 2.0 export and adds default collections", () => {
    const r = parseLibrary({ version: 2, sites: [site()], prefs: { theme: "macNight" }, sessions: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fromVersion).toBe(2);
    expect(r.data.sites).toHaveLength(1);
    expect(r.data.prefs.theme).toBe("macNight");
    expect(r.data.collections).toEqual(defaultCollections);
  });

  it("accepts a bare array of sites", () => {
    const r = parseLibrary([site(), site({ id: "b", url: "https://b.dev" })]);
    expect(r.ok && r.data.sites.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("skips records without an http(s) URL and reports them", () => {
    const r = parseLibrary({ sites: [site(), site({ id: "bad", url: "javascript:alert(1)" }), "junk", site({ id: "c", url: "" })] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sites.map((s) => s.id)).toEqual(["a"]);
    expect(r.skipped).toBe(3);
  });

  it("re-issues duplicate ids", () => {
    const r = parseLibrary({ sites: [site(), site({ url: "https://b.dev" })] });
    if (!r.ok) throw new Error(r.error);
    const [a, b] = r.data.sites;
    expect(a.id).toBe("a");
    expect(b.id).not.toBe("a");
  });

  it("fills defaults for missing fields", () => {
    const r = parseLibrary({ sites: [{ url: "https://c.dev" }] });
    if (!r.ok) throw new Error(r.error);
    expect(r.data.sites[0]).toMatchObject({ title: "c.dev", project: "General", tags: [], favorite: false, visits: 0, order: 1 });
    expect(typeof r.data.sites[0].id).toBe("string");
  });

  it("drops session ids that point to missing sites", () => {
    const r = parseLibrary({ sites: [site()], sessions: [{ id: "s", name: "S", siteIds: ["a", "gone"], createdAt: "x" }] });
    expect(r.ok && r.data.sessions[0].siteIds).toEqual(["a"]);
  });

  it("rejects non-objects, missing sites, newer versions and oversized imports", () => {
    expect(parseLibrary("nope").ok).toBe(false);
    expect(parseLibrary({ version: 2 }).ok).toBe(false);
    expect(parseLibrary({ version: SCHEMA_VERSION + 1, sites: [] }).ok).toBe(false);
    const many = Array.from({ length: MAX_IMPORT_SITES + 1 }, (_, i) => site({ id: String(i) }));
    expect(parseLibrary({ sites: many }).ok).toBe(false);
  });

  it("renumbers order as 1..n keeping manual order", () => {
    const r = parseLibrary({ sites: [site({ id: "x", order: 10 }), site({ id: "y", url: "https://y.dev", order: 2 })] });
    expect(r.ok && r.data.sites.map((s) => [s.id, s.order])).toEqual([["y", 1], ["x", 2]]);
  });
});

describe("sanitizePrefs", () => {
  it("maps the unrendered v2 'table' view to 'list' and drops unknown values", () => {
    const p = sanitizePrefs({ view: "table", columns: 7, theme: "neon", iconSize: 500, automotiveMode: true });
    expect(p.view).toBe("list");
    expect(p.columns).toBe(2);
    expect(p.theme).toBe("macLight");
    expect(p.iconSize).toBe(72);
    expect("automotiveMode" in p).toBe(false);
  });
});
