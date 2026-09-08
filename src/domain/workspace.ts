import type { Category, ContentMode, HistoryEntry, Site } from './types.ts';

export interface WorkspaceSelectionInput {
  sites: Site[];
  categories: Category[];
  history: HistoryEntry[];
  spaceId: string;
  categoryId: string | null;
  mode: ContentMode;
  query?: string;
}

const siteSpaceId = (site: Site) => site.spaceId ?? site.projectId;
const categorySpaceId = (category: Category) => category.spaceId ?? category.projectId;

function canonicalOrder(sites: Site[]): Site[] {
  return sites
    .map((site, index) => ({ site, index }))
    .sort((a, b) => (a.site.position ?? a.index) - (b.site.position ?? b.index) || a.index - b.index)
    .map(item => item.site);
}

export function selectWorkspaceSites(input: WorkspaceSelectionInput): Site[] {
  const query = input.query?.trim().toLowerCase() ?? '';
  let result = input.sites.filter(site => siteSpaceId(site) === input.spaceId);

  if (input.categoryId) {
    const childIds = input.categories
      .filter(category => categorySpaceId(category) === input.spaceId && category.parentId === input.categoryId)
      .map(category => category.id);
    const allowed = new Set([input.categoryId, ...childIds]);
    result = result.filter(site => site.categoryId && allowed.has(site.categoryId));
  }

  if (input.mode === 'favorites') result = result.filter(site => site.favorite);
  if (query) result = result.filter(site => `${site.title} ${site.subtitle ?? ''} ${site.domain}`.toLowerCase().includes(query));

  if (input.mode === 'recent') {
    const byId = new Map(result.map(site => [site.id, site]));
    const seen = new Set<string>();
    const ordered: Site[] = [];
    for (const visit of input.history) {
      if (seen.has(visit.siteId)) continue;
      const site = byId.get(visit.siteId);
      if (!site) continue;
      seen.add(visit.siteId);
      ordered.push(site);
    }
    return ordered;
  }

  return canonicalOrder(result);
}
