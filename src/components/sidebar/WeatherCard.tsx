import { ChevronDown, ChevronUp, CloudOff, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useWeather } from '../../weather/useWeather.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import { GlassSurface } from '../primitives/GlassSurface.tsx';
import { WeatherIcon } from '../weather/WeatherIcon.tsx';
import styles from './WeatherCard.module.css';

const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function dayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return weekdays[d.getDay()] ?? '';
}

function hourLabel(time: string) {
  return time.slice(11, 16);
}

export function WeatherCard() {
  const weather = useWeather();
  const setWeatherOpen = useAppStore(state => state.setWeatherOpen);
  const [expanded, setExpanded] = useState(false);

  if (weather.status === 'error') {
    return (
      <GlassSurface role="control" className={`${styles.card} ${styles.compact}`}>
        <button type="button" className={styles.row} onClick={() => setWeatherOpen(true)}>
          <span className={styles.icon}><CloudOff size={20} /></span>
          <span className={styles.city}>{weather.label || 'Погода недоступна'}</span>
          <span className={styles.errorHint}>Настроить</span>
        </button>
      </GlassSurface>
    );
  }

  if (weather.status === 'loading' || !weather.data) {
    return (
      <GlassSurface role="control" className={`${styles.card} ${styles.compact}`}>
        <button type="button" className={styles.row} disabled>
          <span className={styles.icon}><WeatherIcon code={2} /></span>
          <span className={styles.temp}>—</span>
          <span className={styles.city}>{weather.label || 'Загрузка…'}</span>
        </button>
      </GlassSurface>
    );
  }

  const { current, hourly, daily } = weather.data;

  return (
    <GlassSurface role="control" className={`${styles.card} ${expanded ? styles.expanded : styles.compact}`}>
      <button
        type="button"
        className={styles.row}
        aria-expanded={expanded}
        aria-label={expanded ? 'Свернуть погоду' : 'Развернуть погоду'}
        onClick={() => setExpanded(v => !v)}
      >
        <span className={styles.icon}><WeatherIcon code={current.code} /></span>
        <span className={styles.temp}>{current.temperature}°</span>
        <span className={styles.city}>{weather.label}</span>
        <span className={styles.condition}>{current.label}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.stats}>
            <div><em>🌡️</em><span>Ощущ. {current.apparent}°</span></div>
            <div><em>💧</em><span>{current.humidity}%</span></div>
            <div><em>💨</em><span>{current.wind} км/ч</span></div>
          </div>

          {hourly.length > 0 && (
            <div className={styles.hourly}>
              {hourly.slice(0, 6).map(h => (
                <span key={h.time} className={styles.hourItem}>
                  <small>{hourLabel(h.time)}</small>
                  <i className={styles.hourIcon}><WeatherIcon code={h.code} /></i>
                  <b>{h.temperature}°</b>
                </span>
              ))}
            </div>
          )}

          {daily.length > 0 && (
            <div className={styles.forecast}>
              {daily.map(day => (
                <div className={styles.day} key={day.date}>
                  <span className={styles.dayName}>{dayLabel(day.date)}</span>
                  <span className={styles.dayIcon}><WeatherIcon code={day.code} /></span>
                  <span className={styles.dayTemp}>
                    <b>{day.max}°</b>
                    <small>{day.min}°</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          <button type="button" className={styles.detailLink} onClick={() => setWeatherOpen(true)}>
            <MapPin size={12} />
            <span>Подробный прогноз</span>
          </button>
        </div>
      )}
    </GlassSurface>
  );
}
