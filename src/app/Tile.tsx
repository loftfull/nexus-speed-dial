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

export type TileProps = {
  site: SiteRecord;
  showDomain?: boolean;
  showBadge?: boolean;
  useFavicons?: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function Tile({ site, showDomain = false, showBadge = true, useFavicons = true, onOpen, onFavorite, onEdit, onDelete }: TileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div
      className={'nx-tile' + (menuOpen ? ' menu-open' : '')}
      ref={holder}
      onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { event.stopPropagation(); close(); } }}
    >
      <button type="button" className="nx-tile-face" aria-label={`Открыть «${site.title}»`} onClick={onOpen}>
        <span className={'nx-mark' + (icon ? ' plain' : '')} style={icon ? undefined : { background: site.color }} aria-hidden="true">
          {icon
            ? <img src={icon} alt="" loading="lazy" onError={() => setIconFailed(true)} />
            : monogram(site.title)}
        </span>
        <span className="nx-tile-name">{site.title}</span>
        {showDomain && <span className="nx-tile-sub">{site.domain}</span>}
      </button>
      {site.favorite && !site.badge && <Star className="nx-tile-star" size={14} fill="currentColor" aria-label="В избранном" />}
      {showBadge && site.badge && <span className="nx-tile-badge" aria-label={`Уведомлений: ${site.badge}`}>{site.badge}</span>}
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
