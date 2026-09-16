export type SiteRecord = {
  title: string;
  desc: string;
  domain: string;
  color: string;
  icon: string;
  category: string;
  favorite?: boolean;
  badge?: string;
  note?: string;
  tags?: string[];
  lastOpened?: number;
};

export type TileMode = 'standard' | 'icon' | 'list' | 'preview' | 'screenshot' | 'mobile';
export type VisualPreset = 'soft' | 'compact' | 'flat' | 'neon' | 'glass' | 'neumorphic' | 'layered' | 'aurora' | 'elevated';

export const TILE_MODES: TileMode[] = ['standard', 'icon', 'list', 'preview', 'screenshot', 'mobile'];
export const VISUAL_PRESETS: VisualPreset[] = ['soft', 'compact', 'flat', 'neon', 'glass', 'neumorphic', 'layered', 'aurora', 'elevated'];

export type Project = { id: string; name: string; color: string; icon: string; siteIds: string[]; parentId?: string; createdAt: number; updatedAt: number };

export type BrowserSession = { id: string; name: string; projectId?: string; siteIds: string[]; tags?: string[]; noteSiteIds?: string[]; createdAt: number; lastOpenedAt?: number };
