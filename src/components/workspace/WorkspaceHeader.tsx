import { Clock3, LayoutGrid, Star } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './WorkspaceHeader.module.css';

const modes = [
  ['all', 'Все', LayoutGrid],
  ['favorites', 'Избранное', Star],
  ['recent', 'Недавние', Clock3],
] as const;

const sizes = ['S', 'M', 'L', 'XL'] as const;

export function WorkspaceHeader() {
  const contentMode = useAppStore(state => state.contentMode);
  const setContentMode = useAppStore(state => state.setContentMode);
  const spaces = useAppStore(state => state.spaces);
  const activeSpaceId = useAppStore(state => state.activeSpaceId);
  const tileSettings = useAppStore(state => state.tileSettings);
  const setTileSetting = useAppStore(state => state.setTileSetting);

  const activeSpace = spaces.find(space => space.id === activeSpaceId);

  return <div className={styles.head}>
    <h1 className={styles.title}>{activeSpace?.name ?? 'Пространство'}</h1>
    <nav className={styles.modes} aria-label="Режим сайтов">
      {modes.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-current={contentMode === id ? 'page' : undefined}
          className={contentMode === id ? styles.active : ''}
          onClick={() => setContentMode(id)}
        >
          <Icon size={15}/>
          <span>{label}</span>
        </button>
      ))}
    </nav>
    <div className={styles.sizes} aria-label="Размер плиток">
      {sizes.map(size => (
        <button
          key={size}
          type="button"
          aria-pressed={tileSettings.size === size}
          className={tileSettings.size === size ? styles.sizeActive : ''}
          onClick={() => setTileSetting('size', size)}
        >
          {size}
        </button>
      ))}
    </div>
  </div>;
}
