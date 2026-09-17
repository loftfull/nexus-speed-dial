import type { Category, SiteGroup, Project, SiteRecord } from './types';

const slug = (value: string) => value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, '');

export function makeCategoryId(name: string, projectId: string) {
  return `cat-${projectId}-${slug(name) || 'x'}`;
}

export function makeGroupId(name: string, categoryId: string) {
  return `grp-${categoryId}-${slug(name) || 'x'}`;
}

/**
 * Legacy state kept categories as a flat `string[]` and sites referenced them by
 * name. Rebuild that as Project → Category → Group, attaching orphan categories
 * to the first project so nothing is lost.
 */
export function migrateHierarchy(input: {
  projects: Project[];
  categories: unknown;
  groups: unknown;
  sites: SiteRecord[];
}): { categories: Category[]; groups: SiteGroup[]; sites: SiteRecord[] } {
  const fallbackProjectId = input.projects[0]?.id ?? 'project-0';
  const raw = Array.isArray(input.categories) ? input.categories : [];

  const categories: Category[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const id = makeCategoryId(entry, fallbackProjectId);
      if (seen.has(id)) continue;
      seen.add(id);
      categories.push({ id, name: entry, projectId: fallbackProjectId });
    } else if (entry && typeof entry === 'object') {
      const item = entry as Partial<Category>;
      if (!item.name) continue;
      const projectId = item.projectId && input.projects.some(p => p.id === item.projectId) ? item.projectId : fallbackProjectId;
      const id = item.id || makeCategoryId(item.name, projectId);
      if (seen.has(id)) continue;
      seen.add(id);
      categories.push({ id, name: item.name, projectId, icon: item.icon });
    }
  }

  const byName = new Map(categories.map(category => [category.name, category]));
  for (const site of input.sites) {
    if (site.categoryId && categories.some(category => category.id === site.categoryId)) continue;
    const name = site.category?.trim();
    if (!name) continue;
    if (!byName.has(name)) {
      const id = makeCategoryId(name, fallbackProjectId);
      const created: Category = { id, name, projectId: fallbackProjectId };
      categories.push(created);
      byName.set(name, created);
    }
  }

  const groups: SiteGroup[] = (Array.isArray(input.groups) ? input.groups : [])
    .filter((entry): entry is SiteGroup => Boolean(entry && typeof entry === 'object' && (entry as SiteGroup).name))
    .map(entry => ({ ...entry, id: entry.id || makeGroupId(entry.name, entry.categoryId) }))
    .filter(group => categories.some(category => category.id === group.categoryId));

  const sites = input.sites.map(site => {
    const category = site.categoryId
      ? categories.find(item => item.id === site.categoryId)
      : byName.get(site.category?.trim() ?? '');
    const groupId = site.groupId && groups.some(group => group.id === site.groupId && group.categoryId === category?.id)
      ? site.groupId
      : undefined;
    return category
      ? { ...site, categoryId: category.id, category: category.name, groupId }
      : { ...site, groupId };
  });

  return { categories, groups, sites };
}

export const categoriesOfProject = (categories: Category[], projectId?: string) =>
  projectId ? categories.filter(category => category.projectId === projectId) : categories;

export const groupsOfCategory = (groups: SiteGroup[], categoryId: string) =>
  groups.filter(group => group.categoryId === categoryId);

export const sitesOfCategory = (sites: SiteRecord[], categoryId: string) =>
  sites.filter(site => site.categoryId === categoryId);

export const sitesOfGroup = (sites: SiteRecord[], groupId: string) =>
  sites.filter(site => site.groupId === groupId);
