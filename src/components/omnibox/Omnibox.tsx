import { ArrowLeft, ArrowRight, Search, ShieldCheck, Star } from 'lucide-react';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './Omnibox.module.css';
export function Omnibox(){return <header className={styles.bar}><div className={styles.nav}><GlassSurface as="button" role="control"><ArrowLeft size={18}/></GlassSurface><GlassSurface as="button" role="control"><ArrowRight size={18}/></GlassSurface></div><GlassSurface role="control" className={styles.box}><Search size={18}/><input aria-label="Введите запрос или адрес" placeholder="Введите запрос или адрес"/><div><Star size={18}/><ShieldCheck size={18}/></div></GlassSurface><GlassSurface as="button" role="control" className={styles.profile}>●⌄</GlassSurface></header>}
