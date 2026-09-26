import React, { useRef, useState } from 'react';
import {
  Camera, CloudSun, Columns2, Columns3, Database, Download, Droplets, ExternalLink, Eye, FolderTree,
  Globe, Grid2X2, Grid3X3, History, Image as ImageIcon, Keyboard, ListFilter, MapPin, Minimize2,
  LayoutGrid, Monitor, Moon, Palette, PanelLeft, RefreshCw, RotateCcw, Rows3, Search,
  Settings as SettingsIcon, ShieldCheck, Star, Sun, Thermometer, Trash2, Type, Upload, X, Zap,
} from './icons.generated';
import type { AppearanceState, MobileMode, TileState, UiState } from '../domain/appStore';
import type { BrowserSession, Category, Project, SiteGroup, SiteRecord as Site, VisualPreset } from '../domain/types';
import { TILE_PRESETS, normalizeTileAppearance } from '../domain/tileAppearance';
import { TileSettings } from './TileSettings';
import { Card, Cell, Group, Pick, Switch, type ControlIcon } from './SettingControls';
import { createBackup, parseBackup, type NexusBackup } from '../domain/backup';
import { createBookmarkHtml, parseBookmarkHtml, withoutExistingDomains } from '../domain/importUtils';
import { SEARCH_ENGINES } from '../domain/webSearch';
import { sites as countSites } from '../domain/plural';
import { dataUrlBytes, readWallpaperPhoto, saveWallpaperPhoto, shrinkImage } from '../domain/wallpaper';
import { BrowserImportPanel } from '../components/BrowserImportPanel';
import { ActionDialog } from './ActionDialog';

export type SectionId = 'general' | 'look' | 'tiles' | 'panel' | 'search' | 'weather' | 'privacy' | 'keys' | 'data';
/**
 * Раздела «Мобильная версия» больше нет: он состоял из одного выбора —
 * раскладки узкого экрана, — а это такой же ответ на вопрос «как показывать
 * сетку», как вид и сортировка. Всё три переехали в «Плитки», к остальному
 * виду плитки; отдельный раздел ради одного органа управления только удлинял
 * список.
 */
const SECTIONS: { id: SectionId; label: string; icon: ControlIcon; about: string }[] = [
  { id: 'general', label: 'Общие', icon: SettingsIcon, about: 'Как ведёт себя приложение' },
  { id: 'look', label: 'Оформление', icon: Palette, about: 'Тема, фон и акцент' },
  { id: 'tiles', label: 'Плитки', icon: Grid2X2, about: 'Как показывать сетку сайтов' },
  { id: 'panel', label: 'Панели', icon: PanelLeft, about: 'Боковое окно и полосы' },
  { id: 'search', label: 'Поиск', icon: Search, about: 'Омнибокс и подсказки' },
  { id: 'weather', label: 'Погода', icon: CloudSun, about: 'Город и единицы' },
  { id: 'privacy', label: 'Приватность', icon: ShieldCheck, about: 'Что остаётся в браузере' },
  { id: 'keys', label: 'Горячие клавиши', icon: Keyboard, about: 'Справка по сочетаниям' },
  { id: 'data', label: 'Данные', icon: Database, about: 'Импорт, копия и очистка' },
];

