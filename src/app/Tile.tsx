import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, MoreVertical, Pencil, Star, Trash2 } from './icons.generated';
import type { SiteRecord } from '../domain/types';
import { SiteIcon } from './SiteIcon';

export { monogram } from './SiteIcon';

/** How one site is drawn. `table`/`row`/`icon` back the three mobile arrangements. */
export type TileLayout = 'standard' | 'icon' | 'list' | 'preview' | 'table' | 'row';

/** Layouts that put the icon beside the text instead of above it. */
const HORIZONTAL: TileLayout[] = ['list', 'row'];

export type TileProps = {
  site: SiteRecord;
  /** Номер плитки в сетке: из него сетка считает задержку каскада. */
  style?: React.CSSProperties;
  /** Media type used to hand the site over to a drop target such as the dock. */
  dragType?: string;
  layout?: TileLayout;
  showDomain?: boolean;
  showDescription?: boolean;
  showCategory?: boolean;
  useFavicons?: boolean;
  /** Плитка помечена в текущем выделении. */
  selected?: boolean;
  /** В сетке уже есть выделение: обычный щелчок продолжает его, а не открывает сайт. */
  selecting?: boolean;
  /** Щелчок с Ctrl/Cmd или долгое нажатие. */
  onSelectToggle?: () => void;
  onOpen: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function Tile({
  site, dragType, layout = 'standard', showDomain = false, showDescription = false,
  showCategory = false, useFavicons = true, selected = false, selecting = false,
  style, onSelectToggle, onOpen, onFavorite, onEdit, onDelete,
}: TileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * Долгое нажатие включает выделение там, где нет клавиатуры. Порог в 450 мс
   * выбран как у мобильных систем: короче — срабатывает при обычном касании,
   * длиннее — ощущается как зависание.
   */
  const hold = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const startHold = () => {
    if (!onSelectToggle) return;
    held.current = false;
    hold.current = window.setTimeout(() => { held.current = true; onSelectToggle(); }, 450);
  };
  const stopHold = () => { if (hold.current) window.clearTimeout(hold.current); hold.current = undefined; };
  useEffect(() => stopHold, []);
  const holder = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const away = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [menuOpen]);

  const close = () => { setMenuOpen(false); toggle.current?.focus(); };

  // Состав подписи задаёт переключатель, а не раскладка. Прежде строка и
  // список подставляли адрес сами, поверх настройки: пока адрес был включён по
  // умолчанию, разница не была видна, а стоило его выключить — элемент
  // оставался в разметке и прятался стилем. Один хозяин у решения надёжнее.
  // Исключение одно: в значках подписи нет вовсе, там нет для неё места.
  const description = layout === 'icon' ? '' : (showDescription ? site.desc?.trim() ?? '' : '');
  const domain = layout === 'icon' ? '' : (showDomain ? site.domain : '');
  const category = layout === 'icon' ? '' : (showCategory ? site.category : '');

  /**
   * Что не помещается на плитку, показывается подсказкой при наведении.
   * Плитка несёт знак и имя, но описание и адрес не должны пропадать совсем:
   * «Почта» и «mail.google.com» — разные сведения, и второе иногда решает.
   * Подсказка собирается только из того, чего на плитке сейчас нет.
   */
  const hint = [
    showDescription ? '' : site.desc?.trim() ?? '',
    showDomain ? '' : site.domain ?? '',
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={'nx-tile nx-tile-' + layout + (menuOpen ? ' menu-open' : '') + (selected ? ' picked' : '')}
      data-picked={selected ? 'true' : undefined}
      data-hint={hint || undefined}
      ref={holder}
      style={style}
      draggable={Boolean(dragType && site.id)}
      onDragStart={event => {
        if (!dragType || !site.id) return;
        event.dataTransfer.setData(dragType, site.id);
        event.dataTransfer.effectAllowed = 'copy';
      }}
      onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { event.stopPropagation(); close(); } }}
    >
      <button type="button" className="nx-tile-face"
        aria-label={selecting ? `Пометить «${site.title}»` : `Открыть «${site.title}»`}
        aria-pressed={selecting ? selected : undefined}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onClick={event => {
          // Долгое нажатие уже пометило плитку — открывать сайт не нужно.
          if (held.current) { held.current = false; return; }
          const additive = event.ctrlKey || event.metaKey;
          if (onSelectToggle && (additive || selecting)) { event.preventDefault(); onSelectToggle(); return; }
          onOpen();
        }}>
        <SiteIcon title={site.title} domain={site.domain} color={site.color} logos={useFavicons} />
        {HORIZONTAL.includes(layout) ? (
          <span className="nx-tile-text">
            <span className="nx-tile-name">{site.title}</span>
            {description && <span className="nx-tile-desc">{description}</span>}
            {domain && <span className="nx-tile-sub">{domain}</span>}
            {category && <span className="nx-tile-cat">{category}</span>}
          </span>
        ) : (
          <>
            <span className="nx-tile-name">{site.title}</span>
            {description && <span className="nx-tile-desc">{description}</span>}
            {domain && <span className="nx-tile-sub">{domain}</span>}
            {category && <span className="nx-tile-cat">{category}</span>}
          </>
        )}
      </button>
      {site.favorite && <Star className="nx-tile-star" size={14} weight="fill" aria-label="В избранном" />}
      <button
        type="button"
        ref={toggle}
        className="nx-tile-more"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Действия для «${site.title}»`}
        onClick={() => setMenuOpen(value => !value)}
      >
        <MoreVertical size={16} />
      </button>
      {menuOpen && (
        <div className="nx-menu" role="menu" aria-label={`Действия для «${site.title}»`}>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpen(); }}><ExternalLink size={15} /> Открыть</button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onFavorite(); }}>
            <Star size={15} /> {site.favorite ? 'Убрать из избранного' : 'В избранное'}
          </button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil size={15} /> Редактировать</button>
          <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={15} /> Удалить</button>
        </div>
      )}
    </div>
  );
}
