export type TilePreset = 'minimal' | 'standard' | 'expanded' | 'large' | 'list';
export type TileSize = 'S' | 'M' | 'L' | 'XL';

/** Canonical Pure Speed Dial content modes. */
export type ContentMode = 'all' | 'favorites' | 'recent';
export type LayoutMode = 'grid' | 'list';

/** @deprecated Transitional compatibility until the one-screen refactor is complete. */
export type AppSection = 'home' | 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings';
/** @deprecated Use ContentMode. */
export type WorkspaceTab = 'quick' | 'recent' | 'favorites';
/** @deprecated Use LayoutMode. */
export type ViewMode = LayoutMode;

export interface Space {
  id: string;
  name: string;
  icon: string;
  position: number;
}

/** @deprecated Persisted legacy shape; normalized to Space by the store migration. */
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
  /** @deprecated Legacy persisted owner used during migration. */
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
  /** @deprecated Legacy persisted owner used during migration. */
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
