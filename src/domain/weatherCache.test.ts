import { beforeEach, describe, expect, it } from 'vitest';
import {
  WEATHER_KEY, WEATHER_TTL_MS, readWeatherCache, weatherCacheAge, weatherPlace, writeWeatherCache,
  type Weather,
} from './weatherCache';
import type { StorageAdapter } from './storage';

function memory(): StorageAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
    key: index => [...data.keys()][index] ?? null,
  };
}

const ready: Weather = {
  temp: '18°', label: 'Переменная облачность', hi: '20°', lo: '11°',
  humidity: '54%', wind: '6 км/ч', ready: true,
  days: [{ key: '2026-09-25', label: 'Сегодня', code: 2, hi: '20°', lo: '11°' }],
};

describe('кэш погоды', () => {
  let store: ReturnType<typeof memory>;
  beforeEach(() => { store = memory(); });

  it('отдаёт свежую запись без запроса', () => {
    writeWeatherCache(ready, 'Москва', 'Цельсий (°C)', 1_000, store);
    expect(readWeatherCache('Москва', 'Цельсий (°C)', 1_000 + 60_000, store)).toEqual(ready);
  });

  it('промахивается, когда запись состарилась', () => {
    writeWeatherCache(ready, 'Москва', 'Цельсий (°C)', 1_000, store);
    // Ровно на границе запись ещё годна, а секундой позже — уже нет.
    expect(readWeatherCache('Москва', 'Цельсий (°C)', 1_000 + WEATHER_TTL_MS, store)).toEqual(ready);
    expect(readWeatherCache('Москва', 'Цельсий (°C)', 1_001 + WEATHER_TTL_MS, store)).toBeNull();
  });

  it('не показывает погоду другого города и других единиц', () => {
    writeWeatherCache(ready, 'Москва', 'Цельсий (°C)', 1_000, store);
    expect(readWeatherCache('Париж', 'Цельсий (°C)', 1_000, store)).toBeNull();
    expect(readWeatherCache('Москва', 'Фаренгейт (°F)', 1_000, store)).toBeNull();
  });

  it('не доверяет записи из будущего: часы могли перевести назад', () => {
    writeWeatherCache(ready, 'Москва', 'Цельсий (°C)', 10_000, store);
    expect(readWeatherCache('Москва', 'Цельсий (°C)', 5_000, store)).toBeNull();
    expect(weatherCacheAge('Москва', 'Цельсий (°C)', 5_000, store)).toBe(WEATHER_TTL_MS);
  });

  it('не кладёт неудавшийся прогноз', () => {
    expect(writeWeatherCache({ ...ready, ready: false, label: 'Погода недоступна' }, 'Москва', 'Ц', 1, store)).toBe(false);
    expect(store.data.has(WEATHER_KEY)).toBe(false);
  });

  it('переживает мусор в хранилище', () => {
    store.data.set(WEATHER_KEY, 'не json');
    expect(readWeatherCache('Москва', 'Цельсий (°C)', 1_000, store)).toBeNull();
    expect(weatherCacheAge('Москва', 'Цельсий (°C)', 1_000, store)).toBe(WEATHER_TTL_MS);
  });

  it('возраст записи считается от её времени', () => {
    writeWeatherCache(ready, 'Москва', 'Цельсий (°C)', 1_000, store);
    expect(weatherCacheAge('Москва', 'Цельсий (°C)', 1_000 + 120_000, store)).toBe(120_000);
    // Старше срока — возраст обрезается сроком, чтобы остаток не стал отрицательным.
    expect(weatherCacheAge('Москва', 'Цельсий (°C)', 1_000 + 10 * WEATHER_TTL_MS, store)).toBe(WEATHER_TTL_MS);
  });

  it('место опознаётся по городу и единицам', () => {
    expect(weatherPlace('Москва', 'Цельсий (°C)')).toBe('Москва|Цельсий (°C)');
  });
});
