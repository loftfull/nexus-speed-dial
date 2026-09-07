import { useEffect } from 'react';
import { useAppStore } from './useAppStore.ts';

export function PreferencesBridge() {
  const preferences = useAppStore(state => state.preferences);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.dataset.density = preferences.density;
    root.dataset.background = preferences.background;
    root.dataset.glass = preferences.glassStrength;
  }, [preferences]);

  return null;
}
