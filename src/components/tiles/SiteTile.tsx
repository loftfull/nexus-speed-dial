import { MoreVertical, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import type { Site, TilePreset } from '../../domain/types.ts';
import { nextTileState } from '../../domain/tileInteraction.ts';
import type { TileInteractionEvent, TileInteractionState } from '../../domain/tileInteraction.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { SiteIcon } from './SiteIcon.tsx';
import styles from './SiteTile.module.css';

export function SiteTile({ site, mode, selected = false }: { site: Site; mode: TilePreset; selected?: boolean }) {
  const [state, setState] = useState<TileInteractionState>(selected ? 'selected' : 'normal');
  const categories = useAppStore(store => store.categories);
  const setSiteEditor = useAppStore(store => store.setSiteEditor);
  const recordVisit = useAppStore(store => store.recordVisit);
  useEffect(() => { if (state === 'normal' || state === 'selected') setState(selected ? 'selected' : 'normal'); }, [selected]);
  const transition = (event: TileInteractionEvent) => setState(current => nextTileState(current, event, selected));
  const enterDropTarget = (event: DragEvent<HTMLElement>) => { event.preventDefault(); transition('drag-enter'); };
  const label = categories.find(category => category.id === site.categoryId)?.name ?? '';

  return <article className={`${styles.tile} ${styles[mode]} ${selected ? styles.selected : ''}`} data-testid="site-tile" data-tile-state={state} draggable onPointerDown={() => transition('pointer-down')} onPointerUp={() => transition('pointer-up')} onPointerCancel={() => transition('pointer-up')} onDragStart={() => transition('drag-start')} onDragEnd={() => transition('drag-end')} onDragEnter={enterDropTarget} onDragOver={(event: DragEvent<HTMLElement>) => event.preventDefault()} onDragLeave={() => transition('drag-leave')} onDrop={() => transition('drop')}>
    <a className={styles.hit} href={site.url} aria-label={site.title} onClick={() => recordVisit(site.id)} onFocus={() => transition('focus')} onBlur={() => transition('blur')}>
      {site.favorite && <Star className={styles.favorite} size={13} fill="currentColor"/>}
      <SiteIcon site={site}/>
      <span className={styles.labels}>
        <span className={styles.title}>{site.title}</span>
        <span className={styles.subtitle}>{site.subtitle}</span>
        <span className={styles.domain}>{site.domain}</span>
        <span className={styles.category}>{label}</span>
      </span>
      {site.badge && <em className={styles.badge}>{site.badge}</em>}
    </a>
    <button type="button" aria-label={`Меню ${site.title}`} className={styles.menu} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); setSiteEditor(site.id); }}><MoreVertical size={15}/></button>
  </article>;
}
