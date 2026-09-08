import { BriefcaseBusiness, CircleDollarSign, FolderKanban, Grid2X2, Home, Menu, MessageCircle, MoreHorizontal, Plus, ShoppingCart, Tag, Users, Wrench, X } from 'lucide-react';
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
  const calendarOpen = useAppStore(state => state.calendarOpen);
  const setOpen = useAppStore(state => state.setMobileNavOpen);
  const setCalendarOpen = useAppStore(state => state.setCalendarOpen);
  const setWeatherOpen = useAppStore(state => state.setWeatherOpen);
  const spaces = useAppStore(state => state.spaces);
  const categories = useAppStore(state => state.categories);
  const activeSpaceId = useAppStore(state => state.activeSpaceId);
  const activeCategoryId = useAppStore(state => state.activeCategoryId);
  const setActiveSpace = useAppStore(state => state.setActiveSpace);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setStructureEditor = useAppStore(state => state.setStructureEditor);
  const orderedSpaces = [...spaces].sort((a, b) => a.position - b.position);
  const spaceCategories = categories
    .filter(category => (category.spaceId ?? category.projectId) === activeSpaceId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const roots = spaceCategories.filter(category => !category.parentId);
  const current = weather.data?.current;
  const close = () => setOpen(false);

  return <>
    <GlassSurface role="control" className={styles.bar}>
      <button aria-label="Открыть пространства и категории" onClick={() => setOpen(true)}><Menu size={20}/></button>
      <div className={styles.brand}><span>N</span><strong>Nexus</strong></div>
      <div className={styles.compactStatus}>
        <button data-calendar-trigger className={styles.timeButton} aria-label="Открыть календарь" aria-expanded={calendarOpen} onClick={() => setCalendarOpen(!calendarOpen)}><b>{clock.time}</b><small>{clock.date}</small></button>
        {current && <button className={styles.weatherButton} aria-label="Открыть погоду" onClick={() => setWeatherOpen(true)}><span>{current.icon}</span><b>{current.temperature}°</b></button>}
      </div>
    </GlassSurface>

    {open && <div className={styles.layer} role="presentation" onMouseDown={close}>
      <GlassSurface as="aside" role="popover" className={styles.drawer} onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header><div><strong>Навигация</strong><small>Пространства и категории</small></div><button aria-label="Закрыть навигацию" onClick={close}><X size={20}/></button></header>

        <section>
          <div className={styles.sectionHead}><h3>Пространства</h3><button aria-label="Добавить пространство" onClick={() => { close(); setStructureEditor({ kind: 'space' }); }}><Plus size={16}/></button></div>
          <div className={styles.spaceList}>{orderedSpaces.map(space => { const Icon = iconFor(space.name, space.id); return <div className={styles.item} key={space.id}><button className={`${styles.itemMain} ${activeSpaceId === space.id ? styles.active : ''}`} onClick={() => { setActiveSpace(space.id); close(); }}><Icon size={18}/><span>{space.name}</span></button><button className={styles.more} aria-label={`Изменить пространство ${space.name}`} onClick={() => { close(); setStructureEditor({ kind: 'space', id: space.id }); }}><MoreHorizontal size={17}/></button></div>; })}</div>
        </section>

        <section>
          <div className={styles.sectionHead}><h3>Категории</h3><button aria-label="Добавить категорию" onClick={() => { close(); setStructureEditor({ kind: 'category' }); }}><Plus size={16}/></button></div>
          <div className={styles.categoryList}>
            <button className={`${styles.categoryMain} ${activeCategoryId === null ? styles.active : ''}`} onClick={() => { setActiveCategory(null); close(); }}><Grid2X2 size={18}/><span>Все сайты</span></button>
            {roots.map(root => { const RootIcon = iconFor(root.name, root.id); const children = spaceCategories.filter(category => category.parentId === root.id); return <div className={styles.branch} key={root.id}><div className={styles.item}><button className={`${styles.itemMain} ${activeCategoryId === root.id ? styles.active : ''}`} onClick={() => { setActiveCategory(root.id); close(); }}><RootIcon size={18}/><span>{root.name}</span></button><button className={styles.more} aria-label={`Изменить категорию ${root.name}`} onClick={() => { close(); setStructureEditor({ kind: 'category', id: root.id }); }}><MoreHorizontal size={17}/></button></div>{children.length > 0 && <div className={styles.children}>{children.map(child => { const ChildIcon = iconFor(child.name, child.id); return <div className={styles.item} key={child.id}><button className={`${styles.itemMain} ${activeCategoryId === child.id ? styles.active : ''}`} onClick={() => { setActiveCategory(child.id); close(); }}><ChildIcon size={16}/><span>{child.name}</span></button><button className={styles.more} aria-label={`Изменить категорию ${child.name}`} onClick={() => { close(); setStructureEditor({ kind: 'category', id: child.id }); }}><MoreHorizontal size={16}/></button></div>; })}</div>}</div>; })}
          </div>
        </section>
      </GlassSurface>
    </div>}
  </>;
}
