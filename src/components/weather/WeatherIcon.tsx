import { weatherIconKind } from '../../weather/weatherIconKind.ts';
import styles from './WeatherIcon.module.css';

export function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  const kind = weatherIconKind(code);
  return (
    <span className={`${styles.icon} ${styles[kind]} ${className}`} aria-hidden="true">
      {(kind === 'sun' || kind === 'partly') && <i className={styles.sun} />}
      {kind !== 'sun' && <i className={styles.cloud} />}
      {kind === 'fog' && <>
        <i className={`${styles.fogLine} ${styles.fogLine1}`} />
        <i className={`${styles.fogLine} ${styles.fogLine2}`} />
      </>}
      {(kind === 'drizzle' || kind === 'rain') && <>
        <i className={`${styles.drop} ${styles.drop1}`} />
        <i className={`${styles.drop} ${styles.drop2}`} />
        <i className={`${styles.drop} ${styles.drop3}`} />
      </>}
      {kind === 'snow' && <>
        <i className={`${styles.flake} ${styles.flake1}`} />
        <i className={`${styles.flake} ${styles.flake2}`} />
        <i className={`${styles.flake} ${styles.flake3}`} />
      </>}
      {kind === 'thunder' && <i className={styles.bolt} />}
    </span>
  );
}
