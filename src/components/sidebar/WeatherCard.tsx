import { useWeather } from '../../weather/useWeather.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import styles from './WeatherCard.module.css';

const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  return weekdays[d.getDay()] ?? '';
}

export function WeatherCard() {
  const { data, label } = useWeather();
  if (!data) return null;
  const { current, daily } = data;

  return (
    <GlassSurface role="control" className={styles.card}>
      <div className={styles.head}>
        <div className={styles.location}>
          <span className={styles.icon}>{current.icon}</span>
          <div>
            <strong>{current.temperature}°</strong>
            <small>{label}</small>
          </div>
        </div>
        <div className={styles.meta}>
          <span>{current.label}</span>
          <span>Ощущ. {current.apparent}°</span>
        </div>
      </div>
      <div className={styles.stats}>
        <div><em>💧</em><span>{current.humidity}%</span></div>
        <div><em>💨</em><span>{current.wind} км/ч</span></div>
      </div>
      {daily.length > 0 && (
        <div className={styles.forecast}>
          {daily.map(day => (
            <div className={styles.day} key={day.date}>
              <span className={styles.dayName}>{dayLabel(day.date)}</span>
              <span className={styles.dayIcon}>{day.icon}</span>
              <span className={styles.dayTemp}>
                <b>{day.max}°</b>
                <small>{day.min}°</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassSurface>
  );
}
