import { ExternalLink, FolderInput, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import type { Site, TilePreset } from '../../domain/types.ts';
import { nextTileState } from '../../domain/tileInteraction.ts';
import type { TileInteractionEvent, TileInteractionState } from '../../domain/tileInteraction.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { SiteIcon } from './SiteIcon.tsx';
import styles from './SiteTile.module.css';

export function SiteTile({ site, mode, selected = false }: { site: Site; mode: TilePreset; selected?: boolean }) {
  const [state, setState] = useState<TileInteractionState>(selected ? 'selected' : 'normal');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const categories = useAppStore(store => store.categories);
  const contentMode = useAppStore(store => store.contentMode);
  const setSiteEditor = useAppStore(store => store.setSiteEditor);
  const recordVisit = useAppStore(store => store.recordVisit);
  const toggleFavorite = useAppStore(store => store.toggleFavorite);
  const removeSite = useAppStore(store => store.removeSite);

  useEffect(() => {
    setState(current => current === 'normal' || current === 'selected' ? selected ? 'selected' : 'normal' : current);
  }, [selected]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const transition = (event: TileInteractionEvent) => setState(current => nextTileState(current, event, selected));
  const enterDropTarget = (event: DragEvent<HTMLElement>) => { if (contentMode === 'recent') return; event.preventDefault(); transition('drag-enter'); };
  const label = categories.find(category => category.id === site.categoryId)?.name ?? '';
  const open = () => { recordVisit(site.id); window.location.assign(site.url); };
  const destroy = () => {
    if (!window.confirm(`Удалить «${site.title}» из Nexus?`)) return;
    removeSite(site.id);
    setMenuOpen(false);
  };

  return <article
    className={`${styles.tile} ${styles[mode]} ${selected ? styles.selected : ''}`}
    data-testid="site-tile"
    data-tile-state={state}
    draggable={contentMode !== 'recent'}
    onPointerDown={() => transition('pointer-down')}
    onPointerUp={() => transition('pointer-up')}
    onPointerCancel={() => transition('pointer-up')}
    onDragStart={() => contentMode !== 'recent' && transition('drag-start')}
    onDragEnd={() => transition('drag-end')}
    onDragEnter={enterDropTarget}
    onDragOver={(event: DragEvent<HTMLElement>) => contentMode !== 'recent' && event.preventDefault()}
    onDragLeave={() => transition('drag-leave')}
    onDrop={() => transition('drop')}
  >
    <a className={styles.hit} href={site.url} aria-label={site.title} onClick={() => recordVisit(site.id)} onFocus={() => transition('focus')} onBlur={() => transition('blur')}>
      {site.favorite && <Star className={styles.favorite} size={13} fill="currentColor" aria-label="В избранном"/>}
      <SiteIcon site={site}/>
      <span className={styles.labels}>
        <span className={styles.title}>{site.title}</span>
        <span className={styles.subtitle}>{site.subtitle}</span>
        <span className={styles.domain}>{site.domain}</span>
        <span className={styles.category}>{label}</span>
      </span>
      {site.badge && <em className={styles.badge}>{site.badge}</em>}
    </a>

    <div className={styles.menuWrap} ref={menuRef}>
      <button type="button" aria-label={`Действия ${site.title}`} aria-expanded={menuOpen} className={styles.menu} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(value => !value); }}><MoreHorizontal size={16}/></button>
      {menuOpen && <div className={styles.contextMenu} role="menu">
        <button type="button" role="menuitem" onClick={open}><ExternalLink size={14}/>Открыть</button>
        <button type="button" role="menuitem" onClick={() => { toggleFavorite(site.id); setMenuOpen(false); }}><Star size={14} fill={site.favorite ? 'currentColor' : 'none'}/>{site.favorite ? 'Убрать из избранного' : 'В избранное'}</button>
        <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setSiteEditor(site.id); }}><Pencil size={14}/>Изменить</button>
        <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setSiteEditor(site.id); }}><FolderInput size={14}/>Переместить</button>
        <button type="button" role="menuitem" className={styles.dangerAction} onClick={destroy}><Trash2 size={14}/>Удалить</button>
      </div>}
    </div>
  </article>;
}
