import { Download, Home, Settings, Star, StickyNote, Clock3 } from 'lucide-react';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { useAppStore } from '../../state/useAppStore.ts';
import type { AppSection } from '../../domain/types.ts';
import styles from './Dock.module.css';
const items:[AppSection,string,typeof Home][]=[['home','Главная',Home],['favorites','Избранное',Star],['recent','Недавние',Clock3],['downloads','Загрузки',Download],['notes','Заметки',StickyNote],['settings','Настройки',Settings]];
export function Dock(){const section=useAppStore(s=>s.section);const setSection=useAppStore(s=>s.setSection);const openSettings=useAppStore(s=>s.setSettingsOpen);return <GlassSurface as="nav" role="dock" className={styles.dock}>{items.map(([id,label,Icon])=><button key={id} title={label} aria-label={label} className={section===id?styles.active:''} onClick={()=>{setSection(id);if(id==='settings')openSettings(true)}}><Icon size={21}/></button>)}</GlassSurface>}
