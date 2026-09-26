import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Check, ChevronDown, ChevronRight, ChevronUp, Clock3, CloudSun, Droplets, ExternalLink, Home, Layers3, LayoutGrid,
  Briefcase, Cloud, CloudRain, GraduationCap, Moon, ShoppingBag, Snowflake, Sun,
  ChevronLeft, Grid3X3, Keyboard, MoreHorizontal, Palette, Pencil, Plus, Rows3, RotateCw, Save, Search, Settings as SettingsIcon, SlidersHorizontal, Upload,
  Database, Star, StickyNote, SquareStack, Table2, Tag, Trash2, Wind, X,
} from './icons.generated';

import './theme.css';

import { appReducer, createInitialAppState, persistAppState } from '../domain/appStore';
import { getStorageUsage } from '../domain/storage';
import { sortSites, type SortKey } from '../domain/sortSites';
import {
  WEATHER_TTL_MS, readWeatherCache, weatherCacheAge, writeWeatherCache, type Weather,
} from '../domain/weatherCache';
import type { AppearanceState, MobileMode } from '../domain/appStore';
import { seedSites } from '../domain/seed';
import { readStorage, writeStorage } from '../domain/storage';
import { makeCategoryId, makeGroupId } from '../domain/hierarchy';
import { buildWebSearchUrl } from '../domain/webSearch';
import { recordSiteOpen, resolveHistoryTarget, resolveSiteUrl } from '../domain/siteOpen';
import { filterSites } from '../domain/siteUtils';
import { createSession, liveCount, orderSessions, removeSession, renameSession, sessionSites, touchSession } from '../domain/sessions';
import { buildPaletteItems, looksLikeUrl } from '../domain/palette';
import type { PaletteItem } from '../domain/palette';
import { categoryColor, groupColor, projectColor } from '../domain/nodeColor';
import { tileLayoutClass, toTileVars } from '../domain/tileAppearance';
import { NodeMark } from './NodeMark';
import { sites as countSites } from '../domain/plural';
import type { Category, Project, SiteGroup, SiteRecord as Site } from '../domain/types';

import { Tile } from './Tile';
import type { TileLayout } from './Tile';
import { applyWallpaperPhoto, readWallpaperPhoto } from '../domain/wallpaper';
import { Crumb } from './Breadcrumbs';
import { SiteIcon } from './SiteIcon';
import type { ControlIcon } from './SettingControls';
import { AddSiteModal } from '../components/AddSiteModal';
import { CalendarPopover } from '../components/CalendarPopover';
import { MobileSections } from '../components/MobileSections';
import { SettingsPanel, type SectionId as SettingsSectionId } from './SettingsPanel';
import { ActionDialog } from './ActionDialog';
import { CommandPalette } from './CommandPalette';
import { TileGrid, focusableInTile } from './TileGrid';
import { NotesWorkspace } from '../components/NotesWorkspace';

type SectionId = 'sites' | 'favorites' | 'trash' | 'recent' | 'notes' | 'sessions';
type AppActionDialog =
  | { kind: 'project' }
  | { kind: 'session-save'; sites: Site[] }
  | { kind: 'session-rename'; id: string; name: string }
  | { kind: 'session-open'; id: string; count: number }
  | { kind: 'category' }
  | { kind: 'group'; categoryId: string }
  | { kind: 'empty-trash' };

const SECTIONS: { id: SectionId; label: string; icon: ControlIcon }[] = [
  { id: 'sites', label: 'Быстрый доступ', icon: Home },
  { id: 'favorites', label: 'Избранное', icon: Star },
  { id: 'recent', label: 'Недавние', icon: Clock3 },
  { id: 'notes', label: 'Заметки', icon: StickyNote },
  { id: 'sessions', label: 'Сессии', icon: SquareStack },
  { id: 'trash', label: 'Корзина', icon: Trash2 },
];
const SECTION_TITLE = Object.fromEntries(SECTIONS.map(s => [s.id, s.label])) as Record<SectionId, string>;
/** Ключи иконок для палитры: сам домен остаётся без React-компонентов. */
const SECTION_PALETTE_ICON: Record<SectionId, string> = {
  sites: 'home', favorites: 'star', recent: 'clock', notes: 'note', trash: 'trash', sessions: 'session',
};
const SORTS: [SortKey, string][] = [
  ['name', 'По названию'],
  ['recent', 'По последнему открытию'],
  ['added', 'По добавлению'],
];
/** Сколько пространств видно до нажатия «Ещё». */
const SPACES_SHOWN = 5;
/** С какого числа сайтов в выборке показывать сортировку. */
const SORT_FROM = 12;
/** Сколько пространств должно остаться за кадром, чтобы «Ещё N» имела смысл. */
const MORE_FROM = 2;
/** Насколько заполненным должно быть хранилище, чтобы о нём сообщать. */
const USAGE_FROM = 70;
/** Инструменты боковой панели: каждый ведёт в свой раздел настроек. */
const PAGE = 24;
export const DOCK_DRAG_TYPE = 'application/x-nexus-site';

