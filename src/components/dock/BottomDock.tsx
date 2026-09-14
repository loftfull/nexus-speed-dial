import { Home, Star, Clock3, Download, StickyNote, Settings2 } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './BottomDock.module.css';

const items = [
  { id: 'home', label: 'Главная', Icon: Home, action: 'home' as const },
  { id: 'favorites', label: 'Избранное', Icon: Star, action: 'favorites' as const },
  { id: 'recent', label: 'История', Icon: Clock3, action: 'recent' as const },
  { id: 'downloads', label: 'Загрузки', Icon: Download, action: 'downloads' as const },
  { id: 'notes', label: 'Заметки', Icon: StickyNote, action: 'notes' as const },
  { id: 'settings', label: 'Настройки', Icon: Settings2, action: 'settings' as const },
];

type DockAction = 'home' | 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings';

export function BottomDock() {
  const contentMode = useAppStore(state => state.contentMode);
  const setContentMode = useAppStore(state => state.setContentMode);
  const setActiveSpace = useAppStore(state => state.setActiveSpace);
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);

  const activate = (action: DockAction) => {
    if (action === 'settings') { setSettingsOpen(true); return; }
    if (action === 'home') {
      setActiveSpace('home');
      setActiveCategory(null);
      setContentMode('all');
      return;
    }
    if (action === 'favorites' || action === 'recent') setContentMode(action);
  };

  const isActive = (action: DockAction) => {
    if (action === 'home') return contentMode === 'all';
    if (action === 'favorites' || action === 'recent') return contentMode === action;
    return false;
  };

  return <nav className={styles.dock} aria-label="Быстрые разделы">
    {items.map(item => (
      <button key={item.id} type="button" aria-label={item.label} className={isActive(item.action) ? styles.active : ''} onClick={() => activate(item.action)}>
        <item.Icon size={19} fill={isActive(item.action) && item.id === 'favorites' ? 'currentColor' : 'none'}/>
        <span>{item.label}</span>
      </button>
    ))}
  </nav>;
}
