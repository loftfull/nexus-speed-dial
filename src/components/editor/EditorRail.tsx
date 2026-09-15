import { Calendar, CheckSquare, Clock3, LayoutGrid, Palette, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../state/useAppStore.ts';
import type { TilePreset } from '../../domain/types.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './EditorRail.module.css';

const sizeOptions = ['S', 'M', 'L', 'XL'] as const;

const modeOptions: Array<{ id: TilePreset; label: string }> = [
  { id: 'minimal', label: 'Минимальный' },
  { id: 'standard', label: 'Стандарт' },
  { id: 'expanded', label: 'Крупный' },
  { id: 'list', label: 'Список' },
];

const glassOptions = [
  { label: 'Минимальное', opacity: 0.35, blur: 10, saturation: 110 },
  { label: 'Стандарт', opacity: 0.68, blur: 18, saturation: 122 },
  { label: 'Выраженное', opacity: 0.88, blur: 24, saturation: 140 },
];

const shadowOptions = [
  { label: 'Лёгкая', opacity: 0.04, depth: 5, softness: 14 },
  { label: 'Средняя', opacity: 0.08, depth: 9, softness: 25 },
  { label: 'Глубокая', opacity: 0.16, depth: 14, softness: 38 },
];

const hoverOptions = [
  { label: 'Выключено', enabled: false, lift: 0, glow: false },
  { label: 'Подъём', enabled: true, lift: -4, glow: false },
  { label: 'Свечение', enabled: true, lift: -2, glow: true },
  { label: 'Пульс', enabled: true, lift: -3, glow: true },
];

const tabs = [
  { id: 'tiles', label: 'Плитки' },
  { id: 'glass', label: 'Стекло' },
  { id: 'shadows', label: 'Тени' },
  { id: 'hover', label: 'Реакции' },
  { id: 'labels', label: 'Подписи' },
  { id: 'extra', label: 'Доп.' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const previewTiles = [
  { title: 'Telegram', sub: 'общение', tone: '#33a8db' },
  { title: 'YouTube', sub: 'видео', tone: '#ff4d4d', badge: 12 },
  { title: 'Google Диск', sub: 'файлы', tone: '#3ea859' },
  { title: 'Почта', sub: 'электронная почта', tone: '#f1a941', badge: 5 },
  { title: 'GitHub', sub: 'разработка', tone: '#2b3137' },
  { title: 'Календарь', sub: 'планирование', tone: '#5b7df9', date: 31 },
];

function matchGlass(s: { glassOpacity: number }) {
  return glassOptions.reduce((best, opt) =>
    Math.abs(opt.opacity - s.glassOpacity) < Math.abs(best.opacity - s.glassOpacity) ? opt : best
  ).label;
}

function matchShadow(s: { shadowOpacity: number }) {
  return shadowOptions.reduce((best, opt) =>
    Math.abs(opt.opacity - s.shadowOpacity) < Math.abs(best.opacity - s.shadowOpacity) ? opt : best
  ).label;
}

function matchHover(s: { hoverEnabled: boolean; hoverGlow: boolean }) {
  if (!s.hoverEnabled) return 'Выключено';
  if (s.hoverGlow) return 'Свечение';
  return 'Подъём';
}

export function EditorRail() {
  const [tab, setTab] = useState<TabId>('tiles');
  const [saved, setSaved] = useState(false);
  const settings = useAppStore(state => state.tileSettings);
  const setTileSetting = useAppStore(state => state.setTileSetting);
  const applyPreset = useAppStore(state => state.applyTilePreset);
  const resetTileSettings = useAppStore(state => state.resetTileSettings);

  const activeGlass = matchGlass(settings);
  const activeShadow = matchShadow(settings);
  const activeHover = matchHover(settings);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return <GlassSurface as="aside" role="panel" className={styles.rail} data-testid="editor-rail" aria-label="Редактор плиток">
    <header className={styles.head}>
      <Sparkles size={16}/>
      <div>
        <b>Плитки сайтов</b>
        <small>Внешний вид, анимация и подписи</small>
      </div>
    </header>

    <nav className={styles.tabs} aria-label="Разделы редактора">
      {tabs.map(t => (
        <button key={t.id} type="button" className={tab === t.id ? styles.active : ''} onClick={() => setTab(t.id)}>{t.label}</button>
      ))}
    </nav>

    <div className={styles.tabContent}>
      {tab === 'tiles' && <section className={styles.panel}>
        <h4>Размер</h4>
        <div className={styles.sizeRow}>
          {sizeOptions.map(size => (
            <button key={size} type="button" className={settings.size === size ? styles.active : ''} onClick={() => setTileSetting('size', size)}>{size}</button>
          ))}
        </div>
        <h4>Режим</h4>
        <div className={styles.modeRow}>
          {modeOptions.map(option => (
            <button key={option.id} type="button" className={settings.preset === option.id ? styles.active : ''} onClick={() => applyPreset(option.id)}>{option.label}</button>
          ))}
        </div>
      </section>}

      {tab === 'glass' && <section className={styles.panel}>
        <h4>Стекло</h4>
        <div className={styles.pills}>
          {glassOptions.map(option => (
            <button
              key={option.label}
              type="button"
              className={activeGlass === option.label ? styles.active : ''}
              onClick={() => {
                setTileSetting('glassOpacity', option.opacity);
                setTileSetting('blur', option.blur);
                setTileSetting('saturation', option.saturation);
              }}
            >{option.label}</button>
          ))}
        </div>
      </section>}

      {tab === 'shadows' && <section className={styles.panel}>
        <h4>Тени</h4>
        <div className={styles.pills}>
          {shadowOptions.map(option => (
            <button
              key={option.label}
              type="button"
              className={activeShadow === option.label ? styles.active : ''}
              onClick={() => {
                setTileSetting('shadowOpacity', option.opacity);
                setTileSetting('shadowDepth', option.depth);
                setTileSetting('shadowSoftness', option.softness);
              }}
            >{option.label}</button>
          ))}
        </div>
      </section>}

      {tab === 'hover' && <section className={styles.panel}>
        <h4>Реакция при наведении</h4>
        <div className={styles.pills}>
          {hoverOptions.map(option => (
            <button
              key={option.label}
              type="button"
              className={activeHover === option.label ? styles.active : ''}
              onClick={() => {
                setTileSetting('hoverEnabled', option.enabled);
                setTileSetting('hoverLift', option.lift);
                setTileSetting('hoverGlow', option.glow);
              }}
            >{option.label}</button>
          ))}
        </div>
      </section>}

      {tab === 'labels' && <section className={styles.panel}>
        <h4>Подписи</h4>
        <div className={styles.pills}>
          <button type="button" className={settings.showTitle ? styles.active : ''} onClick={() => setTileSetting('showTitle', !settings.showTitle)}>Заголовок</button>
          <button type="button" className={settings.showSubtitle ? styles.active : ''} onClick={() => setTileSetting('showSubtitle', !settings.showSubtitle)}>Подпись</button>
          <button type="button" className={settings.showCategory ? styles.active : ''} onClick={() => setTileSetting('showCategory', !settings.showCategory)}>Категория</button>
          <button type="button" className={settings.showDomain ? styles.active : ''} onClick={() => setTileSetting('showDomain', !settings.showDomain)}>Мета</button>
        </div>
      </section>}

      {tab === 'extra' && <section className={styles.panel}>
        <h4>Быстрые разделы</h4>
        <div className={styles.shortcuts}>
          <span><Calendar size={13}/>Календарь</span>
          <span><CheckSquare size={13}/>Задачи</span>
          <span><Clock3 size={13}/>История</span>
          <span><LayoutGrid size={13}/>Вид</span>
          <span><Palette size={13}/>Тема</span>
          <span><Star size={13}/>Избранное</span>
        </div>
      </section>}
    </div>

    <section>
      <h4>Предпросмотр</h4>
      <div className={styles.preview}>
        {previewTiles.map(tile => (
          <div key={tile.title} className={styles.previewTile}>
            <div className={styles.previewIcon} style={{ background: tile.tone }}>
              {tile.date ? <span className={styles.previewDate}>{tile.date}</span> : tile.title.slice(0, 1)}
            </div>
            <span className={styles.previewTitle}>{tile.title}</span>
            <span className={styles.previewSub}>{tile.sub}</span>
            {tile.badge && <em className={styles.previewBadge}>{tile.badge}</em>}
          </div>
        ))}
      </div>
    </section>

    <div className={styles.actions}>
      <button type="button" className={styles.reset} onClick={resetTileSettings}>Сбросить</button>
      <button type="button" className={styles.save} onClick={handleSave}>{saved ? 'Сохранено ✓' : 'Сохранить'}</button>
    </div>
  </GlassSurface>;
}
