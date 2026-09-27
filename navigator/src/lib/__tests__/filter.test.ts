import { describe, expect, it } from "vitest";
import type { Site } from "../../types";
import { ALL_CATEGORIES, ALL_GROUPS, ALL_PROJECTS, type Filters, filterSites, matchesCollection, reorder, searchSites } from "../filter";

const mk = (id: string, over: Partial<Site> = {}): Site => ({
  id, title: id.toUpperCase(), url: `https://${id}.dev`, description: "", project: "Work", category: "Eng", group: "FE",
  tags: [], favorite: false, visits: 0, order: 1, ...over,
});

const base: Filters = { mode: "all", project: ALL_PROJECTS, category: ALL_CATEGORIES, group: ALL_GROUPS, tag: null, collection: null, sort: "manual" };

const sites = [
  mk("a", { order: 3, favorite: true, visits: 5, tags: ["dev"] }),
  mk("b", { order: 1, project: "Home", tags: ["news"], lastVisitedAt: "2026-09-01T00:00:00Z", visits: 1 }),
  mk("c", { order: 2, extractedAt: "2026-01-01", visits: 9, lastVisitedAt: "2026-09-20T00:00:00Z", tags: ["dev", "ai"] }),
];

describe("filterSites", () => {
  it("sorts manually by order", () => {
    expect(filterSites(sites, base).map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by tag", () => {
    expect(filterSites(sites, { ...base, tag: "dev" }).map((s) => s.id)).toEqual(["c", "a"]);
  });

  it("applies the active smart collection (was ignored in 2.0)", () => {
    expect(filterSites(sites, { ...base, collection: { onlyAiEnriched: true } }).map((s) => s.id)).toEqual(["c"]);
  });

  it("orders Recent by last open time", () => {
    expect(filterSites(sites, { ...base, mode: "recent" }).map((s) => s.id)).toEqual(["c", "b", "a"]);
  });

  it("combines project and favorites", () => {
    expect(filterSites(sites, { ...base, mode: "favorites", project: "Work" }).map((s) => s.id)).toEqual(["a"]);
  });
});

describe("matchesCollection", () => {
  it("honours tags and project rules", () => {
    expect(matchesCollection(sites[1], { tags: ["news", "x"] })).toBe(true);
    expect(matchesCollection(sites[1], { tags: ["dev"] })).toBe(false);
    expect(matchesCollection(sites[1], { project: "Work" })).toBe(false);
    expect(matchesCollection(sites[0], { minVisits: 5, onlyFavorites: true })).toBe(true);
  });
});

describe("searchSites", () => {
  it("requires every term and ranks title-prefix matches first", () => {
    const list = [mk("git", { title: "Tools", tags: ["github"] }), mk("hub", { title: "GitHub", visits: 0 })];
    expect(searchSites(list, "git").map((s) => s.id)).toEqual(["hub", "git"]);
    expect(searchSites(list, "git tools").map((s) => s.id)).toEqual(["git"]);
    expect(searchSites(list, "zzz")).toEqual([]);
  });

  it("returns most visited first for an empty query", () => {
    expect(searchSites(sites, "  ").map((s) => s.id)).toEqual(["c", "a", "b"]);
  });
});

describe("reorder", () => {
  it("moves a site to the target position and renumbers", () => {
    expect(reorder(sites, "a", "b").map((s) => [s.id, s.order])).toEqual([["a", 1], ["b", 2], ["c", 3]]);
  });
  it("is a no-op for unknown ids", () => {
    expect(reorder(sites, "a", "zzz")).toBe(sites);
  });
});
