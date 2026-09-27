import type { CollectionRules, Mode, Site, SortMode } from "../types";

export const ALL_PROJECTS = "All projects";
export const ALL_CATEGORIES = "All categories";
export const ALL_GROUPS = "All groups";

export type Filters = {
  mode: Mode;
  project: string;
  category: string;
  group: string;
  tag: string | null;
  collection: CollectionRules | null;
  sort: SortMode;
};

export function matchesCollection(site: Site, r: CollectionRules): boolean {
  if (r.onlyFavorites && !site.favorite) return false;
  if (r.onlyAiEnriched && !site.extractedAt) return false;
  if (r.minVisits && site.visits < r.minVisits) return false;
  if (r.project && site.project !== r.project) return false;
  if (r.tags?.length && !r.tags.some((t) => site.tags.includes(t))) return false;
  return true;
}

export function filterSites(sites: Site[], f: Filters): Site[] {
  const list = sites.filter((site) => {
    if (f.mode === "favorites" && !site.favorite) return false;
    if (f.mode === "recent" && !site.lastVisitedAt && site.visits < 1) return false;
    if (f.project !== ALL_PROJECTS && site.project !== f.project) return false;
    if (f.category !== ALL_CATEGORIES && site.category !== f.category) return false;
    if (f.group !== ALL_GROUPS && site.group !== f.group) return false;
    if (f.tag && !site.tags.includes(f.tag)) return false;
    if (f.collection && !matchesCollection(site, f.collection)) return false;
    return true;
  });
  // "Recent" is ordered by last open regardless of the sort preference.
  if (f.mode === "recent") {
    return list.sort((a, b) => (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? "") || b.visits - a.visits);
  }
  if (f.sort === "alphabetical") return list.sort((a, b) => a.title.localeCompare(b.title));
  if (f.sort === "mostVisited") return list.sort((a, b) => b.visits - a.visits);
  return list.sort((a, b) => a.order - b.order);
}

/**
 * Command-palette search: every whitespace-separated term must match title, host, description,
 * path or tags. Title-prefix hits rank first, then by visits.
 */
export function searchSites(sites: Site[], query: string, limit = 50): Site[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...sites].sort((a, b) => b.visits - a.visits).slice(0, limit);
  const scored: { site: Site; score: number }[] = [];
  for (const site of sites) {
    const title = site.title.toLowerCase();
    const hay = [title, site.url, site.description, site.project, site.category, site.group, ...site.tags]
      .join(" ")
      .toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    const score = (title.startsWith(terms[0]) ? 2 : title.includes(terms[0]) ? 1 : 0) * 1000 + site.visits;
    scored.push({ site, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.site);
}

/** Moves `sourceId` to the position of `targetId` in manual order and renumbers 1..n. */
export function reorder(sites: Site[], sourceId: string, targetId: string): Site[] {
  if (sourceId === targetId) return sites;
  const sorted = [...sites].sort((a, b) => a.order - b.order);
  const from = sorted.findIndex((s) => s.id === sourceId);
  const to = sorted.findIndex((s) => s.id === targetId);
  if (from < 0 || to < 0) return sites;
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  return sorted.map((s, i) => ({ ...s, order: i + 1 }));
}
