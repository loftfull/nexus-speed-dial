export type TilePreset = 'minimal' | 'standard' | 'expanded' | 'large' | 'list';
export type TileSize = 'S' | 'M' | 'L' | 'XL';
export type AppSection = 'home' | 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings';
export type WorkspaceTab = 'quick' | 'recent' | 'favorites';
export type ViewMode = 'grid' | 'list';

export interface Site {
  id: string;
  title: string;
  url: string;
  domain: string;
  projectId: string;
  subtitle?: string;
  categoryId?: string;
  iconUrl?: string;
  favorite: boolean;
  badge?: string;
}

export interface Project { id: string; name: string; icon: string; }
export interface Category { id: string; name: string; projectId: string; parentId?: string; icon: string; }

export interface TileAppearanceSettings {
  preset: TilePreset;
  size: TileSize;
  columns: 'auto' | number;
  width: number;
  height: number;
  gap: number;
  radius: number;
  iconSize: number;
  showTitle: boolean;
  showSubtitle: boolean;
  showDomain: boolean;
  showCategory: boolean;
  showBadge: boolean;
  glassOpacity: number;
  blur: number;
  saturation: number;
  borderOpacity: number;
  shadowEnabled: boolean;
  shadowOpacity: number;
  hoverGlow: boolean;
  hoverGlowIntensity: number;
  selectedGlowIntensity: number;
  hoverEnabled: boolean;
  hoverLift: number;
  hoverScale: number;
  pressedScale: number;
  transitionMs: number;
  easing: 'standard' | 'soft' | 'snappy';
  reducedMotion: boolean;
}
