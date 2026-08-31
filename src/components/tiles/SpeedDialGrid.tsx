import { Plus } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore.ts';
import { SiteTile } from './SiteTile.tsx';
import styles from './SpeedDialGrid.module.css';
export function SpeedDialGrid(){
 const sitesAll=useAppStore(state=>state.sites);const categories=useAppStore(state=>state.categories);const query=useAppStore(state=>state.bookmarkQuery.toLowerCase().trim());const tab=useAppStore(state=>state.workspaceTab);const view=useAppStore(state=>state.viewMode);const preset=useAppStore(state=>state.tileSettings.preset);const project=useAppStore(state=>state.activeProjectId);const category=useAppStore(state=>state.activeCategoryId);const setSiteEditor=useAppStore(state=>state.setSiteEditor);
 let sites=sitesAll.filter(site=>site.projectId===project);if(category){const children=categories.filter(item=>item.parentId===category).map(item=>item.id);sites=sites.filter(site=>[category,...children].includes(site.categoryId??''))}if(tab==='favorites')sites=sites.filter(site=>site.favorite);if(query)sites=sites.filter(site=>`${site.title} ${site.subtitle??''} ${site.domain}`.toLowerCase().includes(query));const mode=view==='list'?'list':preset;
 return <><div className={`${styles.grid} ${view==='list'?styles.list:''}`} data-testid="speed-grid">{sites.map((site,index)=><SiteTile key={site.id} site={site} mode={mode} selected={index===0}/>)}</div><button className={styles.add} onClick={()=>setSiteEditor('new')}><Plus size={18}/>Добавить сайт</button></>;
}
