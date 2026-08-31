import { Clock3, Download, Home, Settings, Star, StickyNote } from 'lucide-react';
import type { AppSection } from '../../domain/types.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './Dock.module.css';

const items: [AppSection, string, typeof Home][] = [
  ['home', 'Главная', Home],
  ['favorites', 'Избранное', Star],
  ['recent', 'Недавние', Clock3],
  ['downloads', 'Загрузки', Download],
  ['notes', 'Заметки', StickyNote],
  ['settings', 'Настройки', Settings],
];

export function Dock() {
  const section = useAppStore(state => state.section);
  const setSection = useAppStore(state => state.setSection);
  return <GlassSurface as="nav" role="dock" className={styles.dock} data-testid="dock">{items.map(([id, label, Icon]) => <button key={id} title={label} aria-label={label} className={section === id ? styles.active : ''} onClick={() => setSection(id)}><Icon size={21}/></button>)}</GlassSurface>;
}
