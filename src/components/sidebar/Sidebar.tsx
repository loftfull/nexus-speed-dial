import { BriefcaseBusiness, CircleDollarSign, FolderKanban, Grid2X2, Home, MessageCircle, MoreHorizontal, Plus, ShoppingCart, Tag, Users, Wrench } from 'lucide-react';
import { useState } from 'react';
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
  const spaces = useAppStore(state => state.spaces);
  const categories = useAppStore(state => state.categories);
  const sites = useAppStore(state => state.sites);
  const activeSpaceId = useAppStore(state => state.activeSpaceId);
  const activeCategoryId = useAppStore(state => state.activeCategoryId);
  const calendarOpen = useAppStore(state => state.calendarOpen);
  const setActiveSpace = useAppStore(state => state.setActiveSpace);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const removeSpace = useAppStore(state => state.removeSpace);
  const removeCategory = useAppStore(state => state.removeCategory);
  const setCalendarOpen = useAppStore(state => state.setCalendarOpen);
  const setWeatherOpen = useAppStore(state => state.setWeatherOpen);
  const setStructureEditor = useAppStore(state => state.setStructureEditor);
  const [menu, setMenu] = useState<string | null>(null);

  const orderedSpaces = [...spaces].sort((a, b) => a.position - b.position);
  const spaceCategories = categories
    .filter(category => (category.spaceId ?? category.projectId) === activeSpaceId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const roots = spaceCategories.filter(category => !category.parentId);
  const siteSpaceId = (projectId: string, spaceId?: string) => spaceId ?? projectId;
  const countFor = (id: string) => {
    const childIds = spaceCategories.filter(category => category.parentId === id).map(category => category.id);
    const allowed = new Set([id, ...childIds]);
    return sites.filter(site => siteSpaceId(site.projectId, site.spaceId) === activeSpaceId && site.categoryId && allowed.has(site.categoryId)).length;
  };
  const spaceHasSites = (id: string) => sites.some(site => siteSpaceId(site.projectId, site.spaceId) === id);
  const categoryHasSites = (id: string) => {
    const childIds = spaceCategories.filter(category => category.parentId === id).map(category => category.id);
    const allowed = new Set([id, ...childIds]);
    return sites.some(site => site.categoryId && allowed.has(site.categoryId));
  };
  const confirmRemoveSpace = (id: string, name: string) => {
    if (id === 'home') return;
    if (spaceHasSites(id) && !window.confirm(`В пространстве «${name}» есть сайты. Они будут перемещены в «Дом». Продолжить?`)) return;
    removeSpace(id);
    setMenu(null);
  };
  const confirmRemoveCategory = (id: string, name: string) => {
    if (categoryHasSites(id) && !window.confirm(`В категории «${name}» есть сайты. Они останутся в пространстве без категории. Продолжить?`)) return;
    removeCategory(id);
    setMenu(null);
  };
  const current = weather.data?.current;

  return <GlassSurface as="aside" role="panel" className={styles.sidebar}>
    <div className={styles.brand}>
      <span className={styles.brandMark}>N</span>
      <div><strong>Nexus</strong><small>Speed Dial</small></div>
    </div>

    <section className={styles.navSection}>
      <header><span>ПРОСТРАНСТВА</span><button aria-label="Добавить пространство" onClick={() => setStructureEditor({ kind: 'space' })}><Plus size={15}/></button></header>
      <div className={styles.spaceList}>
        {orderedSpaces.map(space => {
          const Icon = iconFor(space.name, space.id);
          const menuId = `space:${space.id}`;
          return <div className={styles.navItem} key={space.id}>
            <button className={`${styles.navMain} ${space.id === activeSpaceId ? styles.active : ''}`} onClick={() => { setActiveSpace(space.id); setMenu(null); }}><Icon size={16}/><span>{space.name}</span></button>
            <button className={styles.more} aria-label={`Действия пространства ${space.name}`} aria-expanded={menu === menuId} onClick={() => setMenu(value => value === menuId ? null : menuId)}><MoreHorizontal size={16}/></button>
            {menu === menuId && <GlassSurface role="popover" className={styles.itemMenu}>
              <button onClick={() => { setMenu(null); setStructureEditor({ kind: 'space', id: space.id }); }}>Переименовать</button>
              {space.id !== 'home' && <button className={styles.danger} onClick={() => confirmRemoveSpace(space.id, space.name)}>Удалить</button>}
            </GlassSurface>}
          </div>;
        })}
      </div>
    </section>

    <section className={`${styles.navSection} ${styles.categories}`}>
      <header><span>КАТЕГОРИИ</span><button aria-label="Добавить категорию" onClick={() => setStructureEditor({ kind: 'category' })}><Plus size={15}/></button></header>
      <button className={`${styles.allSites} ${activeCategoryId === null ? styles.active : ''}`} onClick={() => { setActiveCategory(null); setMenu(null); }}><Grid2X2 size={16}/><span>Все сайты</span></button>
      <div className={styles.tree}>
        {roots.map(root => {
          const RootIcon = iconFor(root.name, root.id);
          const children = spaceCategories.filter(category => category.parentId === root.id);
          const menuId = `category:${root.id}`;
          return <div className={styles.branch} key={root.id}>
            <div className={styles.navItem}>
              <button className={`${styles.navMain} ${root.id === activeCategoryId ? styles.active : ''}`} onClick={() => { setActiveCategory(root.id); setMenu(null); }}><RootIcon size={16}/><span>{root.name}</span><em>{countFor(root.id)}</em></button>
              <button className={styles.more} aria-label={`Действия категории ${root.name}`} aria-expanded={menu === menuId} onClick={() => setMenu(value => value === menuId ? null : menuId)}><MoreHorizontal size={16}/></button>
              {menu === menuId && <GlassSurface role="popover" className={styles.itemMenu}>
                <button onClick={() => { setMenu(null); setStructureEditor({ kind: 'category', id: root.id }); }}>Изменить</button>
                <button className={styles.danger} onClick={() => confirmRemoveCategory(root.id, root.name)}>Удалить</button>
              </GlassSurface>}
            </div>
            {children.length > 0 && <div className={styles.children}>{children.map(child => {
              const ChildIcon = iconFor(child.name, child.id);
              const childMenuId = `category:${child.id}`;
              return <div className={styles.navItem} key={child.id}>
                <button className={`${styles.navMain} ${child.id === activeCategoryId ? styles.active : ''}`} onClick={() => { setActiveCategory(child.id); setMenu(null); }}><ChildIcon size={14}/><span>{child.name}</span><em>{countFor(child.id)}</em></button>
                <button className={styles.more} aria-label={`Действия категории ${child.name}`} aria-expanded={menu === childMenuId} onClick={() => setMenu(value => value === childMenuId ? null : childMenuId)}><MoreHorizontal size={15}/></button>
                {menu === childMenuId && <GlassSurface role="popover" className={styles.itemMenu}>
                  <button onClick={() => { setMenu(null); setStructureEditor({ kind: 'category', id: child.id }); }}>Изменить</button>
                  <button className={styles.danger} onClick={() => confirmRemoveCategory(child.id, child.name)}>Удалить</button>
                </GlassSurface>}
              </div>;
            })}</div>}
          </div>;
        })}
      </div>
    </section>

    <div className={styles.utility}>
      <button data-calendar-trigger data-testid="date-button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen(!calendarOpen)}>
        <strong>{clock.time}</strong><span>{clock.date}</span>
      </button>
      {current && <button className={styles.utilityWeather} aria-label="Открыть погоду" onClick={() => setWeatherOpen(true)}><span>{current.icon}</span><strong>{current.temperature}°</strong></button>}
    </div>
  </GlassSurface>;
}
