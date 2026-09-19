export type SiteRecord = {
  /** Persisted identity; legacy records may omit it and are migrated on load. */
  id?: string;
  title: string;
  desc: string;
  /** Display hostname kept separate from the exact destination. */
  domain: string;
  /** Exact http(s) destination. Legacy records may omit it and fall back to domain. */
  url?: string;
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
/**
 * Готовые виды плитки. Первые девять — собственный набор приложения;
 * последние три собраны по опубликованным спецификациям чужих систем
 * (см. docs/design-styles.md) и включаются только выбором пользователя.
 */
export type VisualPreset =
  | 'soft' | 'compact' | 'flat' | 'outline' | 'floating'
  | 'aurora' | 'sand' | 'contrast' | 'accent'
  | 'glass' | 'neumorph' | 'material';

export const TILE_MODES: TileMode[] = ['standard', 'icon', 'list', 'preview', 'screenshot', 'mobile'];
export const VISUAL_PRESETS: VisualPreset[] = [
  'soft', 'compact', 'flat', 'outline', 'floating', 'aurora', 'sand', 'contrast', 'accent',
  'glass', 'neumorph', 'material',
];

/** Workspace → Category → Group is the navigation hierarchy. */
export type Category = { id: string; name: string; projectId: string; icon?: string };
export type SiteGroup = { id: string; name: string; categoryId: string; icon?: string };

export type Project = { id: string; name: string; color: string; icon: string; siteIds: string[]; parentId?: string; createdAt: number; updatedAt: number };

export type BrowserSession = { id: string; name: string; projectId?: string; siteIds: string[]; tags?: string[]; noteSiteIds?: string[]; createdAt: number; lastOpenedAt?: number };
