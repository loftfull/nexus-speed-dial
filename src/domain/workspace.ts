import type { Category, HistoryEntry, Site, WorkspaceTab } from './types.ts';

interface WorkspaceSelectionInput {
  sites: Site[];
  categories: Category[];
  history: HistoryEntry[];
  projectId: string;
  categoryId: string | null;
  tab: WorkspaceTab;
  query: string;
}

export function selectWorkspaceSites(input: WorkspaceSelectionInput): Site[] {
  const query = input.query.trim().toLowerCase();
  let result = input.sites.filter(site => site.projectId === input.projectId);

  if (input.categoryId) {
    const childIds = input.categories
      .filter(category => category.projectId === input.projectId && category.parentId === input.categoryId)
      .map(category => category.id);
    const allowed = new Set([input.categoryId, ...childIds]);
    result = result.filter(site => site.categoryId && allowed.has(site.categoryId));
  }

  if (input.tab === 'favorites') result = result.filter(site => site.favorite);
  if (query) result = result.filter(site => `${site.title} ${site.subtitle ?? ''} ${site.domain}`.toLowerCase().includes(query));

  if (input.tab === 'recent') {
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

  return result;
}
