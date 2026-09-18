import { useEffect, useRef, useState } from 'react';
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
