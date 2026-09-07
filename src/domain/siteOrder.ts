import type { Site } from './types.ts';

const canonical = (sites: Site[]) => [...sites].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));

export function reorderVisibleSites(allSpaceSites: Site[], visibleIds: string[], draggedId: string, targetId: string): Site[] {
  const ordered = canonical(allSpaceSites);
  if (draggedId === targetId) return ordered.map((site, position) => ({ ...site, position }));

  const visibleSet = new Set(visibleIds);
  if (!visibleSet.has(draggedId) || !visibleSet.has(targetId)) return ordered.map((site, position) => ({ ...site, position }));

  const visibleOrder = ordered.filter(site => visibleSet.has(site.id)).map(site => site.id);
  const from = visibleOrder.indexOf(draggedId);
  const to = visibleOrder.indexOf(targetId);
  if (from < 0 || to < 0) return ordered.map((site, position) => ({ ...site, position }));

  visibleOrder.splice(from, 1);
  visibleOrder.splice(to, 0, draggedId);

  const byId = new Map(ordered.map(site => [site.id, site]));
  let visibleIndex = 0;
  const next = ordered.map(site => visibleSet.has(site.id) ? byId.get(visibleOrder[visibleIndex++]) ?? site : site);
  return next.map((site, position) => ({ ...site, position }));
}
