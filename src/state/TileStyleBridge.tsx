import { useEffect } from 'react';
import { useAppStore } from './useAppStore.ts';
import { applyTileCssVariables } from './tileStyle.ts';

export function TileStyleBridge() {
  const settings = useAppStore(state => state.tileSettings);
  useEffect(() => { applyTileCssVariables(document.documentElement.style, settings); }, [settings]);
  return null;
}
