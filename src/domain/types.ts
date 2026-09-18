export type SiteRecord = {
  /** Persisted identity; legacy records may omit it and are migrated on load. */
  id?: string;
  title: string;
  desc: string;
  domain: string;
  color: string;
  icon: string;
  /** Denormalised category name, kept for import/export round-trips. */
  category: string;
  /** Owning category. Legacy records are migrated from `category` on load. */
  categoryId?: string;
  /** Optional group inside the category. */
  groupId?: string;
  favorite?: boolean;
  note?: string;
  tags?: string[];
  lastOpened?: number;
  screenshotUrl?: string;
};

export type TileMode = 'standard' | 'icon' | 'list' | 'preview' | 'screenshot' | 'mobile';
export type VisualPreset = 'soft' | 'compact' | 'flat' | 'neon' | 'glass' | 'neumorphic' | 'layered' | 'aurora' | 'elevated';

export const TILE_MODES: TileMode[] = ['standard', 'icon', 'list', 'preview', 'screenshot', 'mobile'];
export const VISUAL_PRESETS: VisualPreset[] = ['soft', 'compact', 'flat', 'neon', 'glass', 'neumorphic', 'layered', 'aurora', 'elevated'];

/** Workspace → Category → Group is the navigation hierarchy. */
export type Category = { id: string; name: string; projectId: string; icon?: string };
export type SiteGroup = { id: string; name: string; categoryId: string; icon?: string };

export type Project = { id: string; name: string; color: string; icon: string; siteIds: string[]; parentId?: string; createdAt: number; updatedAt: number };

export type BrowserSession = { id: string; name: string; projectId?: string; siteIds: string[]; tags?: string[]; noteSiteIds?: string[]; createdAt: number; lastOpenedAt?: number };
