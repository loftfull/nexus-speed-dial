import { describe, expect, it } from 'vitest';
import { sortSites } from './sortSites';
import type { SiteRecord } from './types';

const site = (title: string, lastOpened?: number): SiteRecord => ({
  id: title, title, desc: '', domain: `${title}.test`, color: '#111', icon: 'X', category: '', lastOpened,
});

describe('sortSites', () => {
  it('сортирует по названию с учётом русского алфавита', () => {
    const list = [site('Яндекс'), site('Авито'), site('Ёлка'), site('Еда')];
    expect(sortSites(list, 'name').map(s => s.title)).toEqual(['Авито', 'Еда', 'Ёлка', 'Яндекс']);
  });

  it('не путает регистр', () => {
    expect(sortSites([site('вконтакте'), site('Авито')], 'name').map(s => s.title))
      .toEqual(['Авито', 'вконтакте']);
  });

  it('ставит недавно открытые первыми', () => {
    const list = [site('старый', 100), site('свежий', 900), site('средний', 500)];
    expect(sortSites(list, 'recent').map(s => s.title)).toEqual(['свежий', 'средний', 'старый']);
  });

  it('уводит ни разу не открытые в конец, а не в начало', () => {
    const list = [site('никогда'), site('вчера', 100)];
    expect(sortSites(list, 'recent').map(s => s.title)).toEqual(['вчера', 'никогда']);
  });

  it('при равном времени раскладывает по названию, а не как придётся', () => {
    const list = [site('Яндекс', 5), site('Авито', 5)];
    expect(sortSites(list, 'recent').map(s => s.title)).toEqual(['Авито', 'Яндекс']);
  });

  it('«по добавлению» сохраняет порядок хранилища', () => {
    const list = [site('третий'), site('первый'), site('второй')];
    expect(sortSites(list, 'added').map(s => s.title)).toEqual(['третий', 'первый', 'второй']);
  });

  it('не меняет исходный массив', () => {
    const list = [site('Б'), site('А')];
    sortSites(list, 'name');
    expect(list.map(s => s.title)).toEqual(['Б', 'А']);
  });
});
