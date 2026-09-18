import React, { useRef, useState } from 'react';
import { Check, ChevronDown, Database, Download, Palette, Search, ShieldCheck, Trash2, Upload, X, Grid2X2, CloudSun } from 'lucide-react';
import type { AppearanceState, TileState, UiState } from '../domain/appStore';
import type { BrowserSession, Category, Project, SiteGroup, SiteRecord as Site } from '../domain/types';
import { createBackup, parseBackup } from '../domain/backup';
import { createBookmarkHtml, parseBookmarkHtml, withoutExistingDomains } from '../domain/importUtils';
import { SEARCH_ENGINES } from '../domain/webSearch';
import { sites as countSites } from '../domain/plural';
import { BrowserImportPanel } from '../components/BrowserImportPanel';
import { ActionDialog } from './ActionDialog';

type SectionId = 'look' | 'tiles' | 'search' | 'weather' | 'privacy' | 'data';
const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'look', label: 'Оформление', icon: Palette },
  { id: 'tiles', label: 'Плитки', icon: Grid2X2 },
  { id: 'search', label: 'Поиск', icon: Search },
  { id: 'weather', label: 'Погода', icon: CloudSun },
  { id: 'privacy', label: 'Приватность', icon: ShieldCheck },
  { id: 'data', label: 'Данные', icon: Database },
];

const ACCENTS = ['#2f6fe4', '#6d51e0', '#0f9d76', '#e0851f', '#c9364f', '#0f8ab8'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Берлин', 'Лондон'];
const UNITS = ['Цельсий (°C)', 'Фаренгейт (°F)'];
const TILE_SIZES: [string, string][] = [['S', 'Плотно'], ['M', 'Обычно'], ['L', 'Крупно'], ['XL', 'Очень крупно']];

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
              {expanded && <div className="nx-fold-body">{renderSection(item.id)}</div>}
            </section>
          );
        })}
      </div>
    </section>
  );

  function renderSection(section: SectionId) {
    return <>
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
          </>
        )}

        {section === 'tiles' && (
          <>
            <Card title="Размер плитки">
              <div className="nx-choices">
                {TILE_SIZES.map(([value, label]) => (
                  <button key={value} type="button" className={(tile.size ?? 'M') === value ? 'on' : ''}
                    aria-pressed={(tile.size ?? 'M') === value} onClick={() => patchTile({ size: value })}>{label}</button>
                ))}
              </div>
            </Card>
            <Card title="Расстояние между плитками">
              <label className="nx-range">
                <input type="range" min={8} max={32} step={2} value={density} aria-label="Расстояние между плитками"
                  onChange={event => setDensity(Number(event.target.value))} />
                <output>{density}px</output>
              </label>
            </Card>
            <Card title="Что показывать на плитке">
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
          <Card title="Приватность" hint="Плитки, проекты и категории всегда остаются в этом браузере.">
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
