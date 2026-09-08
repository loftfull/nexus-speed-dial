export type TilePreset = 'minimal' | 'standard' | 'expanded' | 'large' | 'list';
export type TileSize = 'S' | 'M' | 'L' | 'XL';

export type ContentMode = 'all' | 'favorites' | 'recent';
export type LayoutMode = 'grid' | 'list';
export type ThemeMode = 'system' | 'light' | 'dark';
export type InterfaceDensity = 'comfortable' | 'compact';
export type AppBackground = 'soft' | 'clean' | 'contrast';
export type GlassStrength = 'minimal' | 'standard' | 'strong';
export type SearchEngine = 'google' | 'yandex' | 'duckduckgo';

export interface UserPreferences {
  theme: ThemeMode;
  density: InterfaceDensity;
  background: AppBackground;
  glassStrength: GlassStrength;
  searchEngine: SearchEngine;
  globalSiteSearch: boolean;
  omniboxSuggestions: boolean;
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  position: number;
}

/** Legacy persisted backup-v1 shape. Runtime navigation uses Space only. */
export interface Project {
  id: string;
  name: string;
  icon: string;
  position?: number;
}

export interface Site {
  id: string;
  title: string;
  url: string;
  domain: string;
  /** Canonical Pure Speed Dial owner. */
  spaceId?: string;
  /** Legacy persisted owner retained for storage/backup migration only. */
  projectId: string;
  subtitle?: string;
  categoryId?: string;
  iconUrl?: string;
  favorite: boolean;
  badge?: string;
  position?: number;
}

export interface Category {
  id: string;
  name: string;
  /** Canonical Pure Speed Dial owner. */
  spaceId?: string;
  /** Legacy persisted owner retained for storage/backup migration only. */
  projectId: string;
  parentId?: string;
  icon: string;
  position?: number;
}

export interface HistoryEntry { id:string; siteId:string; openedAt:string; }
export interface StoredNote { id:string; title:string; body:string; projectId?:string; createdAt:string; updatedAt:string; }

export interface TileAppearanceSettings {
  preset:TilePreset; size:TileSize; columns:'auto'|number; width:number; height:number; gap:number; radius:number; iconSize:number;
  showTitle:boolean; showSubtitle:boolean; showDomain:boolean; showCategory:boolean; showBadge:boolean; labelAlignment:'left'|'center'|'right';
  glassOpacity:number; blur:number; saturation:number; borderEnabled:boolean; borderOpacity:number; borderHighlight:boolean;
  shadowEnabled:boolean; shadowOpacity:number; shadowSoftness:number; shadowDepth:number;
  backgroundMode:'transparent'|'neutral'|'tinted'; iconTreatment:'original'|'soft'|'transparent';
  hoverGlow:boolean; hoverGlowIntensity:number; selectedGlowIntensity:number; hoverEnabled:boolean; hoverLift:number; hoverScale:number; pressedScale:number;
  transitionMs:number; easing:'standard'|'soft'|'snappy'; loadAnimation:'none'|'fade'|'rise'; focusRingStyle:'minimal'|'standard'|'strong'; dragFeedback:boolean; reducedMotion:boolean;
}
