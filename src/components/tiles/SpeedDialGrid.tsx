import { Plus } from 'lucide-react';
import { selectWorkspaceSites } from '../../domain/workspace.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { SiteTile } from './SiteTile.tsx';
import styles from './SpeedDialGrid.module.css';

export function SpeedDialGrid() {
  const sitesAll = useAppStore(state => state.sites);
  const categories = useAppStore(state => state.categories);
  const history = useAppStore(state => state.history);
  const query = useAppStore(state => state.bookmarkQuery);
  const tab = useAppStore(state => state.workspaceTab);
  const view = useAppStore(state => state.viewMode);
  const preset = useAppStore(state => state.tileSettings.preset);
  const projectId = useAppStore(state => state.activeProjectId);
  const categoryId = useAppStore(state => state.activeCategoryId);
  const setSiteEditor = useAppStore(state => state.setSiteEditor);

  const sites = selectWorkspaceSites({
    sites: sitesAll,
    categories,
    history,
    projectId,
    categoryId,
    tab,
    query,
  });
  const mode = view === 'list' ? 'list' : preset;

  return <>
    <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`} data-testid="speed-grid">
      {sites.map(site => <SiteTile key={site.id} site={site} mode={mode}/>)}
      {tab === 'quick' && <button className={`${styles.addTile} ${view === 'list' ? styles.addList : ''}`} onClick={() => setSiteEditor('new')}><Plus size={20}/><span>Добавить сайт</span></button>}
    </div>
    {sites.length === 0 && tab === 'recent' && <div className={styles.empty}>Недавних сайтов пока нет</div>}
  </>;
}
