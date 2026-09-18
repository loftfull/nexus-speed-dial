import type { Category, Project, SiteGroup } from './types';

/** Palette used when a node carries no colour of its own. */
export const NODE_PALETTE = [
  '#3988ee', '#8b63e8', '#2aa879', '#e0851f', '#c9364f', '#0f8ab8', '#7a5cf0', '#d2622c',
];

/** Stable, order-independent index for an identifier. */
export function paletteIndex(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100_000;
  }
  return hash % NODE_PALETTE.length;
}

const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function projectColor(project: Pick<Project, 'id' | 'color'>): string {
  return hex.test(project.color ?? '') ? project.color : NODE_PALETTE[paletteIndex(project.id)];
}

/** Categories have no colour field, so the tint is derived from the identifier. */
export function categoryColor(category: Pick<Category, 'id'>): string {
  return NODE_PALETTE[paletteIndex(category.id)];
}

export function groupColor(group: Pick<SiteGroup, 'id'>): string {
  return NODE_PALETTE[paletteIndex(group.id)];
}
