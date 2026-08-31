import { SiteTile } from '../tiles/SiteTile.tsx';
import { seedSites } from '../../data/seed.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './TilePreview.module.css';
export function TilePreview(){const preset=useAppStore(s=>s.tileSettings.preset);const site=seedSites[0];return <section className={styles.preview}><div><SiteTile site={site} mode={preset}/><small>Обычно</small></div><div className={styles.forceHover}><SiteTile site={site} mode={preset}/><small>Наведение</small></div><div className={styles.forcePressed}><SiteTile site={site} mode={preset}/><small>Нажатие</small></div><div><SiteTile site={site} mode={preset} selected/><small>Выбрано</small></div></section>}
