import { describe, expect, it } from 'vitest';
import { dayPart, greetingLine, greetingSubtitle } from './greeting';

describe('greeting', () => {
  it('разбивает сутки по границам русского языка', () => {
    expect(dayPart(5)).toBe('morning');
    expect(dayPart(11)).toBe('morning');
    expect(dayPart(12)).toBe('day');
    expect(dayPart(17)).toBe('day');
    expect(dayPart(18)).toBe('evening');
    expect(dayPart(22)).toBe('evening');
    expect(dayPart(23)).toBe('night');
    expect(dayPart(4)).toBe('night');
  });

  it('тянет ночь через полночь, а не обрывает её', () => {
    expect(dayPart(0)).toBe('night');
    expect(dayPart(3)).toBe('night');
  });

  it('обращается по имени, когда оно задано', () => {
    expect(greetingLine(9, 'Владимир')).toBe('Доброе утро, Владимир!');
    expect(greetingLine(20, '  Анна  ')).toBe('Добрый вечер, Анна!');
  });

  it('не оставляет пустое обращение без имени', () => {
    expect(greetingLine(9)).toBe('Доброе утро!');
    expect(greetingLine(9, '   ')).toBe('Доброе утро!');
  });

  it('переживает час за пределами суток', () => {
    expect(dayPart(24)).toBe('night');
    expect(dayPart(-1)).toBe('night');
    expect(dayPart(30)).toBe('morning');
  });

  it('даёт подпись под каждую часть суток', () => {
    const parts = [3, 9, 14, 20];
    const lines = parts.map(greetingSubtitle);
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) expect(line.length).toBeGreaterThan(10);
  });
});
