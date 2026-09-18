import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Check, ChevronDown, ChevronRight, ChevronUp, Clock3, CloudSun, Droplets, Home, Layers3, LayoutGrid,
  Briefcase, Cloud, CloudRain, GraduationCap, ShoppingBag, Snowflake, Sun,
  Moon, MoreHorizontal, Plus, RotateCw, Search, Settings as SettingsIcon, SlidersHorizontal,
  Star, StickyNote, Tag, Trash2, Wind, X,
} from 'lucide-react';

import '../styles.css';
import './theme.css';

import { appReducer, createInitialAppState, persistAppState } from '../domain/appStore';
import type { AppearanceState } from '../domain/appStore';
import { seedSites } from '../domain/seed';
import { readStorage, writeStorage } from '../domain/storage';
import { makeCategoryId, makeGroupId } from '../domain/hierarchy';
import { buildWebSearchUrl } from '../domain/webSearch';
import { recordSiteOpen, resolveHistoryTarget, resolveSiteUrl } from '../domain/siteOpen';
import { filterSites } from '../domain/siteUtils';
import { sites as countSites } from '../domain/plural';
import type { Category, Project, SiteGroup, SiteRecord as Site } from '../domain/types';

import { Tile, monogram } from './Tile';
import { AddSiteModal } from '../components/AddSiteModal';
import { CalendarPopover } from '../components/CalendarPopover';
import { MobileSections } from '../components/MobileSections';
import { SettingsPanel } from './SettingsPanel';
import { NotesWorkspace } from '../components/NotesWorkspace';

type SectionId = 'sites' | 'favorites' | 'trash' | 'recent' | 'notes';

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'sites', label: 'Быстрый доступ', icon: Home },
  { id: 'favorites', label: 'Избранное', icon: Star },
  { id: 'recent', label: 'Недавние', icon: Clock3 },
  { id: 'notes', label: 'Заметки', icon: StickyNote },
  { id: 'trash', label: 'Корзина', icon: Trash2 },
];
const SECTION_TITLE = Object.fromEntries(SECTIONS.map(s => [s.id, s.label])) as Record<SectionId, string>;
const PROJECT_GLYPHS = [Home, Briefcase, GraduationCap, Star, Layers3, ShoppingBag];
const PAGE = 24;
export const DOCK_DRAG_TYPE = 'application/x-nexus-site';

