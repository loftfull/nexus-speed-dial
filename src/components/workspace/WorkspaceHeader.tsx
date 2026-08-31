import { Clock3, Filter, Grid2X2, LayoutGrid, List, Search, Settings2, Star } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './WorkspaceHeader.module.css';

const tabs = [
  ['quick', 'Быстрый доступ', LayoutGrid],
  ['recent', 'Недавние', Clock3],
  ['favorites', 'Избранное', Star],
] as const;

export function WorkspaceHeader() {
  const tab = useAppStore(state => state.workspaceTab);
  const setTab = useAppStore(state => state.setWorkspaceTab);
  const query = useAppStore(state => state.bookmarkQuery);
  const setQuery = useAppStore(state => state.setBookmarkQuery);
  const view = useAppStore(state => state.viewMode);
  const setView = useAppStore(state => state.setViewMode);
  const open = useAppStore(state => state.setSettingsOpen);

  return <>
    <div className={styles.head}>
      <div className={styles.tabs} aria-label="Раздел закладок">
        {tabs.map(([id, label, Icon]) => <button key={id} aria-label={label} className={tab === id ? styles.active : ''} onClick={() => setTab(id)}><Icon size={16}/><span className={styles.tabLabel}>{label}</span></button>)}
      </div>
      <div className={styles.tools}>
        <button aria-label="Сетка" className={view === 'grid' ? styles.active : ''} onClick={() => setView('grid')}><Grid2X2 size={17}/></button>
        <button aria-label="Список" className={view === 'list' ? styles.active : ''} onClick={() => setView('list')}><List size={18}/></button>
        <button aria-label="Настройки плиток" data-testid="settings-button" onClick={() => open(true)}><Settings2 size={18}/></button>
      </div>
    </div>
    <GlassSurface role="control" className={styles.search}>
      <Search size={18}/><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Поиск по закладкам"/><button aria-label="Фильтр"><Filter size={16}/></button>
    </GlassSurface>
  </>;
}
