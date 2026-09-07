import { Clock3, LayoutGrid, Star } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './WorkspaceHeader.module.css';

const modes = [
  ['all', 'Все', LayoutGrid],
  ['favorites', 'Избранное', Star],
  ['recent', 'Недавние', Clock3],
] as const;

export function WorkspaceHeader() {
  const contentMode = useAppStore(state => state.contentMode);
  const setContentMode = useAppStore(state => state.setContentMode);

  return <div className={styles.head}>
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
  </div>;
}
