import React, { useRef, useState } from 'react';
import {
  Check, ChevronDown, CloudSun, Database, Download, Grid2X2, Keyboard, Palette, PanelLeft,
  RotateCcw, Search, Settings as SettingsIcon, ShieldCheck, Smartphone, Trash2, Upload, X,
} from 'lucide-react';
import type { AppearanceState, MobileMode, TileState, UiState } from '../domain/appStore';
import type { BrowserSession, Category, Project, SiteGroup, SiteRecord as Site, TileMode } from '../domain/types';
import { createBackup, parseBackup } from '../domain/backup';
import { createBookmarkHtml, parseBookmarkHtml, withoutExistingDomains } from '../domain/importUtils';
import { SEARCH_ENGINES } from '../domain/webSearch';
import { sites as countSites } from '../domain/plural';
import { BrowserImportPanel } from '../components/BrowserImportPanel';
import { ActionDialog } from './ActionDialog';

type SectionId = 'general' | 'look' | 'tiles' | 'panel' | 'mobile' | 'search' | 'weather' | 'privacy' | 'keys' | 'data';
const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
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
const TILE_SIZES: [string, string][] = [['S', 'Плотно'], ['M', 'Обычно'], ['L', 'Крупно'], ['XL', 'Очень крупно']];
/** Only the modes the grid actually renders are offered here. */
const TILE_MODES: [TileMode, string][] = [['standard', 'Стандарт'], ['icon', 'Иконки'], ['list', 'Список'], ['preview', 'Превью']];
const HOVERS: [string, string][] = [['lift', 'Подъём'], ['float', 'Парение'], ['none', 'Нет']];
const FONTS = ['Manrope', 'Inter'];
const WALLPAPERS: [string, string][] = [['aurora', 'Аврора'], ['warm', 'Тёплые'], ['mint', 'Мята'], ['plain', 'Однотонные']];
const PANEL_WIDTHS = ['240px', '292px', '340px'];
const MOBILE_VIEWS: [MobileMode, string, string][] = [
  ['table', 'Таблица', 'Два столбца, под названием — краткое описание'],
  ['rows', 'Строки', 'Одна строка на сайт с подробным описанием'],
  ['icons', 'Иконки', 'Четыре столбца, только иконка и название'],
];
const SHORTCUTS: [string, string][] = [
  ['Ctrl + N', 'Добавить сайт'],
  ['Ctrl + B', 'Перейти в избранное'],
  ['Ctrl + ,', 'Открыть настройки'],
  ['Esc', 'Закрыть окно, календарь, прогноз или меню'],
];

export const DEFAULT_TILE: TileState = {
  mode: 'standard', preset: 'glass', radius: 20, iconSize: 40, hover: 'lift', shadow: 'soft',
  font: 'Manrope', size: 'M', showDescription: false, showDomain: false, showNotifications: true,
};
export const DEFAULT_APPEARANCE: AppearanceState = { theme: 'light', accent: '#2f6fe4', wallpaper: 'aurora' };

export type SettingsProps = {
  onClose: () => void;
  sites: Site[]; setSites: (value: Site[] | ((current: Site[]) => Site[])) => void;
  categories: Category[]; setCategories: (value: Category[] | ((current: Category[]) => Category[])) => void;
  groups: SiteGroup[]; setGroups: (value: SiteGroup[] | ((current: SiteGroup[]) => SiteGroup[])) => void;
  projects: Project[]; setProjects: (value: Project[] | ((current: Project[]) => Project[])) => void;
  sessions: BrowserSession[]; setSessions: (value: BrowserSession[] | ((current: BrowserSession[]) => BrowserSession[])) => void;
  density: number; setDensity: (value: number) => void;
  ui: UiState; setUi: (value: UiState | ((current: UiState) => UiState)) => void;
  tile: TileState; setTile: (value: TileState | ((current: TileState) => TileState)) => void;
  appearance: AppearanceState; setAppearance: (value: AppearanceState | ((current: AppearanceState) => AppearanceState)) => void;
};

