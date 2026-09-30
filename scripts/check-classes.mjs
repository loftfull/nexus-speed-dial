#!/usr/bin/env node
/**
 * Каждый класс в разметке должен что-то означать в стилях.
 *
 * Проверка заведена по следу настоящей поломки. Раздел «Заметки» был написан
 * на классах `notes-workspace`, `note-card`, `note-card-head`, `note-mini-icon`
 * и `empty`, и ни один из них не имел правила ни в `theme.css`, ни в
 * `browser-import.css`. Браузер рисовал раздел своими умолчаниями: подписи
 * пустого состояния слипались в строку, карточек не было вовсе. Никакая
 * проверка этого не ловила — юнит-тесты смотрят разметку, снимки сверяются с
 * эталоном, а эталон был снят с той же неоформленной страницы.
 *
 * Считаются только целые литералы из `className`. Склейки вроде
 * `'nx-tile-' + mode` дают обрывок на дефисе — такие отбрасываются, потому
 * что проверять в них нечего.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CSS_FILES = ['src/app/theme.css', 'src/components/browser-import.css'];
const ROOT = 'src';

/**
 * Классы-метки: в разметке стоят, правила не имеют и иметь не должны.
 * Каждая запись объясняет, почему это не забытое оформление.
 */
const MARKERS = new Map([
  ['nx-tile-standard', 'обычная плитка — умолчание модели, своих правил у неё нет'],
  ['active', 'состояние читается родителем: .mobile-sections-card>button.active'],
]);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

const css = CSS_FILES.map(file => readFileSync(file, 'utf8')).join('\n');
const styled = name => new RegExp(`[.\\s,>+~]${name.replace(/[-]/g, '\\-')}(?![\\w-])`).test(css);

const used = new Map();
for (const file of walk(ROOT)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{[^}]*?'([^']*)')/g)) {
    for (const chunk of [match[1], match[2]]) {
      if (!chunk) continue;
      for (const name of chunk.split(/\s+/)) {
        // Обрывок склейки: проверять в нём нечего.
        if (!name || name.endsWith('-')) continue;
        if (!used.has(name)) used.set(name, file);
      }
    }
  }
}

const orphans = [...used].filter(([name]) => !MARKERS.has(name) && !styled(name));
if (orphans.length) {
  console.error('Классы в разметке, у которых нет ни одного правила в стилях:\n'
    + orphans.map(([name, file]) => `  ${name} — ${file}`).join('\n')
    + '\n\nЛибо опишите их в стилях, либо уберите из разметки. Если класс — метка\n'
    + 'для родительского правила, внесите его в MARKERS с объяснением.');
  process.exit(1);
}
console.log(`Оформление на месте: ${used.size} классов в разметке, у каждого есть правило (меток: ${MARKERS.size}).`);
