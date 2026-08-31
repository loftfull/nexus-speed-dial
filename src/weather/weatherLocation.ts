export type WeatherLocation = { mode:'city'; city:string } | { mode:'coords'; latitude:number; longitude:number; label:string };
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = { mode:'city', city:'Москва' };
export function normalizeWeatherLocation(value:unknown):WeatherLocation{
  if(!value||typeof value!=='object')return DEFAULT_WEATHER_LOCATION;
  const item=value as Record<string,unknown>;
  if(item.mode==='city'&&typeof item.city==='string'&&item.city.trim())return{mode:'city',city:item.city.trim()};
  if(item.mode==='coords'&&typeof item.latitude==='number'&&typeof item.longitude==='number'&&Number.isFinite(item.latitude)&&Number.isFinite(item.longitude)&&Math.abs(item.latitude)<=90&&Math.abs(item.longitude)<=180)return{mode:'coords',latitude:item.latitude,longitude:item.longitude,label:typeof item.label==='string'&&item.label.trim()?item.label.trim():'Текущее местоположение'};
  return DEFAULT_WEATHER_LOCATION;
}
export function weatherLocationKey(location:WeatherLocation){return location.mode==='city'?`city:${location.city.trim().toLocaleLowerCase('ru-RU')}`:`coords:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`}
