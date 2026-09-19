#!/usr/bin/env node
/**
 * Шкала оформления держится на токенах, а не на числах по месту.
 *
 * Аудит (docs/design-audit.md, §10) насчитал в таблицах стилей девятнадцать
 * кеглей — часть в 0.5 px друг от друга, — пять насыщенностей и девятнадцать
 * значений радиуса. Эта проверка падает, как только в стилях появится
 * значение вне шкалы, поэтому шкала не расползётся заново.
 */
import { readFileSync } from 'node:fs';

const FILES = ['src/app/theme.css', 'src/components/browser-import.css'];
const css = FILES.map(file => readFileSync(file, 'utf8')).join('\n');

const values = property => [...css.matchAll(new RegExp(`${property}:([^;}]+)`, 'g'))].map(m => m[1].trim());
const declared = prefix => new Set([...css.matchAll(new RegExp(`--${prefix}[\\w-]*:`, 'g'))].map(m => m[0].slice(0, -1)));

const FONT_SIZES = new Set([
  'var(--nx-fs-1)', 'var(--nx-fs-2)', 'var(--nx-fs-3)', 'var(--nx-fs-4)',
  'var(--nx-fs-5)', 'var(--nx-fs-6)', 'var(--nx-fs-clock)', 'var(--nx-fs-clock-lg)',
]);
const WEIGHTS = new Set(['400', '600', '700']);
const RADII = new Set([
  'var(--nx-r-xs)', 'var(--nx-r-sm)', 'var(--nx-r-md)', 'var(--nx-r-lg)',
  '0', '50%', '999px',
  // Пользовательские: их задаёт сам пользователь в разделе «Плитки».
  'var(--nx-tile-radius,var(--nx-r-lg))', 'var(--nx-mark-radius,16px)',
  // Те же ступени, записанные по углам.
  'var(--nx-r-lg) var(--nx-r-lg) 0 0',
  'var(--nx-r-lg) var(--nx-r-lg) var(--nx-r-md) var(--nx-r-md)',
  'var(--nx-r-xs) var(--nx-r-xs) 0 0',
]);

const problems = [];
const check = (property, allowed) => {
  for (const value of values(property)) {
    if (!allowed.has(value)) problems.push(`${property}: ${value}`);
  }
};
check('font-size', FONT_SIZES);
check('font-weight', WEIGHTS);
check('border-radius', RADII);

if (declared('nx-fs').size !== 8) problems.push(`ступеней кегля объявлено ${declared('nx-fs').size}, ожидается 8`);
if (declared('nx-r-').size !== 4) problems.push(`ступеней радиуса объявлено ${declared('nx-r-').size}, ожидается 4`);

const scale = ['1', '2', '3', '4', '5', '6'].map(step => Number(css.match(new RegExp(`--nx-fs-${step}:(\\d+(?:\\.\\d+)?)px`))[1]));
if (scale.some((value, index) => index > 0 && value <= scale[index - 1])) problems.push(`ступени кегля не возрастают: ${scale.join(', ')}`);
if (scale.some(value => !Number.isInteger(value))) problems.push(`дробная ступень кегля: ${scale.join(', ')}`);

if (problems.length) {
  console.error('Значения вне шкалы оформления:\n' + problems.map(line => '  ' + line).join('\n'));
  process.exit(1);
}
console.log(`Шкала в порядке: кегли ${scale.join('/')} px, насыщенности 400/600/700, четыре ступени радиуса.`);
