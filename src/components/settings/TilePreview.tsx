import { SiteTile } from '../tiles/SiteTile.tsx';
import { seedSites } from '../../data/seed.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './TilePreview.module.css';

export function TilePreview() {
  const preset = useAppStore(state => state.tileSettings.preset);
  const site = seedSites[0];
  return <section className={styles.preview}>
    <div><span className={styles.stage}><SiteTile site={site} mode={preset}/></span><small>Обычно</small></div>
    <div className={styles.forceHover}><span className={styles.stage}><SiteTile site={site} mode={preset}/></span><small>Наведение</small></div>
    <div className={styles.forcePressed}><span className={styles.stage}><SiteTile site={site} mode={preset}/></span><small>Нажатие</small></div>
    <div><span className={styles.stage}><SiteTile site={site} mode={preset} selected/></span><small>Выбрано</small></div>
  </section>;
}
