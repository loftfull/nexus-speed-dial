import { describe, expect, it } from 'vitest';
import { columnsFromTops, isGridKey, nextGridIndex } from './gridNav';

describe('nextGridIndex', () => {
  // Девять плиток в пять колонок: строки 0–4, 5–8.
  const total = 9;
  const columns = 5;

  it('вправо и влево идут по списку и переходят между строками', () => {
    expect(nextGridIndex('ArrowRight', 0, total, columns)).toBe(1);
    expect(nextGridIndex('ArrowRight', 4, total, columns)).toBe(5);
    expect(nextGridIndex('ArrowLeft', 5, total, columns)).toBe(4);
  });

  it('вниз и вверх шагают ровно на строку', () => {
    expect(nextGridIndex('ArrowDown', 1, total, columns)).toBe(6);
    expect(nextGridIndex('ArrowUp', 6, total, columns)).toBe(1);
  });

  it('вниз в неполную последнюю строку встаёт на последнюю плитку', () => {
    // Девять плиток в четыре колонки: строки 0–3, 4–7 и одна плитка 8.
    expect(nextGridIndex('ArrowDown', 5, total, 4)).toBe(8);
    // А из самой последней строки идти уже некуда.
    expect(nextGridIndex('ArrowDown', 6, total, columns)).toBeNull();
    expect(nextGridIndex('ArrowDown', 8, total, columns)).toBeNull();
  });

  it('за края списка фокус не уходит', () => {
    expect(nextGridIndex('ArrowLeft', 0, total, columns)).toBeNull();
    expect(nextGridIndex('ArrowUp', 2, total, columns)).toBeNull();
    expect(nextGridIndex('ArrowRight', 8, total, columns)).toBeNull();
  });

  it('Home и End прыгают к краям', () => {
    expect(nextGridIndex('Home', 7, total, columns)).toBe(0);
    expect(nextGridIndex('End', 2, total, columns)).toBe(8);
    expect(nextGridIndex('Home', 0, total, columns)).toBeNull();
  });

  it('чужие клавиши и пустая сетка не двигают ничего', () => {
    expect(nextGridIndex('Enter', 0, total, columns)).toBeNull();
    expect(nextGridIndex('a', 0, total, columns)).toBeNull();
    expect(nextGridIndex('ArrowRight', 0, 0, columns)).toBeNull();
  });

  it('одна колонка превращает вверх-вниз в шаг по списку', () => {
    expect(nextGridIndex('ArrowDown', 0, total, 1)).toBe(1);
    expect(nextGridIndex('ArrowUp', 1, total, 1)).toBe(0);
  });

  it('бессмысленное число колонок не ломает шаг', () => {
    expect(nextGridIndex('ArrowDown', 0, total, 0)).toBe(1);
    expect(nextGridIndex('ArrowDown', 0, total, Number.NaN)).toBe(1);
  });

  it('выход за границы текущего индекса приводится к списку', () => {
    expect(nextGridIndex('ArrowRight', 99, total, columns)).toBeNull();
    expect(nextGridIndex('ArrowLeft', 99, total, columns)).toBe(7);
    expect(nextGridIndex('ArrowRight', -5, total, columns)).toBe(1);
  });
});

describe('columnsFromTops', () => {
  it('считает колонки по верхним краям плиток', () => {
    expect(columnsFromTops([130, 130, 130, 130, 130, 300, 300, 300, 300])).toBe(5);
    expect(columnsFromTops([130, 200, 270])).toBe(1);
    expect(columnsFromTops([])).toBe(1);
  });

  it('дробные координаты не дробят строку', () => {
    expect(columnsFromTops([130.2, 129.8, 130.4, 300.1])).toBe(3);
  });
});

describe('isGridKey', () => {
  it('отделяет клавиши сетки от остальных', () => {
    expect(isGridKey('ArrowUp')).toBe(true);
    expect(isGridKey('End')).toBe(true);
    expect(isGridKey('Tab')).toBe(false);
  });
});