// Графит в наборе не случайно: у Figma, Cal и Intercom главное действие
// красится почти чёрным, и это читается дороже цветной кнопки.
const ACCENTS = ['#2f6fe4', '#6d51e0', '#0f9d76', '#e0851f', '#c9364f', '#1c2026'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Берлин', 'Лондон'];
const UNITS = ['Цельсий (°C)', 'Фаренгейт (°F)'];
const WALLPAPERS: [string, string][] = [
  ['lake', 'Горное озеро'], ['aurora', 'Аврора'], ['warm', 'Рассвет'], ['mint', 'Лагуна'], ['lilac', 'Сирень'],
  ['paper', 'Бумага'], ['plain', 'Однотонные'], ['photo', 'Своё фото'],
];
const PANEL_WIDTHS = ['240px', '292px', '340px'];
const MOBILE_VIEWS: [MobileMode, string, string, ControlIcon][] = [
  ['table', 'Таблица', 'Два столбца, под названием — краткое описание', Columns2],
  ['rows', 'Строки', 'Одна строка на сайт с подробным описанием', Rows3],
  ['icons', 'Иконки', 'Четыре столбца, только иконка и название', Grid3X3],
];

const themeIcon = (theme: string): ControlIcon => (theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun);
const SHORTCUTS: [string, string][] = [
  ['Ctrl + N', 'Добавить сайт'],
  ['Ctrl + B', 'Перейти в избранное'],
  ['Ctrl + ,', 'Открыть настройки'],
  ['Esc', 'Закрыть окно, календарь, прогноз или меню'],
];

export const DEFAULT_TILE: TileState = normalizeTileAppearance(null);
export const DEFAULT_APPEARANCE: AppearanceState = { theme: 'light', accent: '#2f6fe4', wallpaper: 'lake' };

export type SettingsProps = {
  onClose: () => void;
  sites: Site[]; setSites: (value: Site[] | ((current: Site[]) => Site[])) => void;
  categories: Category[]; setCategories: (value: Category[] | ((current: Category[]) => Category[])) => void;
  groups: SiteGroup[]; setGroups: (value: SiteGroup[] | ((current: SiteGroup[]) => SiteGroup[])) => void;
  projects: Project[]; setProjects: (value: Project[] | ((current: Project[]) => Project[])) => void;
  sessions: BrowserSession[]; setSessions: (value: BrowserSession[] | ((current: BrowserSession[]) => BrowserSession[])) => void;
  ui: UiState; setUi: (value: UiState | ((current: UiState) => UiState)) => void;
  tile: TileState; setTile: (value: TileState | ((current: TileState) => TileState)) => void;
  appearance: AppearanceState; setAppearance: (value: AppearanceState | ((current: AppearanceState) => AppearanceState)) => void;
  onApplyBackup: (backup: NexusBackup) => void;
  /**
   * Раздел, раскрытый при открытии. Панель «Инструменты» в боковом окне
   * ведёт прямо к нужному складню — «Резервная копия» должна открывать
   * «Данные», а не заставлять искать его глазами.
   */
  initialSection?: SectionId;
};

export function SettingsPanel(props: SettingsProps) {
  const { onClose, ui, setUi, tile, setTile, appearance, setAppearance, initialSection } = props;
  const [open, setOpen] = useState<SectionId>(initialSection ?? 'look');
  const current = SECTIONS.find(item => item.id === open) ?? SECTIONS[0];
  const resettable = current.id !== 'data' && current.id !== 'keys';
  const photoInput = useRef<HTMLInputElement>(null);
  const [hasPhoto, setHasPhoto] = useState(() => readWallpaperPhoto() !== null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const photoActive = hasPhoto && (appearance.wallpaper ?? 'lake') === 'photo';

  /**
   * Снимок с телефона легко весит несколько мегабайт, а в localStorage на всё
   * приложение отведено около пяти: перед сохранением изображение ужимается,
   * и только если оно всё равно не помещается, пользователь узнаёт об отказе,
   * а не теряет обои молча.
   */
  const pickPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoNote('Уменьшаю изображение…');
    try {
      const dataUrl = await shrinkImage(file);
      if (!saveWallpaperPhoto(dataUrl)) {
        setPhotoNote('Не хватило места в хранилище — попробуйте снимок поменьше');
        return;
      }
      setHasPhoto(true);
      setPhotoNote(`Фон сохранён, ${Math.round(dataUrlBytes(dataUrl) / 1024)} КБ`);
      setAppearance({ ...appearance, wallpaper: 'photo' });
    } catch {
      setPhotoNote('Не удалось прочитать изображение');
    }
  };

  const patchUi = (patch: Partial<UiState>) => setUi(current => ({ ...current, ...patch }));
  const patchTile = (patch: Partial<TileState>) => setTile(current => ({ ...current, ...patch }));

  /** Puts one fold back to the values a fresh install starts with. */
  const resetSection = (section: SectionId) => {
    switch (section) {
      case 'general': patchUi({ compact: false, animations: true, newTab: true, rail: true }); break;
      case 'look': setAppearance({ ...DEFAULT_APPEARANCE }); break;
      case 'tiles': setTile({ ...DEFAULT_TILE }); patchUi({ siteIcons: true, defaultView: 'all', sortBy: 'name', mobileMode: 'table' }); break;
      case 'panel': patchUi({ sidebarWidth: '292px', projects: true, weather: true, favoritesBar: true, favoritesCount: 8, favoritesLabels: true, panelRecent: true, panelRecentCount: 6, panelRecentLabels: true }); break;
      case 'search': patchUi({ searchEngine: 'Google', searchLocal: true, searchSuggestions: true }); break;
      case 'weather': patchUi({ weather: true, weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true }); break;
      case 'privacy': patchUi({ saveHistory: true, siteIcons: true, remotePreviews: false }); break;
      default: break;
    }
  };

  return (
    <section className="nx-settings" role="dialog" aria-labelledby="nx-settings-title"
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <header className="nx-settings-head">
        <div>
          <span className="nx-label">Параметры</span>
          <h2 id="nx-settings-title">Настройки</h2>
        </div>
        <button type="button" className="nx-icon-btn" aria-label="Закрыть настройки" onClick={onClose}><X size={18} /></button>
      </header>

      <div className="nx-settings-body">
        {/* Слева — все разделы разом, справа — один открытый. У складня
            список и содержимое были одной колонкой: открытый раздел толкал
            остальные вниз, а «Данные» уводили их за край. Рельс стоит на
            месте и всегда показывает, где мы находимся. На узком экране тот
            же рельс становится строкой-лентой — раскладку задаёт CSS, разметка
            одна. */}
        <nav className="nx-settings-rail" aria-label="Разделы настроек">
          {SECTIONS.map(item => (
            <button key={item.id} type="button" className={'nx-rail-item' + (open === item.id ? ' on' : '')}
              aria-current={open === item.id} onClick={() => setOpen(item.id)}>
              <item.icon size={16} weight={open === item.id ? 'duotone' : 'regular'} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="nx-settings-pane">
          <div className="nx-pane-head">
            <div>
              <h3>{current.label}</h3>
              <p>{current.about}</p>
            </div>
            {resettable && (
              <button type="button" className="nx-fold-reset" onClick={() => resetSection(current.id)}>
                <RotateCcw size={13} /> Сбросить раздел «{current.label}»
              </button>
            )}
          </div>
          <div className="nx-pane-body">
            {renderSection(current.id)}
            <p className="nx-settings-version">Nexus Speed Dial · версия 1.0.0 · лицензия MIT</p>
          </div>
        </div>
      </div>
    </section>
  );

  function renderSection(section: SectionId) {
    return <>
        {section === 'general' && (
          <Group title="Поведение приложения" hint="Как показывать сетку сайтов — в разделе «Плитки».">
            <Switch icon={Minimize2} label="Компактный интерфейс" value={ui.compact === true}
              onChange={value => patchUi({ compact: value })} />
            <Switch icon={Zap} label="Плавные анимации" value={ui.animations !== false}
              onChange={value => patchUi({ animations: value })} />
            <Switch icon={ExternalLink} label="Открывать в новой вкладке" value={ui.newTab !== false}
              onChange={value => patchUi({ newTab: value })} />
            <Switch icon={CloudSun} label="Виджеты справа в сетке" value={ui.rail !== false}
              why="Часы, погода и недавние" onChange={value => patchUi({ rail: value })} />
          </Group>
        )}

        {section === 'look' && (
          <Group title="Оформление окна" hint="Акцент красит активные вкладки, кнопки и выделения в проводнике.">
            <Pick icon={themeIcon(appearance.theme)} label="Тема"
              options={[['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']]}
              value={appearance.theme} onChange={value => setAppearance({ ...appearance, theme: value })} />
            <Pick icon={ImageIcon} label="Фон" options={WALLPAPERS}
              value={appearance.wallpaper ?? 'lake'} onChange={value => setAppearance({ ...appearance, wallpaper: value })} />
            <Cell icon={ImageIcon} label="Своё изображение"
              why={photoNote ?? 'Снимок уменьшается и хранится только на этом устройстве'}>
              <span className="nx-card-buttons nx-inline-buttons">
                <button type="button" onClick={() => photoInput.current?.click()}>
                  {hasPhoto ? 'Заменить' : 'Выбрать файл'}
                </button>
                {hasPhoto && (
                  <button type="button" onClick={() => {
                    saveWallpaperPhoto(null);
                    setHasPhoto(false);
                    setPhotoNote(null);
                    if ((appearance.wallpaper ?? 'lake') === 'photo') setAppearance({ ...appearance, wallpaper: 'lake' });
                  }}>Убрать</button>
                )}
              </span>
              <input ref={photoInput} type="file" accept="image/*" hidden aria-label="Файл изображения"
                onChange={event => { void pickPhoto(event); }} />
            </Cell>
            <Cell icon={Sun} label="Осветление фона" as="label"
              disabled={!photoActive}
              why={photoActive
                ? 'Насколько сильно снимок притушен, чтобы текст оставался читаемым'
                : 'Сначала выберите своё изображение и включите фон «Своё фото»'}>
              <span className="nx-cell-value" aria-hidden="true">{appearance.veil ?? 42}%</span>
              <input type="range" min={0} max={85} step={1} aria-label="Осветление фона"
                disabled={!photoActive} value={appearance.veil ?? 42}
                onChange={event => setAppearance({ ...appearance, veil: Number(event.target.value) })} />
            </Cell>
            <Cell icon={Droplets} label="Размытие панелей" as="label"
              why="Панели пропускают сцену сквозь себя — заметнее всего на фотографии">
              <span className="nx-cell-value" aria-hidden="true">{appearance.panelBlur ?? 0}px</span>
              <input type="range" min={0} max={20} step={1} aria-label="Размытие панелей"
                value={appearance.panelBlur ?? 0}
                onChange={event => setAppearance({ ...appearance, panelBlur: Number(event.target.value) })} />
            </Cell>
            <Cell icon={Palette} label="Акцент">
              <span className="nx-swatches">
                {ACCENTS.map(color => (
                  <button key={color} type="button" style={{ background: color }} aria-label={`Акцент ${color}`}
                    aria-pressed={appearance.accent === color} className={appearance.accent === color ? 'on' : ''}
                    onClick={() => setAppearance({ ...appearance, accent: color })} />
                ))}
              </span>
            </Cell>
          </Group>
        )}

        {/* Вид сетки и сортировка стояли в заголовке содержимого отдельной
            панелькой поверх фотографии. Теперь они здесь — там, где и всё
            остальное об устройстве сетки, — и меняют сетку сразу, а не
            «по умолчанию»: значение одно. */}
        {section === 'tiles' && (
          <Group title="Как показывать сетку" hint="Применяется сразу к сетке на широком экране.">
            <Pick icon={LayoutGrid} label="Вид сетки"
              options={[['all', 'Сеткой'], ['groups', 'По группам']]}
              value={ui.defaultView ?? 'all'}
              onChange={value => patchUi({ defaultView: value as 'all' | 'groups' })} />
            <Pick icon={ListFilter} label="Сортировка"
              options={[['name', 'По названию'], ['recent', 'По последнему открытию'], ['added', 'По добавлению']]}
              value={ui.sortBy ?? 'name'}
              onChange={value => patchUi({ sortBy: value as 'name' | 'recent' | 'added' })} />
          </Group>
        )}

        {section === 'tiles' && (
          <Group title="Раскладка на узком экране" hint="Ниже 900 px сетка перестраивается по этому выбору.">
            {MOBILE_VIEWS.map(([value, label, hint, Icon]) => (
              <button key={value} type="button" className={'nx-cell nx-cell-pick' + ((ui.mobileMode ?? 'table') === value ? ' on' : '')}
                aria-pressed={(ui.mobileMode ?? 'table') === value} title={hint}
                onClick={() => patchUi({ mobileMode: value })}>
                <span className="nx-cell-top"><Icon size={14} /></span>
                <span className="nx-cell-control"><span className={'nx-cell-art art-' + value} aria-hidden="true"><i /><i /><i /><i /></span></span>
                <span className="nx-cell-text"><span className="nx-cell-label">{label}</span></span>
              </button>
            ))}
          </Group>
        )}

        {/* Отдельная обёртка: внешний вид плитки проверяется отпечатком самой
            плитки, а вид и сортировка сетки плитку не меняют — им нужна своя
            проверка, и смешивать их в одном обходе нельзя. */}
        {section === 'tiles' && (
          <div className="nx-tile-look">
            <TileSettings
              tile={tile}
              patch={patchTile}
              applyPreset={(preset: VisualPreset) => setTile({ ...TILE_PRESETS[preset] })}
              siteIcons={ui.siteIcons !== false}
              setSiteIcons={value => patchUi({ siteIcons: value })}
            />
          </div>
        )}

        {section === 'panel' && (
          <Group title="Боковое окно" hint="Ширина применяется к развёрнутому окну; свёрнутое всегда показывает только иконки.">
            <Pick icon={PanelLeft} label="Ширина окна" options={PANEL_WIDTHS.map(w => [w, w.replace('px', ' px')] as [string, string])}
              value={ui.sidebarWidth ?? '292px'} onChange={value => patchUi({ sidebarWidth: value })} />
            <Switch icon={FolderTree} label="Проводник проектов" value={ui.projects !== false}
              onChange={value => patchUi({ projects: value })} />
            <Switch icon={CloudSun} label="Погода и часы" value={ui.weather}
              onChange={value => patchUi({ weather: value })} />
          </Group>
        )}

        {section === 'panel' && (
          <Group title="Недавние в панели" hint="Занимают место под деревом проектов; список берётся из истории открытий.">
            <Switch icon={History} label="Показывать недавние" value={ui.panelRecent !== false}
              onChange={value => patchUi({ panelRecent: value })} />
            <Pick icon={Columns3} label="Сколько недавних" options={[['4', '4'], ['6', '6'], ['8', '8']]}
              value={String(ui.panelRecentCount ?? 6)} onChange={value => patchUi({ panelRecentCount: Number(value) })}
              disabled={ui.panelRecent === false} why="Недавние выключены" />
            <Switch icon={Type} label="Названия недавних" value={ui.panelRecentLabels !== false}
              onChange={value => patchUi({ panelRecentLabels: value })}
              disabled={ui.panelRecent === false} why="Недавние выключены" />
          </Group>
        )}

        {section === 'panel' && (
          <Group title="Главная страница" hint="Полоса избранного одинакова в любом проекте и появляется только на широком экране.">
            <Switch icon={Star} label="Полоса избранного" value={ui.favoritesBar !== false}
              onChange={value => patchUi({ favoritesBar: value })} />
            <Pick icon={Columns3} label="Сколько показывать" options={[['6', '6'], ['8', '8'], ['12', '12']]}
              value={String(ui.favoritesCount ?? 8)} onChange={value => patchUi({ favoritesCount: Number(value) })}
              disabled={ui.favoritesBar === false} why="Полоса избранного выключена" />
            <Switch icon={Type} label="Названия на полосе" value={ui.favoritesLabels !== false}
              onChange={value => patchUi({ favoritesLabels: value })}
              disabled={ui.favoritesBar === false} why="Полоса избранного выключена" />
          </Group>
        )}

        {section === 'search' && (
          <Group title="Поиск" hint="Омнибокс открывает адрес или ищет запрос в выбранной системе.">
            <Pick icon={Globe} label="Поисковая система" options={SEARCH_ENGINES.map(engine => [engine, engine] as [string, string])}
              value={ui.searchEngine} onChange={value => patchUi({ searchEngine: value })} />
            <Switch icon={Search} label="Поиск по закладкам" value={ui.searchLocal !== false}
              onChange={value => patchUi({ searchLocal: value })} />
            <Switch icon={ListFilter} label="Подсказки из закладок" value={ui.searchSuggestions !== false}
              onChange={value => patchUi({ searchSuggestions: value })} />
          </Group>
        )}

        {section === 'weather' && (
          <Group title="Погода" hint="Данные берутся с Open-Meteo без ключа. Запрос отправляется сервису Open-Meteo при обновлении прогноза.">
            <Pick icon={MapPin} label="Город" options={CITIES.map(city => [city, city] as [string, string])}
              value={ui.weatherCity} onChange={value => patchUi({ weatherCity: value })}
              disabled={!ui.weather} why="Погода выключена в разделе «Панели»" />
            <Pick icon={Thermometer} label="Единицы" options={UNITS.map(unit => [unit, unit] as [string, string])}
              value={ui.weatherUnits} onChange={value => patchUi({ weatherUnits: value })}
              disabled={!ui.weather} why="Погода выключена в разделе «Панели»" />
            <Switch icon={RefreshCw} label="Обновлять автоматически" value={ui.weatherAuto}
              onChange={value => patchUi({ weatherAuto: value })}
              disabled={!ui.weather} why="Погода выключена в разделе «Панели»" />
          </Group>
        )}

        {section === 'privacy' && (
          <Group title="Приватность" hint="Плитки, проекты и категории всегда остаются в этом браузере: приложение не имеет сервера и никуда их не отправляет. Фирменные знаки сайтов лежат рядом с приложением, поэтому за ними никуда обращаться не нужно.">
            <Switch icon={History} label="История открытий" value={ui.saveHistory !== false}
              onChange={value => patchUi({ saveHistory: value })} />
            {/* Знак из набора берётся локально; запрос уходит только когда знака нет. */}
            <Switch icon={Eye} label="Логотипы сайтов" value={ui.siteIcons !== false}
              onChange={value => patchUi({ siteIcons: value })}
              why="Выключено — везде монограмма. Включено — знак из набора, а для сайтов без него иконка запрашивается у самого сайта" />
            <Switch icon={Camera} label="Внешние превью" value={ui.remotePreviews === true}
              onChange={value => patchUi({ remotePreviews: value })} />
          </Group>
        )}

        {section === 'keys' && (
          <Card title="Горячие клавиши" hint="Сочетания работают на главной странице. Браузер может перехватить часть из них раньше приложения.">
            <ul className="nx-keys">
              {SHORTCUTS.map(([keys, what]) => (
                <li key={keys}><kbd>{keys}</kbd><span>{what}</span></li>
              ))}
            </ul>
          </Card>
        )}

        {section === 'data' && <DataSection {...props} />}
    </>;
  }
}






function DataSection({ sites, setSites, categories, groups, projects, setProjects, sessions, setSessions, ui, tile, appearance, onApplyBackup }: SettingsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [clearOpen, setClearOpen] = useState(false);

  const download = (content: string, type: string, name: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const html = file.name.toLowerCase().endsWith('.html') || file.type === 'text/html';
        if (!html) {
          const parsed = parseBackup(text);
          onApplyBackup(parsed);
          setMessage(`Резервная копия применена: ${countSites(parsed.sites.length)}.`);
          return;
        }

        const incoming = parseBookmarkHtml(text);
        const fresh = withoutExistingDomains(incoming, sites).map((site, index) => ({
          ...site,
          id: site.id || `site-${site.domain.replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}-${index}`,
        }));
        if (fresh.length) setSites(current => [...fresh, ...current]);
        const skipped = incoming.length - fresh.length;
        setMessage(fresh.length
          ? `Добавлено ${countSites(fresh.length)}${skipped ? `, пропущено дублей: ${skipped}` : ''}.`
          : 'Новых сайтов в файле не нашлось.');
      } catch {
        setMessage('Не удалось прочитать файл.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <BrowserImportPanel sites={sites} setSites={setSites} projects={projects} setProjects={setProjects} sessions={sessions} setSessions={setSessions} />
      <Card title="Резервная копия" hint="Плитки, проекты, категории и настройки в одном файле.">
        <div className="nx-card-buttons">
          <button type="button" onClick={() => download(createBackup({ sites, projects, categories, groups, sessions, settings: { ui, tile, appearance } }), 'application/json', 'nexus-backup.json')}>
            <Download size={15} /> Экспорт данных
          </button>
          <button type="button" onClick={() => download(createBookmarkHtml(sites), 'text/html', 'nexus-bookmarks.html')}>
            <Download size={15} /> Закладки HTML
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}><Upload size={15} /> Импорт</button>
          <input ref={fileInput} type="file" accept="application/json,.html,text/html" hidden onChange={importFile} aria-label="Файл для импорта" />
        </div>
        {message && <p className="nx-card-hint" role="status">{message}</p>}
      </Card>
      <Card title="Опасная зона" hint="Удаляет сайты, проекты и сохранённые сессии. Настройки интерфейса останутся.">
        <div className="nx-card-buttons">
          <button type="button" className="danger" onClick={() => setClearOpen(true)}>
            <Trash2 size={15} /> Очистить рабочие данные
          </button>
        </div>
      </Card>
      {clearOpen && (
        <ActionDialog
          title="Очистить рабочие данные?"
          description="Будут удалены сайты, проекты и сохранённые сессии. Настройки интерфейса останутся."
          confirmLabel="Очистить данные"
          danger
          onClose={() => setClearOpen(false)}
          onConfirm={() => {
            setSites([]);
            setProjects([]);
            setSessions([]);
            setMessage('Рабочие данные очищены.');
            setClearOpen(false);
          }}
        />
      )}
    </>
  );
}
