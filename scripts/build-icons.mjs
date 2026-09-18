/**
 * Собирает модуль иконок интерфейса из @phosphor-icons/core.
 *
 * Готовый пакет @phosphor-icons/react тянет все шесть начертаний каждого знака
 * и прибавлял к сборке около 47 КБ в gzip. Приложению нужны два: объёмное
 * duotone для крупных элементов и ровное regular для мелких служебных пометок.
 * Скрипт берёт только их и только для тех знаков, которые действительно
 * используются, — список в scripts/icon-map.json.
 *
 * Результат коммитится: так сборка, тесты и редактор не зависят от порядка
 * запуска шагов. Перегенерировать: npm run icons
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('node_modules/@phosphor-icons/core/assets');
const WEIGHTS = ['duotone', 'regular'];
/**
 * Отдельные знаки нужны ещё и залитыми: звезда избранного читается только так.
 * Начертание добавляется точечно, чтобы не тащить его для всех 86 знаков.
 */
const EXTRA_WEIGHTS = { Star: ['fill'] };

const kebab = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Достаёт содержимое <svg>…</svg>: сам тег мы рисуем сами. */
function innerSvg(source) {
  const open = source.indexOf('>', source.indexOf('<svg'));
  const close = source.lastIndexOf('</svg>');
  return source.slice(open + 1, close).trim()
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/fill="currentColor"/g, '')
    .replace(/(\s)([a-z-]+)=/g, (all, space, attribute) =>
      space + attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + '=');
}

async function main() {
  const map = JSON.parse(await readFile('scripts/icon-map.json', 'utf8'));
  const targets = [...new Set(Object.values(map))].sort();

  const bodies = new Map();
  for (const name of targets) {
    const file = kebab(name);
    const weights = {};
    for (const weight of [...WEIGHTS, ...(EXTRA_WEIGHTS[name] ?? [])]) {
      const suffix = weight === 'regular' ? '' : `-${weight}`;
      weights[weight] = innerSvg(await readFile(path.join(ROOT, weight, `${file}${suffix}.svg`), 'utf8'));
    }
    bodies.set(name, weights);
  }

  const lines = [];
  lines.push(`/* Файл собран скриптом scripts/build-icons.mjs. Правки вносите в скрипт.`);
  lines.push(` * Источник знаков: @phosphor-icons/core (MIT), начертания ${WEIGHTS.join(' и ')}.`);
  lines.push(` */`);
  lines.push(`import type { SVGProps } from 'react';`);
  lines.push('');
  const allWeights = [...new Set([...WEIGHTS, ...Object.values(EXTRA_WEIGHTS).flat()])];
  lines.push(`export type IconWeight = ${allWeights.map(weight => `'${weight}'`).join(' | ')};`);
  lines.push(`export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string; weight?: IconWeight };`);
  lines.push('');
  lines.push(`/**`);
  lines.push(` * По умолчанию ровное начертание: объёмное duotone на 14-18 пикселях`);
  lines.push(` * размывается — светлая подложка съедает контраст. Объёмное включается`);
  lines.push(` * точечно, у крупных знаков, через weight="duotone".`);
  lines.push(` */`);
  lines.push(`const DEFAULT_WEIGHT: IconWeight = 'regular';`);
  lines.push('');
  lines.push(`function make(shapes: Partial<Record<IconWeight, string>>, name: string) {`);
  lines.push(`  const Icon = ({ size = 16, weight, ...rest }: IconProps) => (`);
  lines.push(`    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size}`);
  lines.push(`      fill="currentColor" role="img" aria-hidden="true" focusable="false" {...rest}`);
  lines.push(`      dangerouslySetInnerHTML={{ __html: shapes[weight ?? DEFAULT_WEIGHT] ?? shapes.regular! }} />`);
  lines.push(`  );`);
  lines.push(`  Icon.displayName = name;`);
  lines.push(`  return Icon;`);
  lines.push(`}`);
  lines.push('');

  for (const name of targets) {
    const weights = bodies.get(name);
    const parts = Object.keys(weights).map(weight => `${weight}: ${JSON.stringify(weights[weight])}`).join(', ');
    lines.push(`const ${name} = make({ ${parts} }, '${name}');`);
  }
  lines.push('');
  for (const [alias, target] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(alias === target ? `export { ${target} };` : `export const ${alias} = ${target};`);
  }

  const text = lines.join('\n') + '\n';
  await writeFile('src/app/icons.generated.tsx', text);
  console.log(`Иконки: ${targets.length} знаков × ${WEIGHTS.length} начертания, ${(text.length / 1024).toFixed(0)} КБ исходника`);
}

main();
