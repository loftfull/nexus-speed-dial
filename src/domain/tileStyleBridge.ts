import type { TileMode, VisualPreset } from './types';

export type TileStyleState = { mode: TileMode; preset: VisualPreset; density: number; radius?: number; iconSize?: number; hover?: string; shadow?: string; font?: string; size?: string };

export function applyTileStyle(state: TileStyleState, root: HTMLElement = document.documentElement): void {
  root.dataset.tileMode = state.mode;
  root.dataset.tilePreset = state.preset;
  root.dataset.tileSize = ['S', 'M', 'L', 'XL'].includes(state.size ?? '') ? state.size as string : 'M';
  root.style.setProperty('--tile-gap', `${Math.max(4, state.density)}px`);
  if (state.radius !== undefined) { root.style.setProperty('--tile-radius', `${Math.max(8, state.radius)}px`); root.style.setProperty('--tile-radius-value', `${Math.max(8, state.radius)}px`); }
  if (state.iconSize !== undefined) root.style.setProperty('--tile-icon-size', `${Math.max(24, state.iconSize)}px`);
  if (state.hover) root.dataset.tileHover = state.hover;
  if (state.shadow) root.dataset.tileShadow = state.shadow;
  if (state.font) root.style.setProperty('--app-font', state.font); 
}
