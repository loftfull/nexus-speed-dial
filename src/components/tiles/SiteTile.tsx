import { MoreVertical, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import type { Site, TilePreset } from '../../domain/types.ts';
import { nextTileState } from '../../domain/tileInteraction.ts';
import type { TileInteractionEvent, TileInteractionState } from '../../domain/tileInteraction.ts';
import { SiteIcon } from './SiteIcon.tsx';
import styles from './SiteTile.module.css';

const categoryLabels: Record<string, string> = {
  social: 'Социальные сети', communication: 'Общение', news: 'Новости', services: 'Сервисы',
  productivity: 'Продуктивность', entertainment: 'Развлечения', tools: 'Инструменты',
  shopping: 'Покупки', finance: 'Финансы', development: 'Разработка',
};

export function SiteTile({ site, mode, selected = false }: { site: Site; mode: TilePreset; selected?: boolean }) {
  const [state, setState] = useState<TileInteractionState>(selected ? 'selected' : 'normal');
  useEffect(() => { if (state === 'normal' || state === 'selected') setState(selected ? 'selected' : 'normal'); }, [selected]);
  const transition = (event: TileInteractionEvent) => setState(current => nextTileState(current, event, selected));
  const enterDropTarget = (event: DragEvent<HTMLElement>) => { event.preventDefault(); transition('drag-enter'); };

  return <article
    className={`${styles.tile} ${styles[mode]} ${selected ? styles.selected : ''}`}
    data-testid="site-tile"
    data-tile-state={state}
    draggable
    onPointerDown={() => transition('pointer-down')}
    onPointerUp={() => transition('pointer-up')}
    onPointerCancel={() => transition('pointer-up')}
    onDragStart={() => transition('drag-start')}
    onDragEnd={() => transition('drag-end')}
    onDragEnter={enterDropTarget}
    onDragOver={(event: DragEvent<HTMLElement>) => event.preventDefault()}
    onDragLeave={() => transition('drag-leave')}
    onDrop={() => transition('drop')}
  >
    <a className={styles.hit} href={site.url} aria-label={site.title} onFocus={() => transition('focus')} onBlur={() => transition('blur')}>
      {site.favorite && <Star className={styles.favorite} size={13} fill="currentColor"/>}
      <SiteIcon site={site}/>
      <span className={styles.title}>{site.title}</span>
      <span className={styles.subtitle}>{site.subtitle}</span>
      <span className={styles.domain}>{site.domain}</span>
      <span className={styles.category}>{site.categoryId ? categoryLabels[site.categoryId] ?? site.categoryId : ''}</span>
      {site.badge && <em className={styles.badge}>{site.badge}</em>}
    </a>
    <button type="button" aria-label={`Меню ${site.title}`} className={styles.menu} onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}><MoreVertical size={15}/></button>
  </article>;
}
