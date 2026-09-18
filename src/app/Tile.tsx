import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MoreVertical, Pencil, Star, Trash2 } from 'lucide-react';
import type { SiteRecord } from '../domain/types';

/** Two-letter monogram used until (or instead of) the site's own favicon. */
export function monogram(title: string): string {
  const words = title.trim().split(/[\s_.\-—]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** How one site is drawn. `table`/`row`/`icon` back the three mobile arrangements. */
export type TileLayout = 'standard' | 'icon' | 'list' | 'preview' | 'table' | 'row';

/** Layouts that put the icon beside the text instead of above it. */
const HORIZONTAL: TileLayout[] = ['list', 'row'];

export type TileProps = {
  site: SiteRecord;
  /** Media type used to hand the site over to a drop target such as the dock. */
  dragType?: string;
  layout?: TileLayout;
  showDomain?: boolean;
  showDescription?: boolean;
  showCategory?: boolean;
  useFavicons?: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function Tile({
  site, dragType, layout = 'standard', showDomain = false, showDescription = false,
  showCategory = false, useFavicons = true, onOpen, onFavorite, onEdit, onDelete,
}: TileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // The monogram stays on screen until the site's own icon has actually loaded:
  // a pending or broken <img> draws a placeholder in WebKit otherwise.
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const icon = useFavicons && !iconFailed && site.domain ? `https://${site.domain}/favicon.ico` : '';

  useEffect(() => {
    if (!menuOpen) return;
    const away = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [menuOpen]);

  const close = () => { setMenuOpen(false); toggle.current?.focus(); };

  // `row` spells the description out in full; `table` and `preview` keep it to a hint.
  const detailed = layout === 'row' || layout === 'list';
  const wantsDescription = layout === 'table' || layout === 'preview' || detailed || showDescription;
  const description = layout === 'icon' ? '' : (wantsDescription ? site.desc?.trim() ?? '' : '');
  const domain = layout === 'icon' ? '' : (detailed || showDomain ? site.domain : '');
  const category = layout === 'icon' ? '' : (showCategory ? site.category : '');

  return (
    <div
      className={'nx-tile nx-tile-' + layout + (menuOpen ? ' menu-open' : '')}
      ref={holder}
      draggable={Boolean(dragType && site.id)}
      onDragStart={event => {
        if (!dragType || !site.id) return;
        event.dataTransfer.setData(dragType, site.id);
        event.dataTransfer.effectAllowed = 'copy';
      }}
      onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { event.stopPropagation(); close(); } }}
    >
      <button type="button" className="nx-tile-face" aria-label={`Открыть «${site.title}»`} onClick={onOpen}>
        <span className={'nx-mark' + (iconLoaded ? ' plain' : '')} style={iconLoaded ? undefined : { background: site.color }} aria-hidden="true">
          {icon && <img src={icon} alt="" loading="lazy" hidden={!iconLoaded}
            onLoad={() => setIconLoaded(true)} onError={() => setIconFailed(true)} />}
          {!iconLoaded && monogram(site.title)}
        </span>
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
      {site.favorite && <Star className="nx-tile-star" size={14} fill="currentColor" aria-label="В избранном" />}
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
