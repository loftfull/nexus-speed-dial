import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, CloudSun, Droplets, Home, Layers3, LayoutGrid,
  Briefcase, GraduationCap, PanelLeftClose, PanelLeftOpen, ShoppingBag,
  Moon, MoreHorizontal, Plus, RotateCw, Search, Settings as SettingsIcon, SlidersHorizontal,
  Star, StickyNote, Sun, Tag, Trash2, Wind, X,
} from 'lucide-react';

import '../styles.css';
import './theme.css';

import { appReducer, createInitialAppState, persistAppState } from '../domain/appStore';
import type { AppearanceState } from '../domain/appStore';
import { seedSites } from '../domain/seed';
import { getStorageUsage, readStorage, writeStorage } from '../domain/storage';
import { makeCategoryId, makeGroupId } from '../domain/hierarchy';
import { buildWebSearchUrl } from '../domain/webSearch';
import { recordSiteOpen, resolveHistoryTarget, resolveSiteUrl } from '../domain/siteOpen';
import { filterSites } from '../domain/siteUtils';
import { sites as countSites } from '../domain/plural';
import type { Category, Project, SiteGroup, SiteRecord as Site } from '../domain/types';

import { Tile } from './Tile';
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

const WEATHER_PLACES: Record<string, [number, number]> = {
  'Москва': [55.75, 37.62], 'Санкт-Петербург': [59.93, 30.31], 'Берлин': [52.52, 13.4], 'Лондон': [51.51, -0.13],
};
const WEATHER_LABELS: Record<number, string> = {
  0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
  61: 'Небольшой дождь', 63: 'Дождь', 71: 'Снег',
};
type Weather = { temp: string; label: string; hi: string; lo: string; humidity: string; wind: string; ready: boolean };
const WEATHER_EMPTY: Weather = { temp: '—', label: 'Загрузка погоды…', hi: '', lo: '', humidity: '', wind: '', ready: false };

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
  const [omni, setOmni] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => readStorage('nexus-panel-open', true));
  const [dockOpen, setDockOpen] = useState(() => readStorage('nexus-dock-open', true));
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>(WEATHER_EMPTY);
  const storage = getStorageUsage();

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
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (!dockOpen) setSearchOpen(false); }, [dockOpen]);
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
        + `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto${unit}`)
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
      if (key === 'escape') { setCalendarOpen(false); setMobileNav(false); setSettingsOpen(false); }
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

  const selectProject = (id: string) => { setSection('sites'); setProjectId(id); setCategoryId(null); };
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
    return categoryId ? withinProject.filter(site => site.categoryId === categoryId) : withinProject;
  }, [sites, section, projectCategories, activeProjectId, categoryId]);

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
      useFavicons={useFavicons}
      showDomain={tile.showDomain === true}
      showBadge={tile.showNotifications !== false}
      onOpen={() => openSite(site)}
      onFavorite={() => toggleFavorite(site)}
      onEdit={() => setEditing(site)}
      onDelete={() => removeSite(site)}
    />
  );

  const heading = section === 'sites'
    ? (activeCategory?.name ?? activeProject?.name ?? 'Быстрый доступ')
    : SECTION_TITLE[section];
  const subheading = section === 'sites'
    ? `${view === 'groups' ? 'По группам категории' : 'Все сайты категории'} · ${countSites(found.length)}`
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
  const dockVisible = dockOpen || narrow;

  return (
    <div className={'nx-root' + (panelOpen ? '' : ' panel-collapsed')}>
      <nav className="nx-rail" aria-label="Проекты">
        <span className="nx-brand" aria-hidden="true">N</span>
        {projects.map((project, index) => {
          const Glyph = PROJECT_GLYPHS[index % PROJECT_GLYPHS.length];
          const current = section === 'sites' && activeProjectId === project.id;
          return (
            <button key={project.id} type="button" title={project.name} aria-label={`Проект «${project.name}»`} aria-current={current ? 'true' : undefined}
              className={'nx-rail-btn' + (current ? ' on' : '')} onClick={() => selectProject(project.id)}>
              <Glyph size={19} />
            </button>
          );
        })}
        <button type="button" className="nx-rail-btn" aria-label="Добавить проект" title="Добавить проект" onClick={addProject}><Plus size={19} /></button>
        <span className="nx-rail-spacer" />
        <span className="nx-rail-sep" />
        <button type="button" className="nx-rail-btn" aria-label="Настройки" title="Настройки" onClick={() => setSettingsOpen(true)}><SettingsIcon size={19} /></button>
      </nav>

      <aside className={'nx-panel' + (panelOpen ? '' : ' collapsed')}>
        <div className="nx-panel-scroll">
        <div className="nx-panel-head">
          {panelOpen && <div className="nx-panel-brand"><b>Nexus</b><span>Speed Dial</span></div>}
          <button type="button" className="nx-icon-btn nx-panel-toggle" aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            title={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            onClick={() => setPanelOpen(value => !value)}>
            {panelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {activeProject && (
          <div className="nx-section">
            {panelOpen && <span className="nx-label">Проект</span>}
            <div className="nx-project-name" title={activeProject.name}>
              <Layers3 size={17} aria-hidden="true" />
              {panelOpen && <><b>{activeProject.name}</b><em>{countSites(scoped.length)}</em></>}
            </div>
          </div>
        )}

        {section === 'sites' && panelGroups.length > 0 && (
          <div className="nx-section">
            {panelOpen && <span className="nx-label">Группы</span>}
            {panelGroups.map(({ group, count }) => (
              <button key={group.id} type="button" className="nx-link" title={group.name} onClick={() => {
                setCategoryId(group.categoryId);
                setView('groups');
                window.setTimeout(() => document.getElementById(`group-${group.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
              }}>
                <Layers3 size={17} />
                {panelOpen && <><span>{group.name}</span><i>{count}</i></>}
              </button>
            ))}
          </div>
        )}

        <div className="nx-section">
          {panelOpen && <span className="nx-label">Разделы</span>}
          {SECTIONS.map(item => (
            <button key={item.id} type="button" title={item.label} aria-label={panelOpen ? undefined : item.label}
              className={'nx-link' + (section === item.id ? ' on' : '')} onClick={() => setSection(item.id)}>
              <item.icon size={17} />
              {panelOpen && <><span>{item.label}</span>{item.id === 'trash' && trash.length > 0 && <i>{trash.length}</i>}</>}
            </button>
          ))}
        </div>

        </div>

        <div className="nx-panel-foot">
          {panelOpen && (
            <div className="nx-storage">
              <div className="nx-storage-top"><span>Хранилище</span><b>{storage.percent}%</b></div>
              <div className="nx-storage-bar"><i style={{ width: `${storage.percent}%` }} /></div>
              <small>Использовано {storage.label}</small>
            </div>
          )}
          <button type="button" data-calendar-trigger className={'nx-clock' + (calendarOpen ? ' open' : '')}
            aria-expanded={calendarOpen} aria-label="Открыть календарь" title="Открыть календарь"
            onClick={() => setCalendarOpen(value => !value)}>
            {panelOpen ? <><b>{time}</b><small>{dateLine}</small></> : <CalendarDays size={19} />}
          </button>

          {ui.weather && panelOpen && (
            <div className="nx-weather">
              <div className="nx-weather-top">
                <CloudSun size={34} aria-hidden="true" />
                <span className="nx-weather-now"><b>{weather.temp}</b><span>{weather.label}</span></span>
              </div>
              {weather.ready && (weather.hi || weather.humidity) && (
                <div className="nx-weather-stats">
                  {weather.hi && <span title="Максимум за сутки"><ChevronUp size={13} /> {weather.hi}</span>}
                  {weather.lo && <span title="Минимум за сутки"><ChevronDown size={13} /> {weather.lo}</span>}
                  {weather.humidity && <span title="Влажность"><Droplets size={13} /> {weather.humidity}</span>}
                  {weather.wind && <span title="Ветер"><Wind size={13} /> {weather.wind}</span>}
                </div>
              )}
            </div>
          )}
          {ui.weather && !panelOpen && (
            <span className="nx-weather-mini" title={`${weather.temp} · ${weather.label}`}><CloudSun size={19} aria-hidden="true" /><b>{weather.temp}</b></span>
          )}

          <div className="nx-dock-launch">
            <button type="button" className={'nx-icon-btn nx-dock-toggle' + (dockOpen ? ' on' : '')}
              aria-expanded={dockOpen} aria-controls="nx-dock"
              aria-label={dockOpen ? 'Свернуть панель быстрого доступа' : 'Развернуть панель быстрого доступа'}
              title={dockOpen ? 'Свернуть панель быстрого доступа' : 'Развернуть панель быстрого доступа'}
              onClick={() => setDockOpen(value => !value)}>
              {dockOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
            {panelOpen && <span className="nx-dock-launch-label">Быстрый доступ</span>}
          </div>
        </div>
      </aside>

      <main className="nx-main">
        <div className="nx-main-scroll">
          <div className="nx-mobile-top">
            <button type="button" className="nx-icon-btn" aria-label="Разделы" onClick={() => setMobileNav(true)}><Layers3 size={18} /></button>
            <div className="nx-mobile-card">
              <span className="nx-mobile-time"><b>{time}</b><small>{dateLine}</small></span>
              {ui.weather && <span className="nx-mobile-weather"><CloudSun size={20} aria-hidden="true" /><b>{weather.temp}</b></span>}
              <button type="button" data-calendar-trigger className="nx-mobile-cal" aria-label="Открыть календарь" aria-expanded={calendarOpen} onClick={() => setCalendarOpen(value => !value)}><CalendarDays size={18} /></button>
            </div>
            <button type="button" className="nx-icon-btn" aria-label="Настройки" onClick={() => setSettingsOpen(true)}><SettingsIcon size={18} /></button>
          </div>

          <form className="nx-omni" onSubmit={event => {
            event.preventDefault();
            const value = omni.trim();
            if (!value) return;
            const looksLikeUrl = /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
            openUrl(looksLikeUrl ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : buildWebSearchUrl(ui.searchEngine, value));
            setOmni('');
          }}>
            <Search size={18} />
            <input value={omni} onChange={event => setOmni(event.target.value)} placeholder="Введите запрос или адрес" aria-label="Запрос или адрес" />
            <button type="button" aria-label="Обновить панель" title="Обновить панель" onClick={() => window.location.reload()}><RotateCw size={16} /></button>
            <button type="button" aria-label="Сохранить как закладку" title="Сохранить как закладку" onClick={() => setAddOpen(true)}><Star size={16} /></button>
          </form>

          {showCategoryBar && (
            <nav className="nx-cats" aria-label="Категории проекта">
              <div className="nx-cats-tabs" role="tablist" aria-label="Категории проекта">
                <button type="button" role="tab" aria-selected={!categoryId} className={'nx-cat' + (categoryId ? '' : ' on')} onClick={() => setCategoryId(null)}>Все</button>
                {projectCategories.map(category => (
                  <button key={category.id} type="button" role="tab" aria-selected={categoryId === category.id}
                    className={'nx-cat' + (categoryId === category.id ? ' on' : '')} onClick={() => setCategoryId(category.id)}>
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

          <div className="nx-head">
            <div>
              <h1>{heading}</h1>
              <p>{subheading}</p>
            </div>
          </div>

          {body}
        </div>

        <div className="nx-dock-wrap" aria-hidden={!dockVisible}>
          <div className={'nx-dock' + (dockVisible ? ' open' : '') + (searchOpen ? ' searching' : '')} id="nx-dock" role="toolbar" aria-label="Панель быстрого доступа">
            {searchOpen ? (
              <label className="nx-dock-search">
                <Search size={18} />
                <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="Поиск по закладкам" aria-label="Поиск по закладкам"
                  onKeyDown={event => { if (event.key === 'Escape') { setQuery(''); setSearchOpen(false); } }} />
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
                <button type="button" className={query ? 'on' : ''} aria-label="Поиск по закладкам" title="Поиск по закладкам" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search size={19} /></button>
                <button type="button" aria-label="Добавить сайт" title="Добавить сайт (Ctrl N)" onClick={() => setAddOpen(true)}><Plus size={19} /></button>
                <button type="button" aria-label="Настройки" title="Настройки (Ctrl ,)" onClick={() => setSettingsOpen(true)}><SettingsIcon size={19} /></button>
              </>
            )}
          </div>
        </div>
      </main>

      {toast && <div className="nx-toast" role="status">{toast}</div>}
      {calendarOpen && <CalendarPopover onClose={() => setCalendarOpen(false)} />}
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

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="nx-empty">
      <Search size={26} aria-hidden="true" />
      <b>{title}</b>
      <span>{hint}</span>
    </div>
  );
}
