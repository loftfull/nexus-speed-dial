import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Шкала держится на токенах, а не на числах по месту: аудит насчитал в
 * таблице стилей девятнадцать кеглей (часть — в 0.5 px друг от друга),
 * пять насыщенностей и девятнадцать значений радиуса. Тест падает, как
 * только в стилях появится значение вне шкалы.
 */
const FILES = ['src/app/theme.css', 'src/components/browser-import.css'];
const css = FILES.map(file => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n');

const values = (property: string) =>
  [...css.matchAll(new RegExp(`${property}:([^;}]+)`, 'g'))].map(match => match[1].trim());

const declaredTokens = (prefix: string) =>
  [...css.matchAll(new RegExp(`--${prefix}[\\w-]*:`, 'g'))].map(match => match[0].slice(0, -1));

describe('шкала оформления', () => {
  it('кегли берутся только из шести ступеней и двух размеров часов', () => {
    const literals = values('font-size').filter(value => !value.startsWith('var('));
    expect(literals).toEqual([]);

    const used = new Set(values('font-size').filter(value => value.startsWith('var(')));
    const allowed = new Set([
      'var(--nx-fs-1)', 'var(--nx-fs-2)', 'var(--nx-fs-3)', 'var(--nx-fs-4)',
      'var(--nx-fs-5)', 'var(--nx-fs-6)', 'var(--nx-fs-clock)', 'var(--nx-fs-clock-lg)',
    ]);
    expect([...used].filter(value => !allowed.has(value))).toEqual([]);
  });

  it('объявлено ровно восемь ступеней кегля', () => {
    expect(new Set(declaredTokens('nx-fs')).size).toBe(8);
  });

  it('насыщенностей три: обычная, полужирная и жирная', () => {
    expect([...new Set(values('font-weight'))].sort()).toEqual(['400', '600', '700']);
  });

  it('радиусы — четыре ступени плюс формы и пользовательские переменные', () => {
    const allowed = new Set([
      'var(--nx-r-xs)', 'var(--nx-r-sm)', 'var(--nx-r-md)', 'var(--nx-r-lg)',
      '0', '50%', '999px',
      'var(--nx-tile-radius,var(--nx-r-lg))', 'var(--nx-mark-radius,16px)',
      // Скруглённые только сверху формы: та же шкала, записанная по углам.
      'var(--nx-r-lg) var(--nx-r-lg) 0 0',
      'var(--nx-r-lg) var(--nx-r-lg) var(--nx-r-md) var(--nx-r-md)',
      'var(--nx-r-xs) var(--nx-r-xs) 0 0',
    ]);
    expect(values('border-radius').filter(value => !allowed.has(value))).toEqual([]);
  });

  it('объявлено ровно четыре ступени радиуса', () => {
    expect(new Set(declaredTokens('nx-r-')).size).toBe(4);
  });

  it('ступени идут по возрастанию и без дробей', () => {
    const scale = ['1', '2', '3', '4', '5', '6']
      .map(step => css.match(new RegExp(`--nx-fs-${step}:(\\d+(?:\\.\\d+)?)px`))![1])
      .map(Number);
    expect(scale).toEqual([...scale].sort((a, b) => a - b));
    expect(scale.every(Number.isInteger)).toBe(true);
    expect(new Set(scale).size).toBe(scale.length);
  });
});
