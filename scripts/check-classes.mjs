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
 * Считаются целые литералы из `className` — в кавычках, в фигурных скобках и
 * в шаблонных строках. Шаблонные строки читаются по постоянной части: в
 * `` `browser-status ${connection}` `` проверяется `browser-status`, а
 * подставляемое состояние остаётся на совести вызывающего кода. Пока
 * разборщик их не видел, два имени обходили проверку стороной.
 *
 * Склейки вроде `'nx-tile-' + mode` дают обрывок на дефисе — такие
 * отбрасываются, потому что проверять в них нечего.
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

/**
 * Состояния пишутся без пространства имён — это модификаторы, а не блоки:
 * `.nx-link.on`, `.nx-cell.off`, `.nx-tile.picked`. Имя состояния короткое и
 * общее для всего приложения, поэтому список закрытый.
 */
const STATES = new Set([
  'on', 'off', 'active', 'picked', 'open', 'ready',
  // `primary` и `danger` — пара вариантов главной кнопки диалога; они живут
  // рядом в одном правиле и названы одинаково во всех окнах.
  'primary', 'danger',
  'error', 'success', 'missing', 'checking', 'connected', 'unsupported',
]);

/**
 * Долг: блоки, которые пока живут вне пространства `nx-`.
 *
 * Список заведён как храповик — он может только убывать. Новое имя вне `nx-`
 * проверка не пропустит, а каждое вычеркнутое отсюда уменьшает долг. Пока он
 * не пуст, утверждать «всё оформление в пространстве nx-» нельзя, и в
 * docs/design-system.md это записано именно так.
 *
 * `browser-*` стоит особняком: у панели импорта свой лист стилей
 * `src/components/browser-import.css`, и переезд имеет смысл только вместе с
 * ним.
 */
const OUTSIDE_NAMESPACE = new Set([
  // src/components/BrowserImportPanel.tsx — свой лист стилей
  'browser-extension-actions', 'browser-extension-row', 'browser-import-apply',
  'browser-import-card', 'browser-import-destination', 'browser-import-head',
  'browser-import-message', 'browser-import-metadata', 'browser-import-summary',
  'browser-manual-import', 'browser-model-note', 'browser-option',
  'browser-preview-head', 'browser-project-fields', 'browser-session-name',
  'browser-status', 'browser-tab-copy', 'browser-tab-icon', 'browser-tab-row',
  'browser-tabs-list', 'browser-tabs-preview', 'save',
  // прочее
  'add', 'brand', 'outline',
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
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`|\{[^}]*?'([^']*)')/g)) {
    for (const chunk of [match[1], match[2]?.replace(/\$\{[^}]*\}/g, ' '), match[3]]) {
      if (!chunk) continue;
      for (const name of chunk.split(/\s+/)) {
        // Обрывок склейки: проверять в нём нечего.
        if (!name || name.endsWith('-')) continue;
        if (!used.has(name)) used.set(name, file);
      }
    }
  }
}

const problems = [];

const orphans = [...used].filter(([name]) => !MARKERS.has(name) && !styled(name));
if (orphans.length) {
  problems.push('Классы в разметке, у которых нет ни одного правила в стилях:\n'
    + orphans.map(([name, file]) => `  ${name} — ${file}`).join('\n')
    + '\n\nЛибо опишите их в стилях, либо уберите из разметки. Если класс — метка\n'
    + 'для родительского правила, внесите его в MARKERS с объяснением.');
}

const outside = [...used].filter(([name]) =>
  !name.startsWith('nx-') && !STATES.has(name) && !OUTSIDE_NAMESPACE.has(name));
if (outside.length) {
  problems.push('Новые классы вне пространства имён `nx-`:\n'
    + outside.map(([name, file]) => `  ${name} — ${file}`).join('\n')
    + '\n\nБлоки и элементы называются `nx-*`; без префикса пишутся только\n'
    + 'состояния из STATES. Список OUTSIDE_NAMESPACE — долг, он может только\n'
    + 'убывать, пополнять его нельзя.');
}

// Храповик затягивается: имя, уже переехавшее в `nx-`, не должно оставаться
// в списке долга и молча разрешать возврат.
const stale = [...OUTSIDE_NAMESPACE].filter(name => !used.has(name));
if (stale.length) {
  problems.push('Долг в OUTSIDE_NAMESPACE указывает на имена, которых в разметке\n'
    + `больше нет: ${stale.join(', ')}.\nВычеркните их из списка.`);
}

if (problems.length) {
  console.error(problems.join('\n\n'));
  process.exit(1);
}
const debt = [...used].filter(([name]) => OUTSIDE_NAMESPACE.has(name)).length;
console.log(`Оформление на месте: ${used.size} классов в разметке, у каждого есть правило`
  + ` (меток: ${MARKERS.size}, вне пространства nx-: ${debt}).`);