export function SettingsPanel(props: SettingsProps) {
  const { onClose, ui, setUi, tile, setTile, appearance, setAppearance, density, setDensity } = props;
  const [open, setOpen] = useState<SectionId | null>('look');

  const patchUi = (patch: Partial<UiState>) => setUi(current => ({ ...current, ...patch }));
  const patchTile = (patch: Partial<TileState>) => setTile(current => ({ ...current, ...patch }));

  /** Puts one fold back to the values a fresh install starts with. */
  const resetSection = (section: SectionId) => {
    switch (section) {
      case 'general': patchUi({ compact: false, animations: true, newTab: true }); break;
      case 'look': setAppearance({ ...DEFAULT_APPEARANCE }); break;
      case 'tiles': setTile({ ...DEFAULT_TILE }); setDensity(20); patchUi({ siteIcons: true }); break;
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
                  <item.icon size={16} />
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
          <Card title="Поведение приложения">
            <Row title="Компактный интерфейс" desc="Меньше отступов в панелях и на главной">
              <Toggle value={ui.compact === true} label="Компактный интерфейс" onChange={value => patchUi({ compact: value })} />
            </Row>
            <Row title="Плавные анимации" desc="Переходы панелей, смена проекта, наведение на плитку">
              <Toggle value={ui.animations !== false} label="Плавные анимации" onChange={value => patchUi({ animations: value })} />
            </Row>
            <Row title="Открывать в новой вкладке" desc="Иначе сайт откроется в текущей вкладке">
              <Toggle value={ui.newTab !== false} label="Открывать в новой вкладке" onChange={value => patchUi({ newTab: value })} />
            </Row>
          </Card>
        )}

        {section === 'look' && (
          <>
            <Card title="Тема">
              <div className="nx-choices">
                {([['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']] as const).map(([value, label]) => (
                  <button key={value} type="button" className={appearance.theme === value ? 'on' : ''}
                    aria-pressed={appearance.theme === value} onClick={() => setAppearance({ ...appearance, theme: value })}>
                    {label}{appearance.theme === value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Акцент" hint="Цвет активных вкладок, кнопок и выделений.">
              <div className="nx-swatches">
                {ACCENTS.map(color => (
                  <button key={color} type="button" style={{ background: color }} aria-label={`Акцент ${color}`}
                    aria-pressed={appearance.accent === color} className={appearance.accent === color ? 'on' : ''}
                    onClick={() => setAppearance({ ...appearance, accent: color })} />
                ))}
              </div>
            </Card>
            <Card title="Фон рабочего пространства" hint="Подложка главной страницы за плитками.">
              <div className="nx-choices">
                {WALLPAPERS.map(([value, label]) => (
                  <button key={value} type="button" className={(appearance.wallpaper ?? 'aurora') === value ? 'on' : ''}
                    aria-pressed={(appearance.wallpaper ?? 'aurora') === value}
                    onClick={() => setAppearance({ ...appearance, wallpaper: value })}>
                    <i className={'nx-wall-dot wall-' + value} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
            </Card>
          </>
        )}

        {section === 'tiles' && (
          <>
            <Card title="Режим отображения" hint="Как выглядит одна плитка в сетке на широком экране.">
              <div className="nx-choices">
                {TILE_MODES.map(([value, label]) => (
                  <button key={value} type="button" className={(tile.mode ?? 'standard') === value ? 'on' : ''}
                    aria-pressed={(tile.mode ?? 'standard') === value} onClick={() => patchTile({ mode: value })}>{label}</button>
                ))}
              </div>
            </Card>
            <Card title="Размер плитки">
              <div className="nx-choices">
                {TILE_SIZES.map(([value, label]) => (
                  <button key={value} type="button" className={(tile.size ?? 'M') === value ? 'on' : ''}
                    aria-pressed={(tile.size ?? 'M') === value} onClick={() => patchTile({ size: value })}>{label}</button>
                ))}
              </div>
            </Card>
            <Card title="Сетка и карточка">
              <Range label="Расстояние между плитками" min={8} max={32} step={2} value={density} onChange={setDensity} />
              <Range label="Скругление карточки" min={8} max={32} step={1} value={tile.radius ?? 20} onChange={value => patchTile({ radius: value })} />
              <Range label="Размер иконки" min={24} max={56} step={2} value={tile.iconSize ?? 40} onChange={value => patchTile({ iconSize: value })} />
            </Card>
            <Card title="Наведение и шрифт">
              <Choice label="Эффект наведения" options={HOVERS} value={tile.hover ?? 'lift'}
                onChange={value => patchTile({ hover: value })} />
              <Choice label="Шрифт плиток" options={FONTS.map(font => [font, font] as [string, string])}
                value={tile.font ?? 'Manrope'} onChange={font => patchTile({ font })} />
            </Card>
            <Card title="Что показывать на плитке">
              <Row title="Описание сайта" desc="Короткая подпись под названием">
                <Toggle value={tile.showDescription === true} label="Описание сайта" onChange={value => patchTile({ showDescription: value })} />
              </Row>
              <Row title="Адрес сайта" desc="Домен под названием">
                <Toggle value={tile.showDomain === true} label="Адрес сайта" onChange={value => patchTile({ showDomain: value })} />
              </Row>
              <Row title="Значки уведомлений" desc="Красный счётчик в углу плитки">
                <Toggle value={tile.showNotifications !== false} label="Значки уведомлений" onChange={value => patchTile({ showNotifications: value })} />
              </Row>
              <Row title="Логотипы сайтов" desc="Иконка загружается с самого сайта; иначе монограмма">
                <Toggle value={ui.siteIcons !== false} label="Логотипы сайтов" onChange={value => patchUi({ siteIcons: value })} />
              </Row>
            </Card>
          </>
        )}

        {section === 'panel' && (
          <Card title="Боковое окно" hint="Ширина применяется к развёрнутому окну; свёрнутое всегда показывает только иконки.">
            <Row title="Ширина окна" desc="Развёрнутое состояние проводника">
              <select aria-label="Ширина бокового окна" value={ui.sidebarWidth ?? '292px'}
                onChange={event => patchUi({ sidebarWidth: event.target.value })}>
                {PANEL_WIDTHS.map(width => <option key={width} value={width}>{width.replace('px', ' px')}</option>)}
              </select>
            </Row>
            <Row title="Проводник проектов" desc="Дерево «проект → категория → группа»">
              <Toggle value={ui.projects !== false} label="Проводник проектов" onChange={value => patchUi({ projects: value })} />
            </Row>
            <Row title="Погода в нижней строке" desc="Температура рядом с часами">
              <Toggle value={ui.weather} label="Погода в боковом окне" onChange={value => patchUi({ weather: value })} />
            </Row>
          </Card>
        )}

        {section === 'mobile' && (
          <Card title="Вид по умолчанию" hint="С этого вида открывается главная страница на узком экране; переключатель остаётся над сеткой.">
            <div className="nx-views">
              {MOBILE_VIEWS.map(([value, label, hint]) => (
                <button key={value} type="button" className={(ui.mobileMode ?? 'table') === value ? 'on' : ''}
                  aria-pressed={(ui.mobileMode ?? 'table') === value} onClick={() => patchUi({ mobileMode: value })}>
                  <b>{label}</b><small>{hint}</small>
                  {(ui.mobileMode ?? 'table') === value && <Check size={14} />}
                </button>
              ))}
            </div>
          </Card>
        )}

        {section === 'search' && (
          <Card title="Поиск" hint="Омнибокс открывает адрес или ищет запрос в выбранной системе.">
            <Row title="Поисковая система" desc="Куда уходит запрос из омнибокса">
              <select aria-label="Поисковая система" value={ui.searchEngine} onChange={event => patchUi({ searchEngine: event.target.value })}>
                {SEARCH_ENGINES.map(engine => <option key={engine} value={engine}>{engine}</option>)}
              </select>
            </Row>
            <Row title="Поиск по закладкам" desc="Поле в панели быстрого доступа фильтрует плитки">
              <Toggle value={ui.searchLocal !== false} label="Поиск по закладкам" onChange={value => patchUi({ searchLocal: value })} />
            </Row>
            <Row title="Подсказки из закладок" desc="Список названий сохранённых сайтов под полем ввода">
              <Toggle value={ui.searchSuggestions !== false} label="Подсказки из закладок" onChange={value => patchUi({ searchSuggestions: value })} />
            </Row>
          </Card>
        )}

        {section === 'weather' && (
          <Card title="Погода" hint="Данные берутся с Open-Meteo без ключа. Запрос отправляется сервису Open-Meteo при обновлении прогноза.">
            <Row title="Показывать погоду" desc="Карточка внизу бокового окна">
              <Toggle value={ui.weather} label="Показывать погоду" onChange={value => patchUi({ weather: value })} />
            </Row>
            <Row title="Город" desc="Точка, для которой запрашивается прогноз">
              <select aria-label="Город" value={ui.weatherCity} onChange={event => patchUi({ weatherCity: event.target.value })}>
                {CITIES.map(city => <option key={city}>{city}</option>)}
              </select>
            </Row>
            <Row title="Единицы" desc="Шкала температуры">
              <select aria-label="Единицы температуры" value={ui.weatherUnits} onChange={event => patchUi({ weatherUnits: event.target.value })}>
                {UNITS.map(unit => <option key={unit}>{unit}</option>)}
              </select>
            </Row>
            <Row title="Обновлять автоматически" desc="Раз в полчаса">
              <Toggle value={ui.weatherAuto} label="Обновлять автоматически" onChange={value => patchUi({ weatherAuto: value })} />
            </Row>
          </Card>
        )}

        {section === 'privacy' && (
          <Card title="Приватность" hint="Плитки, проекты и категории всегда остаются в этом браузере: приложение не имеет сервера и никуда их не отправляет.">
            <Row title="История открытий" desc="Наполняет раздел «Недавние»">
              <Toggle value={ui.saveHistory !== false} label="История открытий" onChange={value => patchUi({ saveHistory: value })} />
            </Row>
            <Row title="Логотипы сайтов" desc="Запрос favicon сообщает сайту об открытии панели">
              <Toggle value={ui.siteIcons !== false} label="Логотипы сайтов в приватности" onChange={value => patchUi({ siteIcons: value })} />
            </Row>
            <Row title="Внешние превью" desc="Скриншот страницы через сторонний сервис при добавлении сайта">
              <Toggle value={ui.remotePreviews === true} label="Внешние превью" onChange={value => patchUi({ remotePreviews: value })} />
            </Row>
          </Card>
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

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="nx-card">
      <h3>{title}</h3>
      {hint && <p className="nx-card-hint">{hint}</p>}
      {children}
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="nx-row">
      <span><b>{title}</b><small>{desc}</small></span>
      {children}
    </div>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="nx-choice-block">
      <span className="nx-range-label">{label}</span>
      <div className="nx-choices">
        {options.map(([id, text]) => (
          <button key={id} type="button" className={value === id ? 'on' : ''} aria-pressed={value === id}
            onClick={() => onChange(id)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Range({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="nx-range">
      <span className="nx-range-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={event => onChange(Number(event.target.value))} />
      <output>{value}px</output>
    </label>
  );
}

function Toggle({ value, label, onChange }: { value: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} aria-label={label}
      className={'nx-switch' + (value ? ' on' : '')} onClick={() => onChange(!value)}>
      <span />
    </button>
  );
}

function DataSection({ sites, setSites, categories, setCategories, groups, setGroups, projects, setProjects, sessions, setSessions, density, ui, tile, appearance }: SettingsProps) {
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
        const parsed = html ? { sites: parseBookmarkHtml(text) } as ReturnType<typeof parseBackup> : parseBackup(text);
        const incoming = Array.isArray(parsed.sites) ? parsed.sites as Site[] : [];
        const fresh = withoutExistingDomains(incoming, sites).map((site, index) => ({
          ...site,
          id: site.id || `site-${site.domain.replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}-${index}`,
        }));
        if (fresh.length) setSites(current => [...fresh, ...current]);
        if (!html) {
          if (Array.isArray(parsed.projects)) setProjects(current => mergeById(parsed.projects as Project[], current));
          if (Array.isArray(parsed.categories)) setCategories(current => mergeById(parsed.categories as Category[], current));
          if (Array.isArray(parsed.groups)) setGroups(current => mergeById(parsed.groups as SiteGroup[], current));
          if (Array.isArray(parsed.sessions)) setSessions(current => mergeById(parsed.sessions as BrowserSession[], current));
        }
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
          <button type="button" onClick={() => download(createBackup({ sites, projects, categories, groups, sessions, settings: { density, ui, tile, appearance } }), 'application/json', 'nexus-backup.json')}>
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

function mergeById<T extends { id?: string }>(incoming: T[], current: T[]): T[] {
  return [...incoming, ...current.filter(item => !incoming.some(next => next.id === item.id))];
}
