import { BriefcaseBusiness, ChevronRight, CircleDollarSign, FolderKanban, Grid2X2, Home, Menu, MessageCircle, Pencil, Plus, ShoppingCart, Tag, Users, Wrench, X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { navigationIconKey } from '../../domain/navigationIcon.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { useWeather } from '../../weather/useWeather.ts';
import { useLiveClock } from '../clock/useLiveClock.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './MobileNavigation.module.css';

function iconFor(label: string, id = '') {
  const key = navigationIconKey(label, id);
  if (key === 'home') return Home;
  if (key === 'work') return BriefcaseBusiness;
  if (key === 'project') return FolderKanban;
  if (key === 'social') return Users;
  if (key === 'finance') return CircleDollarSign;
  if (key === 'shopping') return ShoppingCart;
  if (key === 'tools') return Wrench;
  if (key === 'services') return Grid2X2;
  if (key === 'entertainment') return MessageCircle;
  return Tag;
}

export function MobileNavigation() {
  const clock = useLiveClock();
  const weather = useWeather();
  const open = useAppStore(state => state.mobileNavOpen);
  const setOpen = useAppStore(state => state.setMobileNavOpen);
  const setWeatherOpen = useAppStore(state => state.setWeatherOpen);
  const projects = useAppStore(state => state.projects);
  const categories = useAppStore(state => state.categories);
  const activeProject = useAppStore(state => state.activeProjectId);
  const activeCategory = useAppStore(state => state.activeCategoryId);
  const setProject = useAppStore(state => state.setActiveProject);
  const setCategory = useAppStore(state => state.setActiveCategory);
  const setStructureEditor = useAppStore(state => state.setStructureEditor);
  const roots = categories.filter(category => category.projectId === activeProject && !category.parentId);
  const temp = weather.data ? `${weather.data.current.temperature}°` : '--°';

  return <>
    <GlassSurface role="control" className={styles.bar}>
      <button aria-label="Открыть разделы" onClick={() => setOpen(true)}><Menu size={20}/></button>
      <div className={styles.brand}><span>N</span><strong>Nexus</strong></div>
      <div className={styles.compactStatus}><b>{clock.time}</b><button className={styles.weatherButton} onClick={() => setWeatherOpen(true)}>{temp}</button></div>
    </GlassSurface>
    {open && <div className={styles.layer} role="presentation" onMouseDown={() => setOpen(false)}>
      <GlassSurface as="aside" role="popover" className={styles.drawer} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header><div><strong>Nexus</strong><small>Разделы и категории</small></div><button aria-label="Закрыть разделы" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <section>
          <h3>Проекты</h3>
          <div className={styles.projects}>{projects.map(project => { const Icon = iconFor(project.name, project.id); return <div className={styles.projectItem} key={project.id}><button className={activeProject === project.id ? styles.active : ''} onClick={() => { setProject(project.id); setOpen(false); }}><Icon size={18}/><span>{project.name}</span></button><button className={styles.projectEdit} aria-label={`Изменить ${project.name}`} onClick={() => { setOpen(false); setStructureEditor({ kind: 'project', id: project.id }); }}><Pencil size={12}/></button></div>; })}<button onClick={() => { setOpen(false); setStructureEditor({ kind: 'project' }); }}><Plus size={18}/><span>Добавить</span></button></div>
        </section>
        <section>
          <h3>Категории</h3>
          <div className={styles.categories}>{roots.map(category => { const Icon = iconFor(category.name, category.id); return <button key={category.id} className={activeCategory === category.id ? styles.active : ''} onClick={() => { setCategory(category.id); setOpen(false); }}><Icon size={19}/><span>{category.name}</span><ChevronRight size={16}/></button>; })}<button onClick={() => { setOpen(false); setStructureEditor({ kind: 'category' }); }}><Plus size={18}/><span>Добавить категорию</span></button></div>
        </section>
      </GlassSurface>
    </div>}
  </>;
}
