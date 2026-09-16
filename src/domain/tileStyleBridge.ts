import type { TileMode, VisualPreset } from './types';

export type TileStyleState = { mode: TileMode; preset: VisualPreset; density: number; radius?: number };

export function applyTileStyle(state: TileStyleState, root: HTMLElement = document.documentElement): void {
  root.dataset.tileMode = state.mode;
  root.dataset.tilePreset = state.preset;
  root.style.setProperty('--tile-gap', `${Math.max(4, state.density)}px`);
  if (state.radius !== undefined) root.style.setProperty('--tile-radius', `${Math.max(8, state.radius)}px`);
}
