import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Clock3, ExternalLink, FolderTree, Globe, Home, Keyboard, Layers3, LayoutGrid, ListFilter,
  PanelLeft, Plus, Search, Settings as SettingsIcon, Star, StickyNote, Tag, Trash2, X,
} from './icons.generated';
import type { ControlIcon } from './SettingControls';
import { SiteIcon } from './SiteIcon';
import { rankPaletteItems } from '../domain/palette';
import type { PaletteItem, PaletteKind, RankedPaletteItem } from '../domain/palette';
import { useFocusTrap } from '../hooks/useFocusTrap';

const KIND_ICON: Record<Exclude<PaletteKind, 'site'>, ControlIcon> = {
  command: Keyboard, section: LayoutGrid, project: Layers3, category: Tag, group: FolderTree, web: Globe,
};

/** Своя иконка у каждой команды и раздела: одинаковые строки не читаются. */
const NAMED_ICON: Record<string, ControlIcon> = {
  plus: Plus, project: Layers3, category: Tag, settings: SettingsIcon, panel: PanelLeft,
  dock: LayoutGrid, trash: Trash2, filter: ListFilter, clear: X, home: Home, star: Star,
  clock: Clock3, note: StickyNote, search: Search, open: ExternalLink,
};

/** Подсветка попаданий в название. Диапазоны режут строку по границам символов. */
function Highlight({ text, positions }: { text: string; positions: number[] }) {
  if (!positions.length) return <>{text}</>;
  const ranges: [number, number][] = [];
  for (const start of positions) {
    const code = text.codePointAt(start);
    const end = start + (code !== undefined && code > 0xffff ? 2 : 1);
    const last = ranges[ranges.length - 1];
    if (last && last[1] === start) last[1] = end;
    else ranges.push([start, end]);
  }
  const parts: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: text.slice(at, start), hit: false });
    parts.push({ text: text.slice(start, end), hit: true });
    at = end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return <>{parts.map((part, index) => part.hit
    ? <mark key={index} className="nx-palette-hit">{part.text}</mark>
    : <span key={index}>{part.text}</span>)}</>;
}

export type CommandPaletteProps = {
  items: PaletteItem[];
  /** Строки, которые приложение добавляет под результатами: открыть адрес, искать в сети, отфильтровать сетку. */
  tail?: (query: string) => PaletteItem[];
  /** Палитра открывается с уже набранным запросом, если сетка сейчас отфильтрована. */
  initialQuery?: string;
  /** «Подсказки из закладок»: выключены — до ввода видны только команды и разделы. */
  suggestions?: boolean;
  /** «Логотипы сайтов» из настроек передаются знаку сайта. */
  logos?: boolean;
  limit?: number;
  onRun: (item: PaletteItem, query: string) => void;
  onClose: () => void;
};

export function CommandPalette({
  items, tail, initialQuery = '', suggestions = true, logos = true, limit = 24, onRun, onClose,
}: CommandPaletteProps) {
  const dialogRef = useFocusTrap<HTMLElement>(true);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);

  const visible = useMemo<RankedPaletteItem[]>(() => {
    const ranked = rankPaletteItems(items, query, limit);
    if (!query.trim()) {
      // До ввода подсказки из закладок можно выключить: остаются вызываемые вещи.
      return suggestions ? ranked : ranked.filter(item => item.kind === 'command' || item.kind === 'section');
    }
    const extra = tail?.(query) ?? [];
    return [...ranked, ...extra.map(item => ({ ...item, score: 0, positions: [] }))];
  }, [items, query, limit, suggestions, tail]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    const row = listRef.current?.querySelector('[aria-selected="true"]');
    // jsdom и старые движки не умеют scrollIntoView — прокрутка не критична.
    if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
  }, [active, visible]);

  const current = visible[Math.min(active, visible.length - 1)];

  const move = (delta: number) => {
    if (!visible.length) return;
    setActive(index => (index + delta + visible.length) % visible.length);
  };

  return (
    <div className="nx-palette-layer" role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        className="nx-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск и команды"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
          if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; }
          if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; }
          if (event.key === 'Home' && visible.length) { event.preventDefault(); setActive(0); return; }
          if (event.key === 'End' && visible.length) { event.preventDefault(); setActive(visible.length - 1); return; }
          if (event.key === 'Enter' && current) { event.preventDefault(); onRun(current, query); }
        }}
      >
        <label className="nx-palette-field">
          <Search size={19} aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Сайт, проект, команда или адрес"
            aria-label="Поиск по всем закладкам и командам"
            role="combobox"
            aria-expanded={visible.length > 0}
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="nx-palette-kbd">Esc</kbd>
        </label>

        <div className="nx-palette-list" id={listId} role="listbox" aria-label="Результаты" ref={listRef}>
          {visible.map((item, index) => {
            const selected = item === current;
            const Icon = item.kind === 'site' ? null : (item.icon && NAMED_ICON[item.icon]) || KIND_ICON[item.kind];
            return (
              <div
                key={item.id}
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={selected}
                className={'nx-palette-row' + (selected ? ' on' : '')}
                onMouseMove={() => setActive(index)}
                onMouseDown={event => { event.preventDefault(); onRun(item, query); }}
              >
                <span className="nx-palette-mark" style={item.color ? { color: item.color } : undefined}>
                  {item.kind === 'site'
                    ? <SiteIcon title={item.title} domain={item.domain ?? ''} logos={logos} className="nx-mark nx-palette-site" />
                    : Icon && <Icon size={17} aria-hidden="true" />}
                </span>
                <span className="nx-palette-text">
                  <b><Highlight text={item.title} positions={item.positions} /></b>
                  {item.hint && <span>{item.hint}</span>}
                </span>
                {item.shortcut && <kbd className="nx-palette-kbd">{item.shortcut}</kbd>}
              </div>
            );
          })}
          {!visible.length && (
            <p className="nx-palette-empty">
              {query.trim() ? 'Ничего не найдено' : 'Начните вводить название сайта или команду'}
            </p>
          )}
        </div>

        <footer className="nx-palette-foot">
          <span><kbd className="nx-palette-kbd">↑</kbd><kbd className="nx-palette-kbd">↓</kbd> выбор</span>
          <span><kbd className="nx-palette-kbd">Enter</kbd> открыть</span>
          <span><kbd className="nx-palette-kbd">Esc</kbd> закрыть</span>
        </footer>
      </section>
    </div>
  );
}
