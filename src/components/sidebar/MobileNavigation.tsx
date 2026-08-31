import { BriefcaseBusiness, ChevronRight, Grid2X2, Home, Menu, Plus, Users, X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { seedCategories, seedProjects } from '../../data/seed.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './MobileNavigation.module.css';

export function MobileNavigation() {
  const open = useAppStore(state => state.mobileNavOpen);
  const setOpen = useAppStore(state => state.setMobileNavOpen);
  const activeProject = useAppStore(state => state.activeProjectId);
  const activeCategory = useAppStore(state => state.activeCategoryId);
  const setProject = useAppStore(state => state.setActiveProject);
  const setCategory = useAppStore(state => state.setActiveCategory);

  return <>
    <GlassSurface role="control" className={styles.bar}>
      <button aria-label="Открыть разделы" onClick={() => setOpen(true)}><Menu size={20}/></button>
      <div className={styles.brand}><span>N</span><strong>Nexus</strong></div>
      <div className={styles.compactStatus}><b>09:42</b><span>22°</span></div>
    </GlassSurface>
    {open && <div className={styles.layer} role="presentation" onMouseDown={() => setOpen(false)}>
      <GlassSurface as="aside" role="popover" className={styles.drawer} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header><div><strong>Nexus</strong><small>Разделы и категории</small></div><button aria-label="Закрыть разделы" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <section><h3>Проекты</h3><div className={styles.projects}>{seedProjects.map((project, index) => <button key={project.id} className={activeProject === project.id ? styles.active : ''} onClick={() => { setProject(project.id); setOpen(false); }}>{index === 0 ? <Home size={18}/> : <BriefcaseBusiness size={18}/>}<span>{project.name}</span></button>)}<button aria-label="Добавить проект"><Plus size={18}/><span>Добавить</span></button></div></section>
        <section><h3>Категории</h3><div className={styles.categories}>{seedCategories.filter(category => !category.parentId).map((category, index) => <button key={category.id} className={activeCategory === category.id ? styles.active : ''} onClick={() => { setCategory(category.id); setOpen(false); }}>{index === 0 ? <Users size={19}/> : <Grid2X2 size={19}/>}<span>{category.name}</span><ChevronRight size={16}/></button>)}</div></section>
      </GlassSurface>
    </div>}
  </>;
}