const WEATHER_PLACES: Record<string, [number, number]> = {
  'Москва': [55.75, 37.62], 'Санкт-Петербург': [59.93, 30.31], 'Берлин': [52.52, 13.4], 'Лондон': [51.51, -0.13],
};
const WEATHER_ICONS: Record<number, ControlIcon> = {
  0: Sun, 1: Sun, 2: CloudSun, 3: Cloud, 61: CloudRain, 63: CloudRain, 71: Snowflake,
};
const WEATHER_LABELS: Record<number, string> = {
  0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
  61: 'Небольшой дождь', 63: 'Дождь', 71: 'Снег',
};
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

  const [section, setSection] = useState<SectionId>('sites');
  const [projectId, setProjectId] = useState<string | null>(() => readStorage('nexus-active-project', null as string | null));
  const [categoryId, setCategoryId] = useState<string | null>(() => readStorage('nexus-active-category', null as string | null));
  // Настройка задаёт вид только для нового профиля: если пользователь уже
  // переключал вид руками, его выбор важнее умолчания.
  const [view, setView] = useState<'all' | 'groups'>(() => readStorage('nexus-view-mode', 'all' as 'all' | 'groups'));
  const [query, setQuery] = useState('');

  const [limit, setLimit] = useState(PAGE);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('general');
  const [allSpaces, setAllSpaces] = useState(false);
  const carousel = useRef<HTMLDivElement>(null);
  /**
   * Стрелки нужны только когда лента и правда не помещается. Раньше они
   * висели всегда: две кнопки, которые в половине случаев ничего не делают.
   * Переполнение измеряется, а не предполагается.
   */
  const [carouselOverflows, setCarouselOverflows] = useState(false);
  useEffect(() => {
    const row = carousel.current;
    if (!row || typeof ResizeObserver === 'undefined') return;
    const check = () => setCarouselOverflows(row.scrollWidth > row.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(row);
    return () => observer.disconnect();
  });
  /** Лента категорий прокручивается на ширину видимой части, а не на пиксели. */
  const scrollCarousel = (direction: 1 | -1) => {
    const row = carousel.current;
    if (row) row.scrollBy({ left: direction * Math.max(220, row.clientWidth * 0.8), behavior: 'smooth' });
  };
  const patchUi = (patch: Partial<typeof ui>) => setUi(current => ({ ...current, ...patch }));
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [actionDialog, setActionDialog] = useState<AppActionDialog | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => readStorage('nexus-panel-open', true));
  // Док открыт с самого начала: снизу теперь одна полоса, и прятать её
  // означало бы прятать часы, погоду и закреплённые сайты разом.
  const [dockOpen, setDockOpen] = useState(() => readStorage('nexus-dock-open', true));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [openProjects, setOpenProjects] = useState<string[]>(() => readStorage('nexus-open-projects', [] as string[]));
  const [openCategories, setOpenCategories] = useState<string[]>(() => readStorage('nexus-open-categories', [] as string[]));
  const [groupId, setGroupId] = useState<string | null>(() => readStorage('nexus-active-group', null as string | null));
  const [pinned, setPinned] = useState<string[]>(() => readStorage('nexus-dock-pins', [] as string[]));
  const [pinEdit, setPinEdit] = useState(false);
  const [dragOverDock, setDragOverDock] = useState(false);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>(WEATHER_EMPTY);
  // The setting holds the arrangement a narrow screen opens with; the switcher
  // above the grid changes it for this visit only.
  const [mobileView, setMobileView] = useState<MobileMode>(ui.mobileMode ?? 'table');
  const [swapping, setSwapping] = useState(false);
  const swapTimer = useRef<number | undefined>(undefined);

  const activeProjectId = projectId ?? projects[0]?.id ?? null;
  const activeProject = projects.find(item => item.id === activeProjectId) ?? null;
  const projectCategories = useMemo(
    () => categories.filter(item => item.projectId === activeProjectId),
    [categories, activeProjectId],
  );
  const activeCategory = projectCategories.find(item => item.id === categoryId) ?? null;
  const categoryGroups = useMemo(
    () => (activeCategory ? groups.filter(item => item.categoryId === activeCategory.id) : []),
    [groups, activeCategory],
  );
  const activeGroup = categoryGroups.find(item => item.id === groupId) ?? null;

  useEffect(() => { setMobileView(ui.mobileMode ?? 'table'); }, [ui.mobileMode]);
  useEffect(() => () => window.clearTimeout(swapTimer.current), []);
  useEffect(() => { if (categoryId && !activeCategory) setCategoryId(null); }, [categoryId, activeCategory]);
  useEffect(() => { persistAppState(state) || setToast('Не удалось сохранить: хранилище браузера переполнено'); }, [state]);
  useEffect(() => { writeStorage('nexus-active-project', activeProjectId); }, [activeProjectId]);
  useEffect(() => { writeStorage('nexus-active-category', categoryId); }, [categoryId]);
  useEffect(() => { writeStorage('nexus-view-mode', view); }, [view]);
  useEffect(() => { writeStorage('nexus-panel-open', panelOpen); }, [panelOpen]);
  useEffect(() => { writeStorage('nexus-dock-open', dockOpen); }, [dockOpen]);
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
    document.documentElement.dataset.wallpaper = appearance.wallpaper || 'lake';
    document.documentElement.style.setProperty('--accent', appearance.accent);
    // Своё изображение лежит отдельным ключом, поэтому переменную ставим здесь,
    // а не получаем вместе с остальным оформлением.
    applyWallpaperPhoto(readWallpaperPhoto());
    document.documentElement.style.setProperty('--nx-wall-veil', String((appearance.veil ?? 42) / 100));
    // Размытие панелей включается атрибутом, а не одним лишь нулём в
    // переменной: backdrop-filter:blur(0) всё равно заставляет браузер
    // складывать слой заново, и это видно на слабых машинах.
    const blur = appearance.panelBlur ?? 0;
    if (blur > 0) {
      document.documentElement.dataset.panelBlur = String(blur);
      document.documentElement.style.setProperty('--nx-panel-blur', `${blur}px`);
    } else {
      delete document.documentElement.dataset.panelBlur;
      document.documentElement.style.removeProperty('--nx-panel-blur');
    }
  }, [appearance]);

  useEffect(() => {
    if (!ui.weather) { setWeather(WEATHER_EMPTY); return; }
    const [latitude, longitude] = WEATHER_PLACES[ui.weatherCity] ?? WEATHER_PLACES['Москва'];
    const unit = ui.weatherUnits === 'Фаренгейт (°F)' ? '&temperature_unit=fahrenheit' : '';
    let cancelled = false;

    // Прогноз, снятый меньше срока назад, показывается сразу и запроса не
    // требует. Без этого обновление «раз в полчаса» не соблюдалось вовсе:
    // таймер живёт внутри страницы, а каждое открытие вкладки — новая
    // страница, поэтому запрос уходил каждый раз.
    const cached = readWeatherCache(ui.weatherCity, ui.weatherUnits, Date.now());

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
          const fresh: Weather = {
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
          };
          setWeather(fresh);
          writeWeatherCache(fresh, ui.weatherCity, ui.weatherUnits, Date.now());
        })
        .catch(() => { if (!cancelled) setWeather({ ...WEATHER_EMPTY, label: 'Погода недоступна' }); });
    };

    if (cached) setWeather(cached); else load();

    // Обновление продолжает идти раз в срок, но считается от времени записи:
    // вкладка, открытая через двадцать минут, ждёт десять, а не тридцать.
    let timer: number | undefined;
    if (ui.weatherAuto) {
      const left = cached
        ? Math.max(0, WEATHER_TTL_MS - weatherCacheAge(ui.weatherCity, ui.weatherUnits, Date.now()))
        : WEATHER_TTL_MS;
      timer = window.setTimeout(() => {
        load();
        timer = window.setInterval(load, WEATHER_TTL_MS);
      }, left);
    }
    return () => { cancelled = true; if (timer) { window.clearTimeout(timer); window.clearInterval(timer); } };
  }, [ui.weather, ui.weatherCity, ui.weatherUnits, ui.weatherAuto]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 'n') { event.preventDefault(); setAddOpen(true); }
      if (event.ctrlKey && key === ',') { event.preventDefault(); setSettingsOpen(true); }
      if (event.ctrlKey && key === 'b') { event.preventDefault(); setSection('favorites'); }
      // Окно поиска существует только по вызову: ⌘/Ctrl K открывает и закрывает его.
      if ((event.ctrlKey || event.metaKey) && key === 'k') { event.preventDefault(); setPaletteOpen(open => !open); }
      if (key === 'escape') {
        setPaletteOpen(false); setCalendarOpen(false); setMobileNav(false); setSettingsOpen(false); setForecastOpen(false); setAddOpen(false); setEditing(null); setActionDialog(null); }
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

  const openUrl = (url: string) => {
    if (ui.newTab === false) { window.open(url, '_self'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
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

  /**
   * Выделение. Пока оно пусто, на экране нет ни одного органа управления,
   * который бы о нём напоминал: он появляется ровно тогда, когда появляется
   * сам выбор. Это заменяет меню на каждой из девяти плиток одной полосой.
   */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const togglePicked = (id: string) => setPicked(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearPicked = () => setPicked(new Set());
  const pickedSites = useMemo(() => sites.filter(site => site.id && picked.has(site.id)), [sites, picked]);
  // Выбор живёт внутри текущей выборки: сменили категорию — он теряет смысл.
  useEffect(() => { setPicked(new Set()); }, [activeProjectId, categoryId, groupId, section]);

  const selectProject = (id: string) => { setSection('sites'); setProjectId(id); setCategoryId(null); setGroupId(null); };
  const addProject = () => setActionDialog({ kind: 'project' });
  const addCategory = () => {
    if (!activeProjectId) { setToast('Сначала создайте проект'); return; }
    setActionDialog({ kind: 'category' });
  };
  const addGroup = (targetCategoryId: string) => setActionDialog({ kind: 'group', categoryId: targetCategoryId });

  const submitActionDialog = (value: string) => {
    const action = actionDialog;
    if (!action) return;

    if (action.kind === 'project') {
      if (projects.some(item => item.name.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) {
        setToast('Такой проект уже есть');
        return;
      }
      const project: Project = {
        id: `project-${Date.now()}`,
        name: value,
        color: '#3b7df0',
        icon: value[0],
        siteIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setProjects(current => [...current, project]);
      selectProject(project.id);
      setActionDialog(null);
      return;
    }

    if (action.kind === 'category') {
      if (!activeProjectId) { setToast('Сначала создайте проект'); setActionDialog(null); return; }
      if (projectCategories.some(item => item.name.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) {
        setToast('Такая категория уже есть');
        return;
      }
      const created: Category = { id: makeCategoryId(value, activeProjectId), name: value, projectId: activeProjectId };
      setCategories(current => [...current, created]);
      setSection('sites');
      setCategoryId(created.id);
      setActionDialog(null);
      return;
    }

    if (action.kind === 'group') {
      if (groups.some(item => item.categoryId === action.categoryId && item.name.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) {
        setToast('Такая группа уже есть');
        return;
      }
      setGroups(current => [...current, { id: makeGroupId(value, action.categoryId), name: value, categoryId: action.categoryId }]);
      setActionDialog(null);
      return;
    }

    if (action.kind === 'session-save') {
      try {
        const session = createSession({ name: value, sites: action.sites, projectId: activeProjectId ?? undefined });
        setSessions(current => [session, ...current]);
        setToast(`Сессия «${session.name}» сохранена`);
      } catch (error) {
        setToast(error instanceof Error ? error.message : 'Не удалось сохранить сессию');
      }
      setActionDialog(null);
      return;
    }

    if (action.kind === 'session-rename') {
      setSessions(current => renameSession(current, action.id, value));
      setActionDialog(null);
      return;
    }

    if (action.kind === 'session-open') {
      openSession(action.id);
      setActionDialog(null);
      return;
    }

    setTrash([]);
    setToast('Корзина очищена');
    setActionDialog(null);
  };

  const scoped = useMemo(() => {
    if (section === 'favorites') return sites.filter(site => site.favorite);
    const ids = new Set(projectCategories.map(item => item.id));
    const withinProject = activeProjectId ? sites.filter(site => ids.has(site.categoryId ?? '')) : sites;
    const withinCategory = categoryId ? withinProject.filter(site => site.categoryId === categoryId) : withinProject;
    return groupId ? withinCategory.filter(site => site.groupId === groupId) : withinCategory;
  }, [sites, section, projectCategories, activeProjectId, categoryId, groupId]);

  const found = useMemo(
    () => {
      const list = ui.searchLocal === false || !query
        ? scoped
        : filterSites(scoped, query, {}, 'Быстрый доступ', () => []);
      // Во время поиска порядок задаёт релевантность, а не выбранная
      // сортировка: переставить найденное по алфавиту значит спрятать
      // лучшее совпадение где-то в середине.
      return query ? list : sortSites(list, ui.sortBy ?? 'name');
    },
    [scoped, query, ui.searchLocal, ui.sortBy],
  );

  // ─── Сессии ───────────────────────────────────────────────────────────────
  // Сессия — папка с набором сайтов: тем, что открыт в браузере сейчас, или
  // тем, что выбран в приложении. Раньше её можно было только сохранить при
  // импорте вкладок, а открыть — нигде.
  const projectSessions = useMemo(() => orderSessions(sessions, activeProjectId), [sessions, activeProjectId]);

  const openSession = (id: string) => {
    const session = sessions.find(item => item.id === id);
    if (!session) return;
    const list = sessionSites(session, sites);
    if (!list.length) { setToast('В этой сессии не осталось сохранённых сайтов'); return; }
    setSessions(current => touchSession(current, id));
    list.forEach(openSite);
    setToast(`Открыто ${countSites(list.length)} из сессии «${session.name}»`);
  };

  const askOpenSession = (id: string) => {
    const session = sessions.find(item => item.id === id);
    if (!session) return;
    const count = liveCount(session, sites);
    // Много вкладок разом — заметное действие, поэтому спрашиваем.
    if (count > 6) { setActionDialog({ kind: 'session-open', id, count }); return; }
    openSession(id);
  };

  const saveSession = (list: Site[]) => {
    if (!list.length) { setToast('Сначала выберите, что сохранить'); return; }
    setActionDialog({ kind: 'session-save', sites: list });
  };

  // Недавние занимают пустоту под деревом проектов: раньше половина панели
  // не несла ничего. Список берётся из истории и свёрнут до последних.
  const panelRecent = useMemo(() => {
    if (!panelOpen || ui.panelRecent === false) return [];
    const limit = ui.panelRecentCount ?? 6;
    const seen = new Set<string>();
    const found: Site[] = [];
    for (const ref of history) {
      const site = sites.find(item => item.id === ref || item.domain === ref || item.title === ref);
      if (!site || seen.has(site.id ?? site.domain)) continue;
      seen.add(site.id ?? site.domain);
      found.push(site);
      if (found.length >= limit) break;
    }
    return found;
  }, [history, sites, panelOpen, ui.panelRecent, ui.panelRecentCount]);

  /**
   * Недавние для правого рельса. Считаются отдельно от панельных: те
   * пропадают вместе со свёрнутым боковым окном, а рельс живёт своей жизнью
   * и должен оставаться наполненным.
   */
  const railRecent = useMemo(() => {
    const seen = new Set<string>();
    const found: Site[] = [];
    for (const ref of history) {
      const site = sites.find(item => item.id === ref || item.domain === ref || item.title === ref);
      if (!site || seen.has(site.id ?? site.domain)) continue;
      seen.add(site.id ?? site.domain);
      found.push(site);
      if (found.length >= 5) break;
    }
    return found;
  }, [history, sites]);

  // Избранное живёт над сеткой и одинаково в любом проекте — как ряд избранных
  // вкладок в Arc. На узком экране полосы нет: там дорог каждый пиксель высоты.
  const favoriteBar = useMemo(() => {
    if (narrow || ui.favoritesBar === false || section !== 'sites') return [];
    const limit = ui.favoritesCount ?? 8;
    return sites.filter(site => site.favorite).slice(0, limit);
  }, [sites, narrow, ui.favoritesBar, ui.favoritesCount, section]);

  // ─── Палитра ──────────────────────────────────────────────────────────────
  // Окно поиска открывается только по вызову и ищет по всему хранилищу, а не по
  // текущему разделу: сайт находится, даже когда неизвестно, в каком он проекте.
  const paletteCommands = useMemo(() => {
    const list = [
      { id: 'add-site', title: 'Добавить сайт', hint: 'Новая закладка', shortcut: 'Ctrl N', keywords: 'создать закладку новый', icon: 'plus' },
      { id: 'add-project', title: 'Новый проект', hint: 'Отдельное пространство', keywords: 'создать проект', icon: 'project' },
      { id: 'add-category', title: 'Новая категория', hint: 'Внутри текущего проекта', keywords: 'создать категорию', icon: 'category' },
      { id: 'settings', title: 'Настройки', hint: 'Оформление, панели, данные', shortcut: 'Ctrl ,', keywords: 'параметры опции', icon: 'settings' },
      { id: 'toggle-dock', title: dockOpen ? 'Скрыть док-панель' : 'Показать док-панель', hint: 'Закреплённые сайты', keywords: 'док закреплённые', icon: 'dock' },
      { id: 'empty-trash', title: 'Очистить корзину', hint: `В корзине ${countSites(trash.length)}`, keywords: 'удалить корзину', icon: 'trash' },
      { id: 'save-session', title: 'Сохранить сессию', hint: 'Набор сайтов, открытых на экране', keywords: 'сессия вкладки набор', icon: 'session' },
    ];
    // Проводника на узком экране нет вовсе, поэтому и команды о нём там нет.
    if (!narrow) {
      list.splice(4, 0, {
        id: 'toggle-panel', title: panelOpen ? 'Скрыть проводник' : 'Показать проводник',
        hint: 'Боковая панель', keywords: 'сайдбар панель дерево', icon: 'panel',
      });
    }
    if (query) list.unshift({ id: 'clear-filter', title: 'Сбросить фильтр сетки', hint: `Сейчас: «${query}»`, keywords: 'очистить фильтр', icon: 'clear' });
    return list;
  }, [panelOpen, dockOpen, trash.length, query, narrow]);

  const paletteItems = useMemo(() => buildPaletteItems({
    sites, projects, categories, groups,
    sections: SECTIONS.map(item => ({
      id: item.id, label: item.label, icon: SECTION_PALETTE_ICON[item.id],
      shortcut: item.id === 'favorites' ? 'Ctrl B' : undefined,
    })),
    commands: paletteCommands,
    includeSites: ui.searchLocal !== false,
    colorOf: (kind, id) => {
      if (kind === 'project') { const found = projects.find(item => item.id === id); return found ? projectColor(found) : undefined; }
      if (kind === 'category') return categoryColor({ id });
      return groupColor({ id });
    },
  }), [sites, projects, categories, groups, paletteCommands, ui.searchLocal]);

  // Хвост списка: то, что зависит от набранного текста и потому не хранится в модели.
  const paletteTail = useCallback((value: string): PaletteItem[] => {
    const text = value.trim();
    if (!text) return [];
    const tail: PaletteItem[] = [];
    // Фильтр сетки предлагаем, только когда поиск по закладкам включён, —
    // иначе кнопка ничего бы не делала.
    if (ui.searchLocal !== false) {
      tail.push({ id: 'command:filter', kind: 'command', ref: 'filter', title: `Отфильтровать сетку: «${text}»`,
        hint: 'Оставить в текущем разделе только совпадения', keywords: '', icon: 'filter' });
    }
    tail.push(looksLikeUrl(text)
      ? { id: 'web:open', kind: 'web', ref: 'open', title: `Открыть ${text}`, hint: 'Адрес', keywords: '', icon: 'open',
          url: /^https?:\/\//i.test(text) ? text : `https://${text}` }
      : { id: 'web:search', kind: 'web', ref: 'search', title: `Искать «${text}»`, hint: `Поиск в ${ui.searchEngine}`, keywords: '', icon: 'search' });
    return tail;
  }, [ui.searchLocal, ui.searchEngine]);

  const runPaletteItem = (item: PaletteItem, value: string) => {
    setPaletteOpen(false);
    if (item.kind === 'site') {
      const site = sites.find(entry => (entry.id ?? entry.domain) === item.ref);
      if (site) openSite(site);
      return;
    }
    if (item.kind === 'project') { selectProject(item.ref); return; }
    if (item.kind === 'category') {
      const category = categories.find(entry => entry.id === item.ref);
      if (!category) return;
      setSection('sites'); setProjectId(category.projectId); setCategoryId(category.id); setGroupId(null);
      return;
    }
    if (item.kind === 'group') {
      const group = groups.find(entry => entry.id === item.ref);
      const category = group ? categories.find(entry => entry.id === group.categoryId) : undefined;
      if (!group || !category) return;
      setSection('sites'); setProjectId(category.projectId); setCategoryId(category.id); setGroupId(group.id);
      return;
    }
    if (item.kind === 'section') { setSection(item.ref as SectionId); return; }
    if (item.kind === 'web') {
      openUrl(item.ref === 'open' && item.url ? item.url : buildWebSearchUrl(ui.searchEngine, value));
      return;
    }
    switch (item.ref) {
      case 'add-site': setAddOpen(true); break;
      case 'add-project': addProject(); break;
      case 'add-category': addCategory(); break;
      case 'settings': setSettingsOpen(true); break;
      case 'toggle-panel': setPanelOpen(open => !open); break;
      case 'toggle-dock': setDockOpen(open => !open); break;
      case 'empty-trash': setActionDialog({ kind: 'empty-trash' }); break;
      case 'save-session': saveSession(scoped); break;
      case 'filter': setQuery(value.trim()); break;
      case 'clear-filter': setQuery(''); break;
    }
  };

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

  /** How many sites sit under each node of the explorer tree. */
  const treeCounts = useMemo(() => {
    const byCategory = new Map<string, number>();
    const byGroup = new Map<string, number>();
    sites.forEach(site => {
      if (site.categoryId) byCategory.set(site.categoryId, (byCategory.get(site.categoryId) ?? 0) + 1);
      if (site.groupId) byGroup.set(site.groupId, (byGroup.get(site.groupId) ?? 0) + 1);
    });
    const byProject = new Map<string, number>();
    categories.forEach(category => {
      byProject.set(category.projectId, (byProject.get(category.projectId) ?? 0) + (byCategory.get(category.id) ?? 0));
    });
    return { byProject, byCategory, byGroup };
  }, [sites, categories]);

  const shown = found.slice(0, limit);
  const useFavicons = ui.siteIcons !== false;
  // A narrow screen follows its own three arrangements; a wide one follows the tile mode.
  const MOBILE_LAYOUT: Record<MobileMode, TileLayout> = { table: 'table', rows: 'row', icons: 'icon' };
  const layout: TileLayout = narrow ? MOBILE_LAYOUT[mobileView] : ((tile.mode ?? 'standard') as TileLayout);
  const gridClass = 'nx-grid ' + tileLayoutClass(layout as typeof tile.mode);

  /**
   * Мобильные виды названы «Таблица с описанием» и «Строки с подробным
   * описанием» — название обещает описание, значит оно и показывается,
   * независимо от умолчания сетки. Это не раскладка спорит с настройкой:
   * это другой контрол, и обещание даёт он.
   */
  const mobileDetailed = narrow && (mobileView === 'table' || mobileView === 'rows');
  const showDescription = mobileDetailed || tile.showDescription;
  const showDomain = (narrow && mobileView === 'rows') || tile.showDomain;

  const renderTile = (site: Site) => (
    <Tile
      key={site.id}
      site={site}
      dragType={DOCK_DRAG_TYPE}
      layout={layout}
      useFavicons={useFavicons}
      showDomain={showDomain}
      showDescription={showDescription}
      showCategory={tile.showCategory}
      selected={Boolean(site.id) && picked.has(site.id!)}
      selecting={picked.size > 0}
      onSelectToggle={site.id ? () => togglePicked(site.id!) : undefined}
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
            <TileGrid className={gridClass}>{block.sites.map(renderTile)}</TileGrid>
          </section>
        ))}</div>
      : <Empty icon={LayoutGrid} title="Здесь пока пусто" hint="Добавьте первый сайт в эту категорию"
          action={{ label: 'Добавить сайт', icon: Plus, onClick: () => setAddOpen(true) }} />)
    : (shown.length
      ? <>
          <TileGrid className={gridClass}>{shown.map(renderTile)}</TileGrid>
          {found.length > shown.length && (
            <button type="button" className="nx-more" onClick={() => setLimit(value => value + PAGE)}>
              <MoreHorizontal size={16} /> Показать больше
            </button>
          )}
        </>
      : (query
        ? <Empty icon={Search} title="Ничего не найдено" hint={`В этом разделе нет совпадений с «${query}»`}
            action={{ label: 'Сбросить фильтр', icon: X, onClick: () => setQuery('') }} />
        : <Empty icon={LayoutGrid} title="Здесь пока пусто" hint="Добавьте первый сайт"
            action={{ label: 'Добавить сайт', icon: Plus, onClick: () => setAddOpen(true) }} />));

  let body: React.ReactNode;
  if (section === 'trash') {
    body = trash.length ? (
      <>
        <div className={gridClass}>
          {trash.map(site => (
            <div className="nx-tile" key={site.id}>
              <div className="nx-tile-face">
                <SiteIcon title={site.title} domain={site.domain} color={site.color} logos={useFavicons} />
                <span className="nx-tile-name">{site.title}</span>
                <span className="nx-tile-sub">{site.domain}</span>
              </div>
              <button type="button" className="nx-more nx-restore" onClick={() => {
                setSites(current => [site, ...current]);
                setTrash(current => current.filter(item => item.id !== site.id));
                setToast('Сайт восстановлен');
              }}><RotateCw size={14} /> Восстановить</button>
            </div>
          ))}
        </div>
        <button type="button" className="nx-more" onClick={() => setActionDialog({ kind: 'empty-trash' })}>
          <Trash2 size={15} /> Очистить корзину
        </button>
      </>
    ) : <Empty icon={Trash2} title="Корзина пуста" hint="Удалённые сайты можно восстановить отсюда"
          action={{ label: 'К сайтам', icon: Home, onClick: () => setSection('sites') }} />;
  } else if (section === 'recent') {
    const items = history.map(ref => sites.find(site => site.id === ref || site.domain === ref || site.title === ref)).filter(Boolean) as Site[];
    body = items.length
      ? <TileGrid className={gridClass}>{items.map((site, index) => <React.Fragment key={`${site.id}-${index}`}>{renderTile(site)}</React.Fragment>)}</TileGrid>
      : <Empty icon={Clock3} title="Пока ничего не открывали" hint="Открытые сайты появятся здесь"
          action={{ label: 'К сайтам', icon: Home, onClick: () => setSection('sites') }} />;
  } else if (section === 'sessions') {
    body = projectSessions.length ? (
      <div className="nx-sessions">
        {projectSessions.map(session => {
          const inside = sessionSites(session, sites);
          const owner = projects.find(item => item.id === session.projectId);
          return (
            <article className="nx-session" key={session.id}>
              <div className="nx-session-head">
                <div className="nx-session-name">
                  <b>{session.name}</b>
                  <span>{owner ? `${owner.name} · ` : ''}{countSites(inside.length)}</span>
                </div>
                <button type="button" className="nx-session-open" onClick={() => askOpenSession(session.id)}
                  disabled={!inside.length}
                  title={inside.length ? 'Открыть все сайты сессии' : 'Сайты этой сессии удалены'}>
                  <ExternalLink size={15} aria-hidden="true" />Открыть
                </button>
              </div>
              <div className="nx-session-sites">
                {inside.slice(0, 12).map(item => (
                  <button key={item.id ?? item.domain} type="button" className="nx-session-site"
                    title={`${item.title} · ${item.domain}`} onClick={() => openSite(item)}>
                    <SiteIcon title={item.title} domain={item.domain} color={item.color}
                      logos={useFavicons} className="nx-mark nx-session-mark" />
                  </button>
                ))}
                {inside.length > 12 && <span className="nx-session-more">+{inside.length - 12}</span>}
              </div>
              <div className="nx-session-actions">
                <button type="button" onClick={() => setActionDialog({ kind: 'session-rename', id: session.id, name: session.name })}>
                  <Pencil size={14} aria-hidden="true" />Переименовать
                </button>
                <button type="button" className="danger" onClick={() => {
                  setSessions(current => removeSession(current, session.id));
                  setToast(`Сессия «${session.name}» удалена`);
                }}>
                  <Trash2 size={14} aria-hidden="true" />Удалить
                </button>
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <Empty icon={SquareStack} title="Сессий пока нет"
        hint="Сессия сохраняет набор сайтов проекта, чтобы открыть их все разом"
        action={{ label: 'Сохранить текущие сайты', icon: Plus, onClick: () => saveSession(scoped) }} />
    );
  } else if (section === 'notes') {
    body = <NotesWorkspace sites={sites.filter(site => site.note)} onEdit={setEditing} />;
  } else {
    body = grid;
  }

  // Ссылка в начале страницы ведёт прямо к плиткам — к той, что держит
  // бегущий tabindex, а если сетка пуста, к первому, что в разделе есть.
  const focusGrid = () => {
    const grid = document.querySelector('.nx-main .nx-grid');
    const target = grid?.querySelector<HTMLElement>('.nx-tile button.nx-tile-face[tabindex="0"]')
      ?? grid?.querySelector<HTMLElement>('.nx-tile button.nx-tile-face')
      // На доске плиток нет, а ссылка обещает «перейти к сайтам»: ведём к
      // первой строке сайта в папках, а не к кнопке поиска в шапке — иначе
      // подпись ссылки расходится с тем, куда она приводит.
      ?? document.querySelector<HTMLElement>('.nx-folder li > button')
      ?? document.querySelector<HTMLElement>('.nx-main-scroll button, .nx-main-scroll a');
    target?.focus();
  };

  const showCategoryBar = section === 'sites';
  // Переключатель раскладки на узком экране стоит в одной строке с кнопкой
  // проекта, а не отдельной полосой: на 390 px каждая строка сверху — это
  // минус одна плитка на первом экране. Вне «Быстрого доступа» строки с
  // категориями нет, поэтому там он идёт сам по себе.
  const mobileViews = narrow ? (
    <div className="nx-mobile-views" role="group" aria-label="Вид сетки на узком экране">
      <button type="button" className={mobileView === 'table' ? 'on' : ''} aria-pressed={mobileView === 'table'}
        aria-label="Таблица в два столбца" title="Таблица в два столбца" onClick={() => setMobileView('table')}><Table2 size={17} /></button>
      <button type="button" className={mobileView === 'rows' ? 'on' : ''} aria-pressed={mobileView === 'rows'}
        aria-label="Строки с подробным описанием" title="Строки с подробным описанием" onClick={() => setMobileView('rows')}><Rows3 size={17} /></button>
      <button type="button" className={mobileView === 'icons' ? 'on' : ''} aria-pressed={mobileView === 'icons'}
        aria-label="Иконки в четыре столбца" title="Иконки в четыре столбца" onClick={() => setMobileView('icons')}><Grid3X3 size={17} /></button>
    </div>
  ) : null;
  const pinnedSites = pinned.map(id => sites.find(site => site.id === id)).filter(Boolean) as Site[];
  const showExplorer = ui.projects !== false;

  /** Steps to the next project and lets the panel and the grid fade across. */
  const cycleProject = () => {
    if (projects.length < 2) return;
    const at = projects.findIndex(item => item.id === activeProjectId);
    const next = projects[(at + 1 + projects.length) % projects.length];
    selectProject(next.id);
    setOpenProjects([next.id]);
    setOpenCategories([]);
    if (ui.animations === false) return;
    window.clearTimeout(swapTimer.current);
    setSwapping(true);
    swapTimer.current = window.setTimeout(() => setSwapping(false), 340);
  };

  /**
   * Видимые пространства: первые пять плюс выбранное, если оно не попало в
   * это число. Без второго слагаемого только что созданное пространство
   * пряталось за «Ещё» — человек заводил его и не находил на экране.
   */
  const shownProjects = useMemo(() => {
    if (allSpaces) return projects;
    const head = projects.slice(0, SPACES_SHOWN);
    const active = projects.find(item => item.id === activeProjectId);
    return active && !head.includes(active) ? [...head, active] : head;
  }, [projects, allSpaces, activeProjectId]);
  // Пересчитывается при каждой правке хранилища: показатель обязан быть живым,
  // иначе он хуже, чем ничего.
  const usage = useMemo(() => getStorageUsage(), [sites, projects, categories, groups, sessions, ui, tile, appearance]);

  const rootClass = [
    'nx-root',
    panelOpen ? '' : 'panel-collapsed',
    ui.compact ? 'compact' : '',
    ui.animations === false ? 'still' : '',
    swapping ? 'swapping' : '',
  ].filter(Boolean).join(' ');
  // Все параметры плитки доходят до экрана одним набором переменных.
  const rootStyle = {
    '--nx-panel-open-w': ui.sidebarWidth ?? '292px',
    ...toTileVars(tile),
  } as React.CSSProperties;

  return (
    <div className={rootClass} style={rootStyle}>
      {/* Первая остановка табуляции: до сетки иначе двадцать нажатий Tab. */}
      <button type="button" className="nx-skip" onClick={focusGrid}>Перейти к сайтам</button>
      <aside className={'nx-panel' + (panelOpen ? '' : ' collapsed')}>
        <div className="nx-panel-scroll">
          <button type="button" className="nx-panel-head" aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            title={panelOpen ? 'Свернуть боковое окно' : 'Развернуть боковое окно'}
            onClick={() => setPanelOpen(value => !value)}>
            <span className="nx-brand" aria-hidden="true">N</span>
            {panelOpen && <span className="nx-panel-brand"><b>Nexus</b><span>Speed Dial</span></span>}
          </button>

          {/* Разделы приложения. В макете они стоят первыми и выглядят как
              навигация, а не как кнопки на доке: именно отсюда переключаются
              между быстрым доступом, избранным, заметками и корзиной. */}
          <nav className="nx-nav" aria-label="Разделы">
            {SECTIONS.map(item => {
              const Glyph = item.icon;
              const on = section === item.id;
              // Здесь напрашивалось правило «пустой раздел не занимает экран»,
              // и я его сделал. Проверки показали, почему это неверно: у
              // каждого раздела есть спроектированное пустое состояние со
              // своим следующим шагом — «Сессий пока нет» предлагает сохранить
              // текущие сайты. Скрыв строку, я убрал единственный путь к этому
              // предложению. Разделы — это навигация, а не хром; сокращать
              // надо второе.
              return (
                <button key={item.id} type="button" className={'nx-link' + (on ? ' on' : '')}
                  aria-current={on ? 'page' : undefined} title={item.label}
                  onClick={() => setSection(item.id)}>
                  <Glyph size={18} weight={on ? 'duotone' : 'regular'} />
                  {panelOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {showExplorer && (
          <div className="nx-section">
            {panelOpen
              ? <span className="nx-label nx-label-row">Пространства<button type="button" aria-label="Добавить пространство" title="Добавить пространство" onClick={addProject}><Plus size={14} /></button></span>
              : <button type="button" className="nx-link nx-link-ghost" aria-label="Добавить пространство" title="Добавить пространство" onClick={addProject}><Plus size={17} /></button>}

            {/* Плоский список, а не дерево: категории и группы показывает сама
                рабочая область — цепочкой крошек, каруселью и чипами. Дерево
                в панели повторяло бы то же самое второй раз. */}
            {shownProjects.map((project, index) => {
              const current = activeProjectId === project.id && section === 'sites';
              return (
                <button key={project.id} type="button" className={'nx-link' + (current ? ' on' : '')}
                  style={{ '--nx-node': projectColor(project) } as React.CSSProperties}
                  title={project.name} aria-label={`Пространство «${project.name}»`}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => selectProject(project.id)}>
                  <NodeMark name={project.name} size={18} active={current} />
                  {panelOpen && <span>{project.name}</span>}
                  {panelOpen && treeCounts.byProject.get(project.id) ? <i>{treeCounts.byProject.get(project.id)}</i> : null}
                </button>
              );
            })}

            {panelOpen && projects.length > SPACES_SHOWN + MORE_FROM - 1 && (
              <button type="button" className="nx-link nx-link-ghost" aria-expanded={allSpaces}
                onClick={() => setAllSpaces(value => !value)}>
                <ChevronDown size={18} className={'nx-tree-caret' + (allSpaces ? ' open' : '')} aria-hidden="true" />
                <span>{allSpaces ? 'Свернуть' : `Ещё ${projects.length - SPACES_SHOWN}`}</span>
              </button>
            )}
          </div>
          )}

          {/* Инструменты ведут прямо в нужный раздел настроек. «Справки» здесь
              нет намеренно: раздела помощи в приложении не существует, а
              кнопка без действия в этом проекте запрещена отдельной проверкой.

              Пять строк держались на экране всегда, хотя открывают их раз в
              месяц. Осталась одна — и ничего не потеряно: все пять вели в
              разделы одного и того же окна настроек, и там эти разделы никуда
              не делись. Первая попытка была хуже: список прятался за
              раскрывающейся строкой, и до самих настроек становилось два
              нажатия вместо одного. Проверки это поймали. */}
          <div className="nx-section">
            <button type="button" className="nx-link" title="Настройки"
              onClick={() => { setSettingsSection('general'); setSettingsOpen(true); }}>
              <SettingsIcon size={18} />
              {panelOpen && <span>Настройки</span>}
            </button>
          </div>

          {panelRecent.length > 0 && (
            <section className="nx-section nx-recent-block" aria-label="Недавно открытые">
              <span className="nx-label">Недавние</span>
              <div className="nx-recent-list">
                {panelRecent.map(site => (
                  <button key={site.id ?? site.domain} type="button" className="nx-recent-row"
                    title={`${site.title} · ${site.domain}`} onClick={() => openSite(site)}>
                    <SiteIcon title={site.title} domain={site.domain} color={site.color}
                      logos={ui.siteIcons !== false} className="nx-mark nx-recent-mark" />
                    {ui.panelRecentLabels !== false && <span>{site.title}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Подвал панели. В макете тут стояла карточка с лозунгом; вместо неё
            показатель, который действительно может понадобиться: сколько
            места занято в хранилище браузера. Потолок там около пяти
            мегабайт, и упереться в него — реальный сценарий. */}
        {/* Хранилище показывается только когда о нём есть что сказать. Строка
            «1 КБ из 5 МБ» — это сообщение «всё в порядке», а такие сообщения
            экран не должны занимать. */}
        <div className="nx-panel-foot" hidden={usage.percent < USAGE_FROM}>
          {panelOpen ? (
            <button type="button" className="nx-usage" title="Открыть раздел «Данные»"
              onClick={() => { setSettingsSection('data'); setSettingsOpen(true); }}>
              <span className="nx-usage-top">
                <b>Хранилище</b>
                <small>{usage.label}</small>
              </span>
              <span className="nx-usage-bar" aria-hidden="true">
                <span style={{ width: `${usage.percent}%` }} />
              </span>
            </button>
          ) : (
            <button type="button" className="nx-link" title={`Хранилище: ${usage.label}`}
              aria-label={`Хранилище: ${usage.label}`}
              onClick={() => { setSettingsSection('data'); setSettingsOpen(true); }}>
              <Database size={17} />
            </button>
          )}
        </div>
      </aside>

      <main className="nx-main">
        {/* Верхняя строка. Цепочка крошек здесь не просто показывает путь, а
            переключает ветки: каждое звено раскрывается списком соседей.
            Кнопок окна (свернуть, развернуть, закрыть) нет намеренно —
            это страница новой вкладки, а не отдельное окно, и рисовать
            органы управления, которые ничем не управляют, нельзя. */}
        {section === 'sites' && !narrow && (
          <header className="nx-topbar">
            <button type="button" className="nx-top-home" aria-label="В начало"
              title="В начало: всё пространство целиком"
              onClick={() => { setCategoryId(null); setGroupId(null); }}>
              <Home size={18} weight="duotone" />
            </button>

            <nav className="nx-crumbs-row" aria-label="Путь">
              <Crumb kind="space" current={activeProject ? { id: activeProject.id, name: activeProject.name } : null}
                options={projects.map(item => ({ id: item.id, name: item.name, count: treeCounts.byProject.get(item.id) }))}
                onPick={selectProject} />
              <ChevronRight size={15} className="nx-crumb-sep" aria-hidden="true" />
              <Crumb kind="category" current={activeCategory ? { id: activeCategory.id, name: activeCategory.name } : null}
                options={projectCategories.map(item => ({ id: item.id, name: item.name, count: treeCounts.byCategory.get(item.id) }))}
                onPick={value => { setCategoryId(value); setGroupId(null); }}
                onClear={() => { setCategoryId(null); setGroupId(null); }} />
              {activeCategory && (
                <>
                  <ChevronRight size={15} className="nx-crumb-sep" aria-hidden="true" />
                  <Crumb kind="group" current={activeGroup ? { id: activeGroup.id, name: activeGroup.name } : null}
                    options={categoryGroups.map(item => ({ id: item.id, name: item.name, count: treeCounts.byGroup.get(item.id) }))}
                    onPick={value => setGroupId(value)}
                    onClear={() => setGroupId(null)} />
                </>
              )}
            </nav>

            <div className="nx-top-actions">
              <button type="button" className="nx-top-search" onClick={() => setPaletteOpen(true)}
                aria-haspopup="dialog" aria-label="Поиск и команды">
                <Search size={17} aria-hidden="true" />
                <span>Ctrl + K</span>
              </button>
              <button type="button" className="nx-icon-btn" title="Сменить тему"
                aria-label={`Сменить тему, сейчас ${appearance.theme === 'dark' ? 'тёмная' : 'светлая'}`}
                onClick={() => setAppearance({ ...appearance, theme: appearance.theme === 'dark' ? 'light' : 'dark' })}>
                {appearance.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button type="button" className={'nx-icon-btn' + (dockOpen ? ' on' : '')}
                aria-pressed={dockOpen} aria-controls="nx-dock"
                title="Нижняя панель" aria-label="Нижняя панель"
                onClick={() => setDockOpen(value => !value)}>
                <LayoutGrid size={18} />
              </button>
            </div>
          </header>
        )}

        <div className="nx-main-scroll">
          <div className="nx-mobile-top">
            <button type="button" className="nx-icon-btn" aria-label="Разделы" onClick={() => setMobileNav(true)}><Layers3 size={18} /></button>
            <div className="nx-mobile-card">
              <button type="button" data-calendar-trigger className="nx-mobile-time"
                aria-expanded={calendarOpen} aria-label={`Открыть календарь, сегодня ${dateLine}`}
                onClick={() => { setForecastOpen(false); setCalendarOpen(value => !value); }}>
                {/* На узком экране в карточке помещается половина ширины, и полная
                    дата обрывалась на «Среда, 1…» — обрезка вместо сведения.
                    Короткий формат говорит то же самое и целиком; полная дата
                    остаётся в подписи для чтения с экрана. */}
                <b>{time}</b><small>{dateShort}</small>
              </button>
              {ui.weather && (
                <button type="button" data-forecast-trigger className="nx-mobile-weather"
                  aria-expanded={forecastOpen} aria-label={`Прогноз на пять дней, сейчас ${weather.temp}`}
                  onClick={() => { setCalendarOpen(false); setForecastOpen(value => !value); }}>
                  <CloudSun size={20} aria-hidden="true" /><b>{weather.temp}</b>
                </button>
              )}
            </div>
            <button type="button" className={'nx-icon-btn' + (dockOpen ? ' on' : '')} aria-pressed={dockOpen} aria-controls="nx-dock"
              aria-label="Нижняя панель" title="Нижняя панель"
              onClick={() => setDockOpen(value => !value)}><LayoutGrid size={18} /></button>
            <button type="button" className="nx-icon-btn" aria-label="Поиск и команды" title="Поиск и команды"
              aria-haspopup="dialog" onClick={() => setPaletteOpen(true)}><Search size={18} /></button>
            <button type="button" className="nx-icon-btn" aria-label="Настройки" onClick={() => setSettingsOpen(true)}><SettingsIcon size={18} /></button>
          </div>

          {showCategoryBar && (
            <>
              {/* Карусель категорий: карточка с иконкой вместо строчки текста.
                  Категорий у пространства бывает десяток, в строку они не
                  влезают, поэтому лента прокручивается стрелками. */}
              <nav className="nx-carousel" aria-label="Категории пространства">
                {carouselOverflows && (
                <button type="button" className="nx-carousel-arrow" aria-label="Левее"
                  onClick={() => scrollCarousel(-1)}><ChevronLeft size={18} /></button>
                )}
                <div className="nx-carousel-row" ref={carousel}>
                  <button type="button" className={'nx-cat-card' + (categoryId ? '' : ' on')}
                    aria-current={categoryId ? undefined : 'true'}
                    onClick={() => { setCategoryId(null); setGroupId(null); }}>
                    <LayoutGrid size={22} weight={categoryId ? 'regular' : 'duotone'} aria-hidden="true" />
                    <span>Все</span>
                  </button>
                  {projectCategories.map(category => (
                    <button key={category.id} type="button"
                      className={'nx-cat-card' + (categoryId === category.id ? ' on' : '')}
                      style={{ '--nx-node': categoryColor(category) } as React.CSSProperties}
                      aria-current={categoryId === category.id ? 'true' : undefined}
                      onClick={() => { setCategoryId(category.id); setGroupId(null); }}>
                      <NodeMark name={category.name} size={22} active={categoryId === category.id} />
                      <span>{category.name}</span>
                    </button>
                  ))}
                  <button type="button" className="nx-cat-card add" onClick={addCategory}
                    aria-label="Добавить категорию">
                    <Plus size={22} aria-hidden="true" />
                    <span>Категория</span>
                  </button>
                </div>
                {carouselOverflows && (
                <button type="button" className="nx-carousel-arrow" aria-label="Правее"
                  onClick={() => scrollCarousel(1)}><ChevronRight size={18} /></button>
                )}
              </nav>

              {/* Заголовок содержимого: где мы, сколько здесь, как показать.
                  На узком экране его нет: активную категорию видно по самой
                  карусели, а каждая строка сверху там стоит одной плитки. */}
              {!narrow && (
              <div className="nx-content-head">
                <div className="nx-content-title">
                  <h1>{activeCategory ? activeCategory.name : 'Все сайты'}{activeGroup ? ` / ${activeGroup.name}` : ''}</h1>
                  <p>{countSites(found.length)}</p>
                </div>
                <div className="nx-content-tools">
                  <div className="nx-seg" role="group" aria-label="Вид списка">
                    <button type="button" className={view === 'all' ? 'on' : ''} aria-pressed={view === 'all'}
                      aria-label="Сеткой" title="Сеткой" onClick={() => setView('all')}><LayoutGrid size={17} /></button>
                    <button type="button" className={view === 'groups' ? 'on' : ''} aria-pressed={view === 'groups'}
                      aria-label="По группам" title="По группам" onClick={() => setView('groups')}><Rows3 size={17} /></button>
                  </div>
                  {/* Порог: при девяти сайтах сортировать нечего, и три
                      органа в заголовке висели просто так. Двенадцать — это
                      примерно два ряда на широком экране: с этого места глаз
                      уже не удерживает список целиком. */}
                  {shown.length >= SORT_FROM && (
                  <label className="nx-sort">
                    <span className="nx-sr">Сортировка</span>
                    <select value={ui.sortBy ?? 'name'} aria-label="Сортировка"
                      onChange={event => patchUi({ sortBy: event.target.value as SortKey })}>
                      {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                    <ChevronDown size={14} aria-hidden="true" />
                  </label>
                  )}
                </div>
              </div>
              )}

              {/* Чипы групп со счётчиками — видно, чем набрана категория. */}
              {!narrow && activeCategory && categoryGroups.length > 0 && (
                <div className="nx-chips" role="group" aria-label="Группы категории">
                  <button type="button" className={'nx-chip' + (groupId ? '' : ' on')}
                    aria-pressed={!groupId} onClick={() => setGroupId(null)}>
                    <LayoutGrid size={15} aria-hidden="true" />
                    <span>Все группы</span>
                  </button>
                  {categoryGroups.map(group => (
                    <button key={group.id} type="button"
                      className={'nx-chip' + (groupId === group.id ? ' on' : '')}
                      style={{ '--nx-node': groupColor(group) } as React.CSSProperties}
                      aria-pressed={groupId === group.id}
                      onClick={() => setGroupId(current => (current === group.id ? null : group.id))}>
                      <NodeMark name={group.name} size={15} active={groupId === group.id} />
                      <span>{group.name}</span>
                      <i>{treeCounts.byGroup.get(group.id) ?? 0}</i>
                    </button>
                  ))}
                  <button type="button" className="nx-chip add" onClick={() => addGroup(activeCategory.id)}
                    aria-label={`Добавить группу в «${activeCategory.name}»`}>
                    <Plus size={15} aria-hidden="true" />
                    <span>Группа</span>
                  </button>
                </div>
              )}

              {/* Переключатель раскладки на узком экране идёт следом за лентой
                  категорий, а не отдельной строкой выше: на 390 px каждая
                  строка сверху стоит одной плитки первого экрана. */}
              {mobileViews}
            </>
          )}

          {!showCategoryBar && mobileViews}


          {/* Заголовок с именем раздела нужен там, где нет строки крошек:
              на главной путь и счётчик показывает собственная шапка. */}
          {!showCategoryBar && (
            <div className={'nx-head' + (heading ? '' : ' bare')}>
              <div>
                {heading && <h1>{heading}</h1>}
                <p>{subheading}</p>
              </div>
            </div>
          )}

          {body}
        </div>

        <div className="nx-bottom">

          {/* Полоса выделения. Её нет, пока ничего не выбрано, и она заменяет
              меню на каждой плитке: одно действие на весь выбор вместо девяти
              одинаковых кнопок по углам. */}
          {picked.size > 0 && (
            <div className="nx-picked" role="toolbar" aria-label={`Выбрано сайтов: ${picked.size}`}>
              <b>{countSites(picked.size)}</b>
              <span className="nx-dock-sep" />
              <button type="button" onClick={() => { pickedSites.forEach(toggleFavorite); clearPicked(); }}>
                <Star size={16} weight="regular" aria-hidden="true" />
                <span>В избранное</span>
              </button>
              <button type="button" className="danger" onClick={() => { pickedSites.forEach(removeSite); clearPicked(); }}>
                <Trash2 size={16} aria-hidden="true" />
                <span>В корзину</span>
              </button>
              <span className="nx-dock-sep" />
              <button type="button" aria-label="Снять выделение" onClick={clearPicked}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

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
              /* Подсказка адресована первому дню, а занимала половину дока
                 всегда. Теперь она появляется ровно тогда, когда на док
                 тащат плитку, — то есть когда она и нужна. */
              dragOverDock ? <span className="nx-dock-empty">Отпустите, чтобы закрепить</span> : null
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
                      <SiteIcon title={site.title} domain={site.domain} color={site.color}
                        logos={useFavicons} className="nx-dock-mark" />
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

            <button type="button" className="nx-dock-add" aria-label="Добавить сайт"
              title="Добавить сайт (Ctrl N)" onClick={() => setAddOpen(true)}>
              <Plus size={20} />
            </button>

            {/* Погода и часы живут здесь, а не сбоку и не в шапке: док и так
                всегда на экране, а отдельный рельс под два показателя отнимал
                у сетки почти три сотни точек ширины. */}
            <span className="nx-dock-sep" />
            {ui.weather && (
              <button type="button" data-forecast-trigger className="nx-dock-weather"
                aria-expanded={forecastOpen} aria-label={`Прогноз на пять дней, сейчас ${weather.temp}`}
                title="Прогноз на 5 дней"
                onClick={() => { setCalendarOpen(false); setForecastOpen(value => !value); }}>
                <CloudSun size={22} aria-hidden="true" />
                <span><b>{weather.temp}</b><small>{ui.weatherCity}</small></span>
              </button>
            )}
            <button type="button" data-calendar-trigger className="nx-dock-clock"
              aria-expanded={calendarOpen} aria-label={`Открыть календарь, сегодня ${dateLine}`}
              onClick={() => { setForecastOpen(false); setCalendarOpen(value => !value); }}>
              <b>{time}</b>
              <small>{dateShort}</small>
            </button>
            <button type="button" className="nx-dock-gear" aria-label="Настройки" title="Настройки"
              onClick={() => { setSettingsSection('general'); setSettingsOpen(true); }}>
              <SettingsIcon size={19} />
            </button>
          </div>

          <button type="button" className={'nx-dock-handle' + (dockOpen ? ' on' : '')}
            aria-expanded={dockOpen} aria-controls="nx-dock"
            aria-label={dockOpen ? 'Скрыть док-панель' : 'Показать док-панель'}
            title={dockOpen ? 'Скрыть док-панель' : 'Показать док-панель'}
            onClick={() => setDockOpen(value => !value)}>
            <ChevronUp size={16} />
          </button>
        </div>

        {/* Правый рельс. Раньше под сеткой оставалось около четырёхсот точек
            пустого полотна: место есть, а смысла в нём нет. Здесь стоит то,
            ради чего на стартовую страницу и смотрят между делом — время,
            погода и последнее, куда заходили. */}
      </main>

      {paletteOpen && (
        <CommandPalette
          items={paletteItems}
          tail={paletteTail}
          initialQuery={query}
          suggestions={ui.searchSuggestions !== false}
          logos={ui.siteIcons !== false}
          onRun={runPaletteItem}
          onClose={() => setPaletteOpen(false)} />
      )}
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
          items={SECTIONS.map(item => [item.label, item.icon] as const)}
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectSelect={selectProject}
          onAddProject={addProject} />
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
      {actionDialog?.kind === 'project' && (
        <ActionDialog
          title="Новый проект"
          description="Создайте отдельное рабочее пространство для сайтов и категорий."
          input={{ label: 'Название проекта', placeholder: 'Например, Работа' }}
          confirmLabel="Создать"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'category' && (
        <ActionDialog
          title="Новая категория"
          description="Категория появится внутри выбранного проекта."
          input={{ label: 'Название категории', placeholder: 'Например, Исследования' }}
          confirmLabel="Создать"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'group' && (
        <ActionDialog
          title="Новая группа"
          description="Группа объединит связанные плитки внутри категории."
          input={{ label: 'Название группы', placeholder: 'Например, Инструменты' }}
          confirmLabel="Создать"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'session-save' && (
        <ActionDialog
          title="Сохранить сессию"
          description={`В сессию попадут ${countSites(actionDialog.sites.length)} — те, что сейчас на экране. Открыть их потом можно будет одним нажатием.`}
          input={{ label: 'Название сессии', placeholder: 'Например, Утро понедельника' }}
          confirmLabel="Сохранить"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'session-rename' && (
        <ActionDialog
          title="Переименовать сессию"
          input={{ label: 'Название сессии', initialValue: actionDialog.name }}
          confirmLabel="Сохранить"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'session-open' && (
        <ActionDialog
          title={`Открыть ${countSites(actionDialog.count)}?`}
          description="Каждый сайт сессии откроется в своей вкладке."
          confirmLabel="Открыть все"
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {actionDialog?.kind === 'empty-trash' && (
        <ActionDialog
          title="Очистить корзину?"
          description="Восстановить эти сайты после очистки будет нельзя."
          confirmLabel="Очистить"
          danger
          onConfirm={submitActionDialog}
          onClose={() => setActionDialog(null)}
        />
      )}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)}
          sites={sites} setSites={setSites} categories={categories} setCategories={setCategories}
          groups={groups} setGroups={setGroups} ui={ui} setUi={setUi} tile={tile} setTile={setTile}
          appearance={appearance} setAppearance={setAppearance} projects={projects} setProjects={setProjects}
          sessions={sessions} setSessions={setSessions} initialSection={settingsSection}
          onApplyBackup={backup => dispatch({ type: 'backup/apply', value: backup })} />
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


/**
 * Пустое состояние всегда объясняет, куда попал пользователь, и предлагает
 * следующий шаг. Иконка у каждого своя: одна лупа на все случаи, включая
 * пустую корзину, вводила в заблуждение.
 */
function Empty({ icon: Icon, title, hint, action }: {
  icon: ControlIcon;
  title: string;
  hint: string;
  action?: { label: string; icon: ControlIcon; onClick: () => void };
}) {
  return (
    <div className="nx-empty">
      <Icon size={26} aria-hidden="true" />
      <b>{title}</b>
      <span>{hint}</span>
      {action && (
        <button type="button" className="nx-empty-action" onClick={action.onClick}>
          <action.icon size={15} aria-hidden="true" />{action.label}
        </button>
      )}
    </div>
  );
}
