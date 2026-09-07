import { Database, LayoutGrid, Palette, RotateCcw, Search, X } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import type { TileAppearanceSettings, TilePreset, TileSize, UserPreferences } from '../../domain/types.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { DataControls } from '../sections/DataControls.tsx';
import { getSizePatch } from './tileSettingsPanelModel.ts';
import styles from './TileSettingsPanel.module.css';

type TileSetter = <K extends keyof TileAppearanceSettings>(key: K, value: TileAppearanceSettings[K]) => void;
type PreferenceSetter = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;

function SelectRow({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: ReactNode }) {
  return <label className={styles.row}><span>{label}</span><select aria-label={label} value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>{children}</select></label>;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={styles.toggle}><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" aria-label={label} checked={checked} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}/></label>;
}

const presetLabels: Record<'minimal' | 'standard' | 'large' | 'list', string> = {
  minimal: 'Минимальный',
  standard: 'Стандарт',
  large: 'Крупный',
  list: 'Список',
};

export function TileSettingsPanel() {
  const open = useAppStore(state => state.settingsOpen);
  const setOpen = useAppStore(state => state.setSettingsOpen);
  const preferences = useAppStore(state => state.preferences);
  const setPreference = useAppStore(state => state.setPreference) as PreferenceSetter;
  const resetPreferences = useAppStore(state => state.resetPreferences);
  const settings = useAppStore(state => state.tileSettings);
  const setTile = useAppStore(state => state.setTileSetting) as TileSetter;
  const applyPreset = useAppStore(state => state.applyTilePreset);
  const resetTiles = useAppStore(state => state.resetTileSettings);
  const clearHistory = useAppStore(state => state.clearHistory);

  if (!open) return null;

  const setSize = (size: TileSize) => {
    const patch = getSizePatch(size);
    for (const [key, value] of Object.entries(patch) as Array<[keyof typeof patch, typeof patch[keyof typeof patch]]>) setTile(key, value as never);
  };

  const choosePreset = (preset: 'minimal' | 'standard' | 'large' | 'list') => applyPreset(preset as TilePreset);
  const resetAll = () => { resetPreferences(); resetTiles(); };

  return <div className={styles.layer} role="presentation" onMouseDown={() => setOpen(false)}>
    <GlassSurface as="aside" role="popover" className={styles.panel} data-testid="settings-panel" onMouseDown={event => event.stopPropagation()}>
      <header>
        <div><b>Настройки Nexus</b><small>Только параметры, которые влияют на ежедневное использование</small></div>
        <button aria-label="Закрыть настройки" onClick={() => setOpen(false)}><X size={19}/></button>
      </header>

      <section>
        <h3><Palette size={16}/>Внешний вид</h3>
        <SelectRow label="Тема" value={preferences.theme} onChange={value => setPreference('theme', value as UserPreferences['theme'])}><option value="system">Системная</option><option value="light">Светлая</option><option value="dark">Тёмная</option></SelectRow>
        <SelectRow label="Плотность" value={preferences.density} onChange={value => setPreference('density', value as UserPreferences['density'])}><option value="comfortable">Комфортная</option><option value="compact">Компактная</option></SelectRow>
        <SelectRow label="Фон" value={preferences.background} onChange={value => setPreference('background', value as UserPreferences['background'])}><option value="soft">Мягкий</option><option value="clean">Чистый</option><option value="contrast">Контрастный</option></SelectRow>
        <SelectRow label="Стекло" value={preferences.glassStrength} onChange={value => setPreference('glassStrength', value as UserPreferences['glassStrength'])}><option value="minimal">Минимальное</option><option value="standard">Стандарт</option><option value="strong">Выраженное</option></SelectRow>
      </section>

      <section>
        <h3><LayoutGrid size={16}/>Плитки</h3>
        <div className={styles.presets}>{(['minimal', 'standard', 'large', 'list'] as const).map(preset => <button key={preset} type="button" className={settings.preset === preset ? styles.active : ''} onClick={() => choosePreset(preset)}>{presetLabels[preset]}</button>)}</div>
        <div className={styles.sizes}>{(['S', 'M', 'L', 'XL'] as TileSize[]).map(size => <button key={size} type="button" className={settings.size === size ? styles.active : ''} onClick={() => setSize(size)}>{size}</button>)}</div>
        <SelectRow label="Колонки" value={settings.columns} onChange={value => setTile('columns', value === 'auto' ? 'auto' : Number(value))}><option value="auto">Авто</option>{[2, 3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value}</option>)}</SelectRow>
        <SelectRow label="Выравнивание" value={settings.labelAlignment} onChange={value => setTile('labelAlignment', value as TileAppearanceSettings['labelAlignment'])}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></SelectRow>
        <Toggle label="Название сайта" checked={settings.showTitle} onChange={value => setTile('showTitle', value)}/>
        <Toggle label="Домен" checked={settings.showDomain} onChange={value => setTile('showDomain', value)}/>
      </section>

      <section>
        <h3><Search size={16}/>Поиск</h3>
        <SelectRow label="Поисковик" value={preferences.searchEngine} onChange={value => setPreference('searchEngine', value as UserPreferences['searchEngine'])}><option value="google">Google</option><option value="yandex">Яндекс</option><option value="duckduckgo">DuckDuckGo</option></SelectRow>
        <Toggle label="Искать во всех пространствах" hint="Omnibox показывает сайты вне текущего пространства" checked={preferences.globalSiteSearch} onChange={value => setPreference('globalSiteSearch', value)}/>
        <Toggle label="Подсказки Omnibox" checked={preferences.omniboxSuggestions} onChange={value => setPreference('omniboxSuggestions', value)}/>
      </section>

      <section>
        <h3><Database size={16}/>Данные</h3>
        <DataControls/>
        <div className={styles.dataActions}><button type="button" onClick={clearHistory}>Очистить историю</button><button type="button" onClick={resetAll}><RotateCcw size={15}/>Сбросить настройки</button></div>
      </section>

      <footer><span>Изменения сохраняются автоматически</span></footer>
    </GlassSurface>
  </div>;
}
