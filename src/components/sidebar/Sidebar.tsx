import { BriefcaseBusiness, CalendarDays, ChevronDown, CircleDollarSign, FolderKanban, Grid2X2, Home, MessageCircle, Pencil, Plus, ShoppingCart, Tag, Users, Wrench } from 'lucide-react';
import { navigationIconKey } from '../../domain/navigationIcon.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { useWeather } from '../../weather/useWeather.ts';
import { useLiveClock } from '../clock/useLiveClock.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './Sidebar.module.css';

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

export function Sidebar() {
  const clock = useLiveClock();
  const weather = useWeather();
  const projects = useAppStore(state => state.projects);
  const categories = useAppStore(state => state.categories);
  const sites = useAppStore(state => state.sites);
  const activeProjectId = useAppStore(state => state.activeProjectId);
  const activeCategoryId = useAppStore(state => state.activeCategoryId);
  const setActiveProject = useAppStore(state => state.setActiveProject);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setCalendarOpen = useAppStore(state => state.setCalendarOpen);
  const setWeatherOpen = useAppStore(state => state.setWeatherOpen);
  const setStructureEditor = useAppStore(state => state.setStructureEditor);
  const projectCategories = categories.filter(category => category.projectId === activeProjectId);
  const roots = projectCategories.filter(category => !category.parentId);
  const countFor = (id: string) => {
    const childIds = projectCategories.filter(category => category.parentId === id).map(category => category.id);
    return sites.filter(site => site.projectId === activeProjectId && [id, ...childIds].includes(site.categoryId ?? '')).length;
  };
  const current = weather.data?.current;

  return <GlassSurface as="aside" role="panel" className={styles.sidebar}>
    <div className={styles.brand}><span className={styles.brandMark}>N</span><div><strong>Nexus</strong><small>Speed Dial</small></div></div>
    <GlassSurface role="control" className={styles.clockCard}>
      <div className={styles.clockTop}>
        <div><div className={styles.clock}>{clock.time}</div><button data-testid="date-button" onClick={() => setCalendarOpen(true)}>{clock.date}</button></div>
        <span className={styles.dateGlyph} aria-hidden="true"><CalendarDays size={21}/></span>
      </div>
      <button className={styles.weather} onClick={() => setWeatherOpen(true)}><span className={styles.weatherIcon}>{current?.icon ?? '🌤️'}</span><span className={styles.temp}>{current ? `${current.temperature}°` : '--°'}</span><span><b>{current?.label ?? (weather.status === 'loading' ? 'Загрузка…' : 'Нет данных')}</b><small>{current ? `Ощущается как ${current.apparent}°` : weather.label}</small></span></button>
      {weather.data && <div className={styles.forecast}>{weather.data.daily.slice(0, 4).map(item => <span key={item.date}>{new Date(`${item.date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' })}<b>{item.max}°</b></span>)}</div>}
    </GlassSurface>
    <section className={styles.section}>
      <header>ПРОЕКТЫ <button aria-label="Добавить проект" onClick={() => setStructureEditor({ kind: 'project' })}><Plus size={15}/></button></header>
      <div className={styles.chips}>{projects.map(project => { const Icon = iconFor(project.name, project.id); return <div className={styles.projectChip} key={project.id}><button className={project.id === activeProjectId ? styles.activeChip : ''} onClick={() => setActiveProject(project.id)}><Icon size={14}/>{project.name}</button><button className={styles.chipEdit} aria-label={`Изменить ${project.name}`} onClick={() => setStructureEditor({ kind: 'project', id: project.id })}><Pencil size={11}/></button></div>; })}</div>
    </section>
    <section className={styles.section}>
      <header>КАТЕГОРИИ <button aria-label="Добавить категорию" onClick={() => setStructureEditor({ kind: 'category' })}><Plus size={15}/></button></header>
      <div className={styles.chips}>{roots.slice(0, 3).map(category => { const Icon = iconFor(category.name, category.id); return <button key={category.id} className={category.id === activeCategoryId ? styles.activeChip : ''} onClick={() => setActiveCategory(category.id)}><Icon size={13}/>{category.name}</button>; })}</div>
    </section>
    <section className={`${styles.section} ${styles.explorer}`}>
      <header>ПРОВОДНИК</header>
      {roots.map(root => { const Icon = iconFor(root.name, root.id); const children = projectCategories.filter(category => category.parentId === root.id); return <div key={root.id}><div className={styles.treeLine}><button className={`${styles.treeRow} ${root.id === activeCategoryId ? styles.activeRow : ''}`} onClick={() => setActiveCategory(root.id)}><span><Icon size={15}/>{root.name}</span><em>{countFor(root.id)}</em><ChevronDown size={13}/></button><button className={styles.treeEdit} aria-label={`Изменить ${root.name}`} onClick={() => setStructureEditor({ kind: 'category', id: root.id })}><Pencil size={12}/></button></div>{children.length > 0 && <div className={styles.children}>{children.map(child => <button key={child.id} onClick={() => setActiveCategory(child.id)}><span>• {child.name}</span><em>{countFor(child.id)}</em></button>)}</div>}</div>; })}
    </section>
    <button className={styles.addCategory} onClick={() => setStructureEditor({ kind: 'category' })}><Plus size={16}/>Добавить категорию</button>
  </GlassSurface>;
}