const WEATHER_PLACES: Record<string, [number, number]> = {
  'Москва': [55.75, 37.62], 'Санкт-Петербург': [59.93, 30.31], 'Берлин': [52.52, 13.4], 'Лондон': [51.51, -0.13],
};
const WEATHER_ICONS: Record<number, React.ComponentType<{ size?: number }>> = {
  0: Sun, 1: Sun, 2: CloudSun, 3: Cloud, 61: CloudRain, 63: CloudRain, 71: Snowflake,
};
const WEATHER_LABELS: Record<number, string> = {
  0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
  61: 'Небольшой дождь', 63: 'Дождь', 71: 'Снег',
};
type ForecastDay = { key: string; label: string; code: number; hi: string; lo: string };
type Weather = { temp: string; label: string; hi: string; lo: string; humidity: string; wind: string; ready: boolean; days: ForecastDay[] };
const WEATHER_EMPTY: Weather = { temp: '—', label: 'Загрузка погоды…', hi: '', lo: '', humidity: '', wind: '', ready: false, days: [] };

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function App() {
  const [state, dispatch] = useReducer(appReducer, seedSites, createInitialAppState);
  const { sites, trash, categories, groups, history, ui, tile, appearance, projects, sessions } = state;

  const setSites = (value: Site[] | ((current: Site[]) => Site[])) => dispatch({ type: 'sites/set', value });
  const setTrash = (value: Site[] | ((current: Site[]) => Site[])) => dispatch({ type: 'trash/set', value });
  const setCategories = (value: Category[] | ((current: Category[]) => Category[])) => dispatch({ type: 'categories/set', value });
  const setGroups = (value: SiteGroup[] | ((current: SiteGroup[]) => SiteGroup[])) => dispatch({ type: 'groups/set', value });
  const setHistory = (value: string[] | ((current: string[]) => string[])) => dispatch({ type: 'history/set', value });
  const setProjects = (value: Project[] | ((current: Project[]) => Project[])) => dispatch({ type: 'projects/set', value });
  const setSessions = (value: typeof sessions | ((current: typeof sessions) => typeof sessions)) => dispatch({ type: 'sessions/set', value });
  const setUi = (value: typeof ui | ((current: typeof ui) => typeof ui)) => dispatch({ type: 'ui/set', value });
  const setTile = (value: typeof tile | ((current: typeof tile) => typeof tile)) => dispatch({ type: 'tile/set', value });
  const setAppearance = (value: AppearanceState | ((current: AppearanceState) => AppearanceState)) => dispatch({ type: 'appearance/set', value });
  const setDensity = (value: number) => dispatch({ type: 'density/set', value });

  const [section, setSection] = useState<SectionId>('sites');
  const [projectId, setProjectId] = useState<string | null>(() => readStorage('nexus-active-project', null as string | null));
  const [categoryId, setCategoryId] = useState<string | null>(() => readStorage('nexus-active-category', null as string | null));
  const [view, setView] = useState<'all' | 'groups'>(() => readStorage('nexus-view-mode', 'all' as 'all' | 'groups'));
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => readStorage('nexus-panel-open', true));
  const [dockOpen, setDockOpen] = useState(() => readStorage('nexus-dock-open', false));
  const [searchOpen, setSearchOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [openProjects, setOpenProjects] = useState<string[]>(() => readStorage('nexus-open-projects', [] as string[]));
  const [openCategories, setOpenCategories] = useState<string[]>(() => readStorage('nexus-open-categories', [] as string[]));
  const [groupId, setGroupId] = useState<string | null>(() => readStorage('nexus-active-group', null as string | null));
  const [quickOpen, setQuickOpen] = useState(() => readStorage('nexus-quick-open', true));
  const [pinned, setPinned] = useState<string[]>(() => readStorage('nexus-dock-pins', [] as string[]));
  const [pinEdit, setPinEdit] = useState(false);
  const [dragOverDock, setDragOverDock] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>(WEATHER_EMPTY);

  const activeProjectId = projectId ?? projects[0]?.id ?? null;
  const activeProject = projects.find(item => item.id === activeProjectId) ?? null;
  const projectCategories = useMemo(
    () => categories.filter(item => item.projectId === activeProjectId),
    [categories, activeProjectId],
  );
  const activeCategory = projectCategories.find(item => item.id === categoryId) ?? null;

  useEffect(() => { if (categoryId && !activeCategory) setCategoryId(null); }, [categoryId, activeCategory]);
  useEffect(() => { persistAppState(state) || setToast('Не удалось сохранить: хранилище браузера переполнено'); }, [state]);
  useEffect(() => { writeStorage('nexus-active-project', activeProjectId); }, [activeProjectId]);
  useEffect(() => { writeStorage('nexus-active-category', categoryId); }, [categoryId]);
  useEffect(() => { writeStorage('nexus-view-mode', view); }, [view]);
  useEffect(() => { writeStorage('nexus-panel-open', panelOpen); }, [panelOpen]);
  useEffect(() => { writeStorage('nexus-dock-open', dockOpen); }, [dockOpen]);
  useEffect(() => { writeStorage('nexus-quick-open', quickOpen); }, [quickOpen]);
  useEffect(() => { writeStorage('nexus-open-projects', openProjects); }, [openProjects]);
  useEffect(() => { writeStorage('nexus-open-categories', openCategories); }, [openCategories]);
  useEffect(() => { writeStorage('nexus-active-group', groupId); }, [groupId]);
  useEffect(() => { writeStorage('nexus-dock-pins', pinned); }, [pinned]);
  useEffect(() => {
    setPinned(current => {
      const alive = current.filter(id => sites.some(site => site.id === id));
      return alive.length === current.length ? current : alive;
    });
  }, [sites]);
  useEffect(() => { if (!pinned.length) setPinEdit(false); }, [pinned]);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (!quickOpen) setSearchOpen(false); }, [quickOpen]);
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { setLimit(PAGE); }, [section, activeProjectId, categoryId, query, view]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const theme = appearance.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : appearance.theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', appearance.accent);
  }, [appearance]);

  useEffect(() => {
    if (!ui.weather) { setWeather(WEATHER_EMPTY); return; }
    const [latitude, longitude] = WEATHER_PLACES[ui.weatherCity] ?? WEATHER_PLACES['Москва'];
    const unit = ui.weatherUnits === 'Фаренгейт (°F)' ? '&temperature_unit=fahrenheit' : '';
    let cancelled = false;
    const load = () => {
      setWeather(WEATHER_EMPTY);
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
        + `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
        + `&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=5&timezone=auto${unit}`)
        .then(response => { if (!response.ok) throw new Error('weather'); return response.json(); })
        .then(data => {
          if (cancelled) return;
          const current = data?.current;
          if (current?.temperature_2m == null) throw new Error('weather-data');
          setWeather({
            temp: `${Math.round(current.temperature_2m)}°`,
            label: WEATHER_LABELS[current.weather_code as number] ?? 'Переменная облачность',
            hi: data?.daily?.temperature_2m_max?.[0] != null ? `${Math.round(data.daily.temperature_2m_max[0])}°` : '',
            lo: data?.daily?.temperature_2m_min?.[0] != null ? `${Math.round(data.daily.temperature_2m_min[0])}°` : '',
            humidity: current.relative_humidity_2m != null ? `${Math.round(current.relative_humidity_2m)}%` : '',
            wind: current.wind_speed_10m != null ? `${Math.round(current.wind_speed_10m)} км/ч` : '',
            ready: true,
            days: (data?.daily?.time ?? []).slice(0, 5).map((iso: string, index: number) => ({
              key: iso,
              label: index === 0 ? 'Сегодня' : capitalise(new Date(iso).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')),
              code: data.daily.weather_code?.[index] ?? 0,
              hi: data.daily.temperature_2m_max?.[index] != null ? `${Math.round(data.daily.temperature_2m_max[index])}°` : '',
              lo: data.daily.temperature_2m_min?.[index] != null ? `${Math.round(data.daily.temperature_2m_min[index])}°` : '',
            })),
          });
        })
        .catch(() => { if (!cancelled) setWeather({ ...WEATHER_EMPTY, label: 'Погода недоступна' }); });
    };
    load();
    const timer = ui.weatherAuto ? window.setInterval(load, 30 * 60 * 1000) : undefined;
    return () => { cancelled = true; if (timer) window.clearInterval(timer); };
  }, [ui.weather, ui.weatherCity, ui.weatherUnits, ui.weatherAuto]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 'n') { event.preventDefault(); setAddOpen(true); }
      if (event.ctrlKey && key === ',') { event.preventDefault(); setSettingsOpen(true); }
      if (event.ctrlKey && key === 'b') { event.preventDefault(); setSection('favorites'); }
      if (key === 'escape') { setCalendarOpen(false); setMobileNav(false); setSettingsOpen(false); setForecastOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateLine = `${capitalise(now.toLocaleDateString('ru-RU', { weekday: 'long' }))}, ${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  const dateShort = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');

  const openUrl = (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); };
  const openSite = (site: Site) => {
    const stamp = Date.now();
    setSites(current => recordSiteOpen(current, [], site, stamp, false).sites);
    if (ui.saveHistory !== false) setHistory(current => recordSiteOpen([], current, site, stamp, true).history);
    openUrl(resolveSiteUrl(site));
  };
  const openHistoryItem = (item: string) => {
    const target = resolveHistoryTarget(item, sites);
    if (target.site) openSite(target.site); else openUrl(target.url);
  };
  const toggleFavorite = (site: Site) => setSites(current => current.map(item => (item.id === site.id ? { ...item, favorite: !item.favorite } : item)));
  const removeSite = (site: Site) => {
    setTrash(current => [site, ...current.filter(item => item.id !== site.id)]);
    setSites(current => current.filter(item => item.id !== site.id));
    setToast(`«${site.title}» в корзине`);
  };

  const selectProject = (id: string) => { setSection('sites'); setProjectId(id); setCategoryId(null); setGroupId(null); };
  const addProject = () => {
    const name = prompt('Название проекта')?.trim();
    if (!name) return;
    const project: Project = { id: `project-${Date.now()}`, name, color: '#3b7df0', icon: name[0], siteIds: [], createdAt: Date.now(), updatedAt: Date.now() };
    setProjects(current => [...current, project]);
    selectProject(project.id);
  };
  const addCategory = () => {
    if (!activeProjectId) { setToast('Сначала создайте проект'); return; }
    const name = prompt('Название категории')?.trim();
    if (!name) return;
    if (projectCategories.some(item => item.name === name)) { setToast('Такая категория уже есть'); return; }
    const created: Category = { id: makeCategoryId(name, activeProjectId), name, projectId: activeProjectId };
    setCategories(current => [...current, created]);
    setSection('sites');
    setCategoryId(created.id);
  };
  const addGroup = (targetCategoryId: string) => {
    const name = prompt('Название группы')?.trim();
    if (!name) return;
    if (groups.some(item => item.categoryId === targetCategoryId && item.name === name)) { setToast('Такая группа уже есть'); return; }
    setGroups(current => [...current, { id: makeGroupId(name, targetCategoryId), name, categoryId: targetCategoryId }]);
  };

  const scoped = useMemo(() => {
    if (section === 'favorites') return sites.filter(site => site.favorite);
    const ids = new Set(projectCategories.map(item => item.id));
    const withinProject = activeProjectId ? sites.filter(site => ids.has(site.categoryId ?? '')) : sites;
    const withinCategory = categoryId ? withinProject.filter(site => site.categoryId === categoryId) : withinProject;
    return groupId ? withinCategory.filter(site => site.groupId === groupId) : withinCategory;
  }, [sites, section, projectCategories, activeProjectId, categoryId, groupId]);

  const found = useMemo(
    () => (ui.searchLocal === false || !query ? scoped : filterSites(scoped, query, {}, 'Быстрый доступ', () => [])),
    [scoped, query, ui.searchLocal],
  );

  const grouped = useMemo(() => {
    const scopeCategories = categoryId ? projectCategories.filter(item => item.id === categoryId) : projectCategories;
    const blocks: { id: string; name: string; sites: Site[] }[] = [];
    scopeCategories.forEach(category => {
      groups.filter(group => group.categoryId === category.id).forEach(group => {
        const inside = found.filter(site => site.groupId === group.id);
        if (inside.length) blocks.push({ id: group.id, name: categoryId ? group.name : `${category.name} · ${group.name}`, sites: inside });
      });
    });
    const placed = new Set(blocks.flatMap(block => block.sites.map(site => site.id)));
    const rest = found.filter(site => !placed.has(site.id));
    if (rest.length) blocks.push({ id: '__rest', name: 'Без группы', sites: rest });
    return blocks;
  }, [found, groups, projectCategories, categoryId]);

  const panelGroups = useMemo(() => {
    const scopeCategories = categoryId ? projectCategories.filter(item => item.id === categoryId) : projectCategories;
    const ids = new Set(scopeCategories.map(item => item.id));
    return groups.filter(group => ids.has(group.categoryId))
      .map(group => ({ group, count: scoped.filter(site => site.groupId === group.id).length }))
      .filter(item => item.count > 0);
  }, [groups, projectCategories, categoryId, scoped]);

  const shown = found.slice(0, limit);
  const useFavicons = ui.siteIcons !== false;
  const gridStyle = { '--nx-tile': tile.size === 'S' ? '140px' : tile.size === 'L' ? '200px' : tile.size === 'XL' ? '230px' : '170px', '--nx-gap': `${state.density}px` } as React.CSSProperties;

  const renderTile = (site: Site) => (
    <Tile
      key={site.id}
      site={site}
      dragType={DOCK_DRAG_TYPE}
      useFavicons={useFavicons}
      showDomain={tile.showDomain === true}
      showBadge={tile.showNotifications !== false}
      onOpen={() => openSite(site)}
      onFavorite={() => toggleFavorite(site)}
      onEdit={() => setEditing(site)}
      onDelete={() => removeSite(site)}
    />
  );

  const heading = section === 'sites' ? '' : SECTION_TITLE[section];
  const subheading = section === 'sites'
    ? `${view === 'groups' ? 'По группам' : 'Все сайты'} · ${countSites(found.length)}`
    : section === 'favorites' ? `Отмеченные плитки · ${countSites(found.length)}`
    : section === 'trash' ? `Удалённые сайты · ${countSites(trash.length)}`
    : 'Раздел рабочего пространства';

  const grid = section === 'sites' && view === 'groups'
    ? (grouped.length
      ? <div className="nx-groups">{grouped.map(block => (
          <section className="nx-group" key={block.id} id={`group-${block.id}`}>
            <div className="nx-group-head">
              <span className="nx-group-mark" aria-hidden="true"><Layers3 size={13} /></span>
              <h2 className="nx-label">{block.name}</h2>
              <span className="nx-group-count">{countSites(block.sites.length)}</span>
            </div>
            <div className="nx-grid" style={gridStyle}>{block.sites.map(renderTile)}</div>
          </section>
        ))}</div>
      : <Empty title="Здесь пока пусто" hint="Добавьте первый сайт в эту категорию" />)
    : (shown.length
      ? <>
          <div className="nx-grid" style={gridStyle}>{shown.map(renderTile)}</div>
          {found.length > shown.length && (
            <button type="button" className="nx-more" onClick={() => setLimit(value => value + PAGE)}>
              <MoreHorizontal size={16} /> Показать больше
            </button>
          )}
        </>
      : <Empty title={query ? 'Ничего не найдено' : 'Здесь пока пусто'} hint={query ? 'Попробуйте изменить запрос' : 'Добавьте первый сайт'} />);

  let body: React.ReactNode;
  if (section === 'trash') {
    body = trash.length ? (
      <>
        <div className="nx-grid" style={gridStyle}>
          {trash.map(site => (
            <div className="nx-tile" key={site.id}>
              <div className="nx-tile-face">
                <span className="nx-mark" style={{ background: site.color }} aria-hidden="true">{site.title.slice(0, 2).toUpperCase()}</span>
                <span className="nx-tile-name">{site.title}</span>
                <span className="nx-tile-sub">{site.domain}</span>
              </div>
              <button type="button" className="nx-more" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => {
                setSites(current => [site, ...current]);
                setTrash(current => current.filter(item => item.id !== site.id));
                setToast('Сайт восстановлен');
              }}><RotateCw size={14} /> Восстановить</button>
            </div>
          ))}
        </div>
        <button type="button" className="nx-more" onClick={() => {
          if (confirm('Очистить корзину без возможности восстановить?')) { setTrash([]); setToast('Корзина очищена'); }
        }}><Trash2 size={15} /> Очистить корзину</button>
      </>
    ) : <Empty title="Корзина пуста" hint="Удалённые сайты можно восстановить отсюда" />;
  } else if (section === 'recent') {
    const items = history.map(ref => sites.find(site => site.id === ref || site.domain === ref || site.title === ref)).filter(Boolean) as Site[];
    body = items.length
      ? <div className="nx-grid" style={gridStyle}>{items.map((site, index) => <React.Fragment key={`${site.id}-${index}`}>{renderTile(site)}</React.Fragment>)}</div>
      : <Empty title="Пока ничего не открывали" hint="Открытые сайты появятся здесь" />;
  } else if (section === 'notes') {
    body = <NotesWorkspace sites={sites.filter(site => site.note)} onEdit={setEditing} />;
  } else {
    body = grid;
  }

  const showCategoryBar = section === 'sites';
  const quickVisible = quickOpen && !dockOpen;
  const pinnedSites = pinned.map(id => sites.find(site => site.id === id)).filter(Boolean) as Site[];

  return (
    <div className={'nx-root' + (panelOpen ? '' : ' panel-collapsed')}>
      <aside className={'nx-panel' + (panelOpen ? '' : ' collapsed')}>
        <div className="nx-panel-scroll">
          <button type="button" className="nx-panel-head" aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            title={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            onClick={() => setPanelOpen(value => !value)}>
            <span className="nx-brand" aria-hidden="true">N</span>
            {panelOpen && <span className="nx-panel-brand"><b>Nexus</b><span>Speed Dial</span></span>}
          </button>

          <div className="nx-section">
            {panelOpen
              ? <span className="nx-label nx-label-row">Проекты<button type="button" aria-label="Добавить проект" title="Добавить проект" onClick={addProject}><Plus size={14} /></button></span>
              : <button type="button" className="nx-link nx-link-ghost" aria-label="Добавить проект" title="Добавить проект" onClick={addProject}><Plus size={17} /></button>}

            {projects.map((project, index) => {
              const Glyph = PROJECT_GLYPHS[index % PROJECT_GLYPHS.length];
              const current = activeProjectId === project.id;
              const expanded = openProjects.includes(project.id);
              const inside = categories.filter(item => item.projectId === project.id);
              return (
                <div className="nx-tree-node" key={project.id}>
                  <button type="button" className={'nx-link nx-tree-row' + (current && section === 'sites' ? ' on' : '')}
                    title={project.name} aria-label={panelOpen ? undefined : `Проект «${project.name}»`}
                    aria-expanded={panelOpen ? expanded : undefined}
                    onClick={() => {
                      selectProject(project.id);
                      setOpenProjects(open => {
                        if (!open.includes(project.id)) return [...open, project.id];
                        // A second press on the project folds the whole branch away.
                        setOpenCategories(items => items.filter(id => !inside.some(category => category.id === id)));
                        return open.filter(id => id !== project.id);
                      });
                    }}>
                    {panelOpen && <ChevronRight size={14} className={'nx-tree-caret' + (expanded ? ' open' : '')} aria-hidden="true" />}
                    <Glyph size={17} />
                    {panelOpen && <span>{project.name}</span>}
                  </button>

                  {panelOpen && expanded && (
                    <div className="nx-tree-children">
                      {inside.length === 0 && <span className="nx-tree-empty">Категорий пока нет</span>}
                      {inside.map(category => {
                        const catOpen = openCategories.includes(category.id);
                        const inner = groups.filter(group => group.categoryId === category.id);
                        return (
                          <div key={category.id}>
                            <button type="button" className={'nx-link nx-tree-row' + (categoryId === category.id && !groupId ? ' on' : '')}
                              aria-expanded={catOpen} onClick={() => {
                                setSection('sites');
                                setProjectId(project.id);
                                setCategoryId(category.id);
                                setGroupId(null);
                                setOpenCategories(open => open.includes(category.id) ? open.filter(id => id !== category.id) : [...open, category.id]);
                              }}>
                              <ChevronRight size={13} className={'nx-tree-caret' + (catOpen ? ' open' : '')} aria-hidden="true" />
                              <Tag size={15} />
                              <span>{category.name}</span>
                            </button>
                            {catOpen && (
                              <div className="nx-tree-children">
                                {inner.length === 0 && <span className="nx-tree-empty">Групп пока нет</span>}
                                {inner.map(group => (
                                  <button type="button" key={group.id} className={'nx-link nx-tree-row' + (groupId === group.id ? ' on' : '')}
                                    onClick={() => {
                                      setSection('sites');
                                      setProjectId(project.id);
                                      setCategoryId(category.id);
                                      setGroupId(current => (current === group.id ? null : group.id));
                                    }}>
                                    <span className="nx-tree-spacer" aria-hidden="true" />
                                    <Layers3 size={15} />
                                    <span>{group.name}</span>
                                  </button>
                                ))}
                                <button type="button" className="nx-link nx-tree-row nx-link-ghost" onClick={() => addGroup(category.id)}>
                                  <span className="nx-tree-spacer" aria-hidden="true" />
                                  <Plus size={15} /><span>Группа</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button type="button" className="nx-link nx-tree-row nx-link-ghost" onClick={() => { selectProject(project.id); addCategory(); }}>
                        <span className="nx-tree-spacer" aria-hidden="true" />
                        <Plus size={15} /><span>Категория</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="nx-panel-foot">
          <div className="nx-when">
            <button type="button" data-calendar-trigger className="nx-when-date"
              aria-expanded={calendarOpen} aria-label={`Открыть календарь, сегодня ${dateLine}`}
              onClick={() => { setForecastOpen(false); setCalendarOpen(value => !value); }}>
              <b>{time}</b>
              {panelOpen && <span>{dateShort}</span>}
            </button>
            {ui.weather && (
              <button type="button" data-forecast-trigger className="nx-when-temp"
                aria-expanded={forecastOpen} aria-label={`Прогноз на пять дней, сейчас ${weather.temp}`}
                title="Прогноз на 5 дней"
                onClick={() => { setCalendarOpen(false); setForecastOpen(value => !value); }}>
                <CloudSun size={16} aria-hidden="true" />{weather.temp}
              </button>
            )}
          </div>

          <button type="button" className={'nx-link' + (quickOpen ? ' on' : '')} aria-expanded={quickOpen} aria-controls="nx-quick"
            title={quickOpen ? 'Свернуть панель быстрого доступа' : 'Развернуть панель быстрого доступа'}
            aria-label={quickOpen ? 'Свернуть панель быстрого доступа' : 'Развернуть панель быстрого доступа'}
            onClick={() => setQuickOpen(value => !value)}>
            <LayoutGrid size={17} />{panelOpen && <span>Быстрый доступ</span>}
          </button>

          <button type="button" className="nx-link" title="Настройки"
            aria-label={panelOpen ? undefined : 'Настройки'} onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={17} />{panelOpen && <span>Настройки</span>}
          </button>
        </div>
      </aside>

      <main className="nx-main">
        <div className="nx-main-scroll">
          <div className="nx-mobile-top">
            <button type="button" className="nx-icon-btn" aria-label="Разделы" onClick={() => setMobileNav(true)}><Layers3 size={18} /></button>
            <div className="nx-mobile-card">
              <button type="button" data-calendar-trigger className="nx-mobile-time"
                aria-expanded={calendarOpen} aria-label={`Открыть календарь, сегодня ${dateLine}`}
                onClick={() => { setForecastOpen(false); setCalendarOpen(value => !value); }}>
                <b>{time}</b><small>{dateLine}</small>
              </button>
              {ui.weather && (
                <button type="button" data-forecast-trigger className="nx-mobile-weather"
                  aria-expanded={forecastOpen} aria-label={`Прогноз на пять дней, сейчас ${weather.temp}`}
                  onClick={() => { setCalendarOpen(false); setForecastOpen(value => !value); }}>
                  <CloudSun size={20} aria-hidden="true" /><b>{weather.temp}</b>
                </button>
              )}
            </div>
            <button type="button" className={'nx-icon-btn' + (quickOpen ? ' on' : '')} aria-expanded={quickOpen} aria-controls="nx-quick"
              aria-label={quickOpen ? 'Свернуть панель быстрого доступа' : 'Развернуть панель быстрого доступа'}
              onClick={() => setQuickOpen(value => !value)}><LayoutGrid size={18} /></button>
            <button type="button" className="nx-icon-btn" aria-label="Настройки" onClick={() => setSettingsOpen(true)}><SettingsIcon size={18} /></button>
          </div>

          {showCategoryBar && (
            <nav className="nx-cats" aria-label="Категории проекта">
              <div className="nx-cats-tabs" role="tablist" aria-label="Категории проекта">
                <button type="button" role="tab" aria-selected={!categoryId} className={'nx-cat' + (categoryId ? '' : ' on')} onClick={() => { setCategoryId(null); setGroupId(null); }}>Все</button>
                {projectCategories.map(category => (
                  <button key={category.id} type="button" role="tab" aria-selected={categoryId === category.id}
                    className={'nx-cat' + (categoryId === category.id ? ' on' : '')} onClick={() => { setCategoryId(category.id); setGroupId(null); }}>
                    {category.name}
                  </button>
                ))}
                <button type="button" className="nx-cat-add" aria-label="Добавить категорию" title="Добавить категорию" onClick={addCategory}><Plus size={16} /></button>
              </div>
              <div className="nx-cats-side">
                <div className="nx-seg" role="group" aria-label="Вид категории">
                  <button type="button" className={view === 'all' ? 'on' : ''} aria-pressed={view === 'all'} aria-label="Все сайты категории" title="Все сайты категории" onClick={() => setView('all')}><LayoutGrid size={17} /></button>
                  <button type="button" className={view === 'groups' ? 'on' : ''} aria-pressed={view === 'groups'} aria-label="Группы категории" title="Группы категории" onClick={() => setView('groups')}><Layers3 size={17} /></button>
                </div>
                {activeCategory && (
                  <button type="button" className="nx-icon-btn" aria-label={`Добавить группу в «${activeCategory.name}»`} title="Добавить группу" onClick={() => addGroup(activeCategory.id)}><SlidersHorizontal size={17} /></button>
                )}
              </div>
            </nav>
          )}

          <div className={'nx-head' + (heading ? '' : ' bare')}>
            <div>
              {heading && <h1>{heading}</h1>}
              <p>{subheading}</p>
            </div>
          </div>

          {body}
        </div>

        <div className="nx-bottom">
          <div className={'nx-quick' + (quickVisible ? ' open' : '') + (searchOpen ? ' searching' : '')}
            id="nx-quick" role="toolbar" aria-label="Панель быстрого доступа" aria-hidden={!quickVisible}>
            {searchOpen ? (
              <label className="nx-dock-search">
                <Search size={18} />
                <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="Закладки или адрес" aria-label="Поиск по закладкам или адрес"
                  onKeyDown={event => {
                    if (event.key === 'Escape') { setQuery(''); setSearchOpen(false); return; }
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    const value = query.trim();
                    if (!value) return;
                    const isUrl = /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
                    openUrl(isUrl ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : buildWebSearchUrl(ui.searchEngine, value));
                  }} />
                <button type="button" aria-label="Закрыть поиск" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={17} /></button>
              </label>
            ) : (
              <>
                {SECTIONS.map(item => (
                  <button key={item.id} type="button" className={section === item.id ? 'on' : ''} aria-label={item.label} title={item.label} onClick={() => setSection(item.id)}>
                    <item.icon size={19} />
                  </button>
                ))}
                <span className="nx-dock-sep" />
                <button type="button" className={query ? 'on' : ''} aria-label="Поиск по закладкам" title="Поиск по закладкам или адрес" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search size={19} /></button>
                <button type="button" aria-label="Добавить сайт" title="Добавить сайт (Ctrl N)" onClick={() => setAddOpen(true)}><Plus size={19} /></button>
                <button type="button" aria-label="Настройки" title="Настройки (Ctrl ,)" onClick={() => setSettingsOpen(true)}><SettingsIcon size={19} /></button>
                <button type="button" aria-label="Свернуть панель быстрого доступа" title="Свернуть панель быстрого доступа" onClick={() => setQuickOpen(false)}><ChevronDown size={19} /></button>
              </>
            )}
          </div>

          <div
            className={'nx-dock' + (dockOpen ? ' open' : '') + (dragOverDock ? ' drop' : '')}
            id="nx-dock" role="toolbar" aria-label="Док-панель" aria-hidden={!dockOpen}
            onDragOver={event => { if (event.dataTransfer.types.includes(DOCK_DRAG_TYPE)) { event.preventDefault(); setDragOverDock(true); } }}
            onDragLeave={() => setDragOverDock(false)}
            onDrop={event => {
              const id = event.dataTransfer.getData(DOCK_DRAG_TYPE);
              setDragOverDock(false);
              if (!id) return;
              event.preventDefault();
              if (pinned.includes(id)) { setToast('Этот сайт уже в док-панели'); return; }
              setPinned(current => [...current, id]);
              setToast(`«${sites.find(item => item.id === id)?.title ?? 'Сайт'}» закреплён в док-панели`);
            }}
          >
            {pinnedSites.length === 0 ? (
              <span className="nx-dock-empty">Перетащите сюда плитку сайта</span>
            ) : (
              <>
                {pinnedSites.map(site => (
                  <span className="nx-dock-pin" key={site.id}>
                    <button type="button" className="nx-dock-pin-open" title={site.title}
                      aria-label={pinEdit ? `Убрать «${site.title}» из док-панели` : `Открыть «${site.title}»`}
                      onClick={() => {
                        if (!pinEdit) { openSite(site); return; }
                        setPinned(current => current.filter(id => id !== site.id));
                        setToast(`«${site.title}» убран из док-панели`);
                      }}>
                      <PinMark site={site} useFavicons={useFavicons} />
                    </button>
                    {pinEdit && <span className="nx-dock-pin-x" aria-hidden="true"><X size={11} /></span>}
                  </span>
                ))}
                <span className="nx-dock-sep" />
                <button type="button" className={'nx-dock-edit' + (pinEdit ? ' on' : '')} aria-pressed={pinEdit}
                  aria-label={pinEdit ? 'Закончить удаление иконок' : 'Удалить иконку сайта из док-панели'}
                  title={pinEdit ? 'Закончить удаление' : 'Удалить иконку сайта из док-панели'}
                  onClick={() => setPinEdit(value => !value)}>
                  {pinEdit ? <Check size={18} /> : <Trash2 size={18} />}
                </button>
              </>
            )}
          </div>

          <button type="button" className={'nx-dock-handle' + (dockOpen ? ' on' : '')}
            aria-expanded={dockOpen} aria-controls="nx-dock"
            aria-label={dockOpen ? 'Скрыть док-панель' : 'Показать док-панель'}
            title={dockOpen ? 'Скрыть док-панель' : 'Показать док-панель'}
            onClick={() => setDockOpen(value => { const next = !value; if (next) setQuickOpen(false); return next; })}>
            <ChevronUp size={16} />
          </button>
        </div>
      </main>

      {toast && <div className="nx-toast" role="status">{toast}</div>}
      {calendarOpen && <CalendarPopover onClose={() => setCalendarOpen(false)} />}
      {forecastOpen && <ForecastPanel weather={weather} city={ui.weatherCity} onClose={() => setForecastOpen(false)} />}
      {mobileNav && (
        <MobileSections active={SECTION_TITLE[section]} setActive={() => {}} onClose={() => setMobileNav(false)}
          onSelect={label => {
            if (label === 'Настройки') { setSettingsOpen(true); return; }
            const match = SECTIONS.find(item => item.label === label);
            if (match) setSection(match.id);
          }}
          items={SECTIONS.map(item => [item.label, item.icon] as const)} />
      )}
      {(addOpen || editing) && (
        <AddSiteModal
          existing={editing ?? undefined}
          categories={categories}
          groups={groups}
          allowRemotePreview={ui.remotePreviews === true}
          onClose={() => { setAddOpen(false); setEditing(null); }}
          onSave={site => {
            setSites(current => (editing ? current.map(item => (item.id === editing.id ? { ...item, ...site } : item)) : [{ ...site, id: site.id ?? `site-${Date.now()}` }, ...current]));
            setToast(editing ? 'Сайт обновлён' : 'Сайт добавлен');
            setAddOpen(false);
            setEditing(null);
          }} />
      )}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} density={state.density} setDensity={setDensity}
          sites={sites} setSites={setSites} categories={categories} setCategories={setCategories}
          groups={groups} setGroups={setGroups} ui={ui} setUi={setUi} tile={tile} setTile={setTile}
          appearance={appearance} setAppearance={setAppearance} projects={projects} setProjects={setProjects}
          sessions={sessions} setSessions={setSessions} />
      )}
    </div>
  );
}

function ForecastPanel({ weather, city, onClose }: { weather: Weather; city: string; onClose: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      const element = target instanceof Element ? target : target.parentElement;
      if (holder.current?.contains(target) || element?.closest('[data-forecast-trigger]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [onClose]);

  return (
    <div className="nx-forecast" ref={holder} role="dialog" aria-label="Прогноз погоды на 5 дней">
      <header>
        <div>
          <span className="nx-label">{city}</span>
          <b>{weather.temp}</b>
          <span className="nx-forecast-label">{weather.label}</span>
        </div>
        <button type="button" className="nx-icon-btn" aria-label="Закрыть прогноз" onClick={onClose}><X size={16} /></button>
      </header>
      {weather.ready && (weather.humidity || weather.wind) && (
        <div className="nx-weather-stats">
          {weather.humidity && <span title="Влажность"><Droplets size={13} /> {weather.humidity}</span>}
          {weather.wind && <span title="Ветер"><Wind size={13} /> {weather.wind}</span>}
        </div>
      )}
      {weather.days.length > 0 ? (
        <ul className="nx-forecast-days">
          {weather.days.map(day => (
            <li key={day.key}>
              <span className="nx-forecast-day">{day.label}</span>
              <span className="nx-forecast-icon" aria-hidden="true">{(() => { const Icon = WEATHER_ICONS[day.code] ?? CloudSun; return <Icon size={17} />; })()}</span>
              <span className="nx-forecast-sky">{WEATHER_LABELS[day.code] ?? 'Переменная облачность'}</span>
              <span className="nx-forecast-range"><b>{day.hi}</b>{day.lo && <i>{day.lo}</i>}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nx-forecast-label">{weather.ready ? 'Прогноз недоступен' : weather.label}</p>
      )}
    </div>
  );
}

function PinMark({ site, useFavicons }: { site: Site; useFavicons: boolean }) {
  const [failed, setFailed] = useState(false);
  const icon = useFavicons && !failed && site.domain ? `https://${site.domain}/favicon.ico` : '';
  return (
    <span className={'nx-dock-mark' + (icon ? ' plain' : '')} style={icon ? undefined : { background: site.color }} aria-hidden="true">
      {icon ? <img src={icon} alt="" loading="lazy" onError={() => setFailed(true)} /> : monogram(site.title)}
    </span>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="nx-empty">
      <Search size={26} aria-hidden="true" />
      <b>{title}</b>
      <span>{hint}</span>
    </div>
  );
}
