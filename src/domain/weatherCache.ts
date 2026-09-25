/**
 * Кэш прогноза погоды между открытиями вкладки.
 *
 * Приложение — страница новой вкладки, и открывают её десятки раз в день.
 * Обновление раз в полчаса задавалось таймером внутри страницы, но каждая
 * вкладка — это новая страница: таймер не успевал ни разу, и запрос уходил
 * при каждом открытии. То есть заявленная частота обновления не соблюдалась,
 * а служба погоды получала десятки запросов вместо двух в час.
 *
 * Кэш решает это и заодно убирает «Загрузка погоды…» с первого кадра: значение
 * уже лежит рядом и показывается сразу.
 *
 * Запись привязана к городу и единицам: сменил их — прежнее значение не годится
 * и кэш промахивается, а не показывает чужую погоду.
 */

import { readStorage, writeStorage, type StorageAdapter } from './storage';

export const WEATHER_KEY = 'nexus-weather';

/** Столько живёт запись. Ровно то время, что стояло в таймере обновления. */
export const WEATHER_TTL_MS = 30 * 60 * 1000;

export type ForecastDay = { key: string; label: string; code: number; hi: string; lo: string };
export type Weather = {
  temp: string; label: string; hi: string; lo: string;
  humidity: string; wind: string; ready: boolean; days: ForecastDay[];
};

type Entry = { place: string; at: number; weather: Weather };

/** Город и единицы в одной строке: по ней запись и опознаётся. */
export const weatherPlace = (city: string, units: string) => `${city}|${units}`;

/**
 * Возвращает прогноз, если он свежий и снят для того же места, иначе null.
 * Запись из будущего тоже не годится: часы могли перевести назад.
 */
export function readWeatherCache(
  city: string, units: string, now: number, storage?: StorageAdapter,
): Weather | null {
  const entry = readStorage<Entry | null>(WEATHER_KEY, null, storage);
  if (!entry || entry.place !== weatherPlace(city, units)) return null;
  if (!entry.weather?.ready) return null;
  const age = now - entry.at;
  if (age < 0 || age > WEATHER_TTL_MS) return null;
  return entry.weather;
}

/** Сколько осталось жить записи. Ноль — пора обновлять. */
export function weatherCacheAge(
  city: string, units: string, now: number, storage?: StorageAdapter,
): number {
  const entry = readStorage<Entry | null>(WEATHER_KEY, null, storage);
  if (!entry || entry.place !== weatherPlace(city, units)) return WEATHER_TTL_MS;
  const age = now - entry.at;
  return age < 0 ? WEATHER_TTL_MS : Math.min(age, WEATHER_TTL_MS);
}

/** Кладёт только удавшийся прогноз: «Погода недоступна» кэшировать нечего. */
export function writeWeatherCache(
  weather: Weather, city: string, units: string, now: number, storage?: StorageAdapter,
): boolean {
  if (!weather.ready) return false;
  return writeStorage<Entry>(WEATHER_KEY, { place: weatherPlace(city, units), at: now, weather }, storage);
}
