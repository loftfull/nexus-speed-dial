import { useSyncExternalStore } from 'react';
import type { AppStoreState } from './appStore.ts';
import { appStore } from './browserStore.ts';

export function useAppStore<T>(selector: (state: AppStoreState) => T): T {
  return useSyncExternalStore(appStore.subscribe, () => selector(appStore.getState()), () => selector(appStore.getState()));
}
