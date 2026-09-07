import { Plus } from 'lucide-react';
import { selectWorkspaceSites } from '../../domain/workspace.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { SiteTile } from './SiteTile.tsx';
import styles from './SpeedDialGrid.module.css';

export function SpeedDialGrid() {
  const sitesAll = useAppStore(state => state.sites);
  const categories = useAppStore(state => state.categories);
  const history = useAppStore(state => state.history);
  const contentMode = useAppStore(state => state.contentMode);
  const layoutMode = useAppStore(state => state.layoutMode);
  const preset = useAppStore(state => state.tileSettings.preset);
  const spaceId = useAppStore(state => state.activeSpaceId);
  const categoryId = useAppStore(state => state.activeCategoryId);
  const setSiteEditor = useAppStore(state => state.setSiteEditor);

  const sites = selectWorkspaceSites({ sites: sitesAll, categories, history, spaceId, categoryId, mode: contentMode });
  const tileMode = layoutMode === 'list' ? 'list' : preset;
  const emptyCopy = contentMode === 'favorites' ? 'В этой области нет избранных сайтов' : contentMode === 'recent' ? 'Недавних сайтов пока нет' : 'В этой категории пока нет сайтов';

  return <>
    <div className={`${styles.grid} ${layoutMode === 'list' ? styles.list : ''}`} data-testid="speed-grid">
      {sites.map(site => <SiteTile key={site.id} site={site} mode={tileMode}/>)}
      {contentMode === 'all' && <button className={`${styles.addTile} ${layoutMode === 'list' ? styles.addList : ''}`} onClick={() => setSiteEditor('new')}><Plus size={20}/><span>Добавить сайт</span></button>}
    </div>
    {sites.length === 0 && contentMode !== 'all' && <div className={styles.empty}>{emptyCopy}</div>}
  </>;
}
