/**
 * Раскладывает гарнитуры Inter и Manrope рядом с приложением.
 *
 * Раньше они грузились со шрифтового сервиса Google. Это значило, что каждое
 * открытие новой вкладки сообщало чужому серверу адрес и браузер пользователя —
 * ровно то, от чего в этом проекте уже ушли фирменные знаки сайтов. Заодно
 * внешний лист стилей блокировал первую отрисовку и делал вид приложения
 * зависимым от доступности сети: в песочнице без доступа к сервису страница
 * рисовалась другой гарнитурой, и снимки экрана расходились с эталонами.
 *
 * На выходе два артефакта:
 *   src/assets/fonts/*.woff2 — сами файлы, их хеширует и раздаёт сборщик;
 *   src/app/fonts.css        — объявления @font-face с unicode-range.
 *
 * unicode-range нужен, чтобы браузер забирал только те наборы знаков, которые
 * встретились на странице: русскому интерфейсу не нужна латиница с
 * диакритикой, пока на плитке не появится такое название.
 *
 * Гарнитуры распространяются по SIL Open Font License 1.1, лицензия кладётся
 * рядом с файлами.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FAMILIES = [
  { id: 'inter', name: 'Inter' },
  { id: 'manrope', name: 'Manrope' },
];
const WEIGHTS = [400, 600, 700];
const SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];

const FILES = path.resolve('src/assets/fonts');
const SHEET = path.resolve('src/app/fonts.css');

/** Достаёт unicode-range каждого набора из готового листа @fontsource. */
async function readRanges(id, weight) {
  const source = await readFile(path.resolve(`node_modules/@fontsource/${id}/${weight}.css`), 'utf8');
  const ranges = new Map();
  for (const block of source.split('@font-face')) {
    const file = block.match(/files\/([\w-]+)-normal\.woff2/);
    const range = block.match(/unicode-range:\s*([^;]+);/);
    if (!file || !range) continue;
    const subset = file[1].replace(new RegExp(`^${id}-`), '').replace(/-\d+$/, '');
    ranges.set(subset, range[1].trim());
  }
  return ranges;
}

await rm(FILES, { recursive: true, force: true });
await mkdir(FILES, { recursive: true });

const blocks = [
  '/* Файл собран скриптом scripts/build-fonts.mjs. Править его нет смысла:',
  '   следующая сборка перезапишет. Гарнитуры — SIL Open Font License 1.1,',
  '   лицензии лежат рядом с файлами в src/assets/fonts. */',
  '',
];
let copied = 0;

for (const family of FAMILIES) {
  const root = path.resolve(`node_modules/@fontsource/${family.id}`);
  await copyFile(path.join(root, 'LICENSE'), path.join(FILES, `${family.id}-LICENSE.txt`));

  for (const weight of WEIGHTS) {
    const ranges = await readRanges(family.id, weight);
    for (const subset of SUBSETS) {
      const range = ranges.get(subset);
      if (!range) throw new Error(`${family.id} ${weight}: нет набора ${subset}`);
      const name = `${family.id}-${subset}-${weight}-normal.woff2`;
      await copyFile(path.join(root, 'files', name), path.join(FILES, name));
      copied += 1;
      blocks.push(
        '@font-face{',
        `  font-family:'${family.name}';`,
        '  font-style:normal;',
        `  font-weight:${weight};`,
        // swap: текст виден сразу системной гарнитурой и переставляется, когда
        // приедет своя. Блокировать отрисовку ради начертания — плохая сделка.
        '  font-display:swap;',
        `  src:url("../assets/fonts/${name}") format("woff2");`,
        `  unicode-range:${range};`,
        '}',
        '',
      );
    }
  }
}

await writeFile(SHEET, blocks.join('\n'), 'utf8');
console.log(`Гарнитуры: ${copied} файла, ${FAMILIES.length} лицензии, лист ${path.relative(process.cwd(), SHEET)}`);
