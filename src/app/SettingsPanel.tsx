import React, { useRef, useState } from 'react';
import {
  Camera, ChevronDown, CloudSun, Columns2, Database, Download, ExternalLink, Eye, FolderTree,
  Globe, Grid2X2, Grid3X3, History, Image as ImageIcon, Keyboard, ListFilter, MapPin, Minimize2,
  Monitor, Moon, Palette, PanelLeft, RefreshCw, RotateCcw, Rows3, Search,
  Settings as SettingsIcon, ShieldCheck, Smartphone, Sun, Thermometer, Trash2, Upload, X, Zap,
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
import { BrowserImportPanel } from '../components/BrowserImportPanel';
import { ActionDialog } from './ActionDialog';

type SectionId = 'general' | 'look' | 'tiles' | 'panel' | 'mobile' | 'search' | 'weather' | 'privacy' | 'keys' | 'data';
const SECTIONS: { id: SectionId; label: string; icon: ControlIcon }[] = [
  { id: 'general', label: 'Общие', icon: SettingsIcon },
  { id: 'look', label: 'Оформление', icon: Palette },
  { id: 'tiles', label: 'Плитки', icon: Grid2X2 },
  { id: 'panel', label: 'Боковое окно', icon: PanelLeft },
  { id: 'mobile', label: 'Мобильная версия', icon: Smartphone },
  { id: 'search', label: 'Поиск', icon: Search },
  { id: 'weather', label: 'Погода', icon: CloudSun },
  { id: 'privacy', label: 'Приватность', icon: ShieldCheck },
  { id: 'keys', label: 'Горячие клавиши', icon: Keyboard },
  { id: 'data', label: 'Данные', icon: Database },
];

const ACCENTS = ['#2f6fe4', '#6d51e0', '#0f9d76', '#e0851f', '#c9364f', '#0f8ab8'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Берлин', 'Лондон'];
const UNITS = ['Цельсий (°C)', 'Фаренгейт (°F)'];
const WALLPAPERS: [string, string][] = [['aurora', 'Аврора'], ['warm', 'Тёплые'], ['mint', 'Мята'], ['plain', 'Однотонные']];
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
export const DEFAULT_APPEARANCE: AppearanceState = { theme: 'light', accent: '#2f6fe4', wallpaper: 'aurora' };

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
};

export function SettingsPanel(props: SettingsProps) {
  const { onClose, ui, setUi, tile, setTile, appearance, setAppearance } = props;
  const [open, setOpen] = useState<SectionId | null>('look');

  const patchUi = (patch: Partial<UiState>) => setUi(current => ({ ...current, ...patch }));
  const patchTile = (patch: Partial<TileState>) => setTile(current => ({ ...current, ...patch }));

  /** Puts one fold back to the values a fresh install starts with. */
  const resetSection = (section: SectionId) => {
    switch (section) {
      case 'general': patchUi({ compact: false, animations: true, newTab: true }); break;
      case 'look': setAppearance({ ...DEFAULT_APPEARANCE }); break;
      case 'tiles': setTile({ ...DEFAULT_TILE }); patchUi({ siteIcons: true }); break;
      case 'panel': patchUi({ sidebarWidth: '292px', projects: true, weather: true }); break;
      case 'mobile': patchUi({ mobileMode: 'table' }); break;
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
        {SECTIONS.map(item => {
          const expanded = open === item.id;
          const resettable = item.id !== 'data' && item.id !== 'keys';
          return (
            <section className={'nx-fold' + (expanded ? ' open' : '')} key={item.id}>
              <h3>
                <button type="button" className="nx-fold-head" aria-expanded={expanded}
                  onClick={() => setOpen(current => (current === item.id ? null : item.id))}>
                  <item.icon size={16} weight={expanded ? 'duotone' : 'regular'} />
                  <span>{item.label}</span>
                  <ChevronDown size={16} className="nx-fold-caret" aria-hidden="true" />
                </button>
              </h3>
              {expanded && (
                <div className="nx-fold-body">
                  {renderSection(item.id)}
                  {resettable && (
                    <button type="button" className="nx-fold-reset" onClick={() => resetSection(item.id)}>
                      <RotateCcw size={13} /> Сбросить раздел «{item.label}»
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        <p className="nx-settings-version">Nexus Speed Dial · версия 1.0.0 · лицензия MIT</p>
      </div>
    </section>
  );

  function renderSection(section: SectionId) {
    return <>
        {section === 'general' && (
          <Group title="Поведение приложения">
            <Switch icon={Minimize2} label="Компактный интерфейс" value={ui.compact === true}
              onChange={value => patchUi({ compact: value })} />
            <Switch icon={Zap} label="Плавные анимации" value={ui.animations !== false}
              onChange={value => patchUi({ animations: value })} />
            <Switch icon={ExternalLink} label="Открывать в новой вкладке" value={ui.newTab !== false}
              onChange={value => patchUi({ newTab: value })} />
          </Group>
        )}

        {section === 'look' && (
          <Group title="Оформление окна" hint="Акцент красит активные вкладки, кнопки и выделения в проводнике.">
            <Pick icon={themeIcon(appearance.theme)} label="Тема"
              options={[['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']]}
              value={appearance.theme} onChange={value => setAppearance({ ...appearance, theme: value })} />
            <Pick icon={ImageIcon} label="Фон" options={WALLPAPERS}
              value={appearance.wallpaper ?? 'aurora'} onChange={value => setAppearance({ ...appearance, wallpaper: value })} />
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

        {section === 'tiles' && (
          <TileSettings
            tile={tile}
            patch={patchTile}
            applyPreset={(preset: VisualPreset) => setTile({ ...TILE_PRESETS[preset] })}
            siteIcons={ui.siteIcons !== false}
            setSiteIcons={value => patchUi({ siteIcons: value })}
          />
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

        {section === 'mobile' && (
          <Group title="Вид по умолчанию" hint="С этого вида открывается главная страница на узком экране; переключатель остаётся над сеткой.">
            {MOBILE_VIEWS.map(([value, label, hint, Icon]) => (
              <button key={value} type="button" className={'nx-cell nx-cell-pick' + ((ui.mobileMode ?? 'table') === value ? ' on' : '')}
                aria-pressed={(ui.mobileMode ?? 'table') === value} title={hint}
                onClick={() => patchUi({ mobileMode: value })}>
                <span className="nx-cell-top"><Icon size={14} /></span>
                <span className={'nx-cell-art art-' + value} aria-hidden="true"><i /><i /><i /><i /></span>
                <span className="nx-cell-label">{label}</span>
              </button>
            ))}
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
              disabled={!ui.weather} why="Погода выключена в разделе «Боковое окно»" />
            <Pick icon={Thermometer} label="Единицы" options={UNITS.map(unit => [unit, unit] as [string, string])}
              value={ui.weatherUnits} onChange={value => patchUi({ weatherUnits: value })}
              disabled={!ui.weather} why="Погода выключена в разделе «Боковое окно»" />
            <Switch icon={RefreshCw} label="Обновлять автоматически" value={ui.weatherAuto}
              onChange={value => patchUi({ weatherAuto: value })}
              disabled={!ui.weather} why="Погода выключена в разделе «Боковое окно»" />
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

