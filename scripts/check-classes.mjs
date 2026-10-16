#!/usr/bin/env node
/**
 * Каждый класс в разметке должен что-то означать в стилях.
 *
 * Проверка заведена по следу настоящей поломки. Раздел «Заметки» был написан
 * на классах `notes-workspace`, `note-card`, `note-card-head`, `note-mini-icon`
 * и `empty`, и ни один из них не имел правила ни в `theme.css`, ни в
 * `browser-import.css` — отдельном листе панели импорта, который с тех пор
 * переехал в `theme.css`. Браузер рисовал раздел своими умолчаниями: подписи
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

const CSS_FILES = ['src/app/theme.css'];
const ROOT = 'src';

/**
 * Классы-метки: в разметке стоят, правила не имеют и иметь не должны.
 * Каждая запись объясняет, почему это не забытое оформление.
 */
const MARKERS = new Map([
  ['nx-tile-standard', 'обычная плитка — умолчание модели, своих правил у неё нет'],
  ['active', 'состояние читается родителем: .nx-mobile-sections-card>button.active'],
  ['filled', 'правил у него нет и не нужно: это отметка «картинка знака отрисована», '
    + 'её читает перепись марок в e2e/visual.spec.ts, чтобы не снять эталон с монограммами'],
]);

/**
 * Проверки, после которых классу не обязательно существовать: спека называет
 * имя ровно затем, чтобы доказать его отсутствие. Так написаны, например,
 * «над сеткой не осталось органов выбора вида» (`.nx-seg` → `toHaveCount(0)`)
 * и «мобильная оболочка прячет панель» (`.nx-rail` → `toBeHidden()`).
 *
 * Список закрытый и короткий намеренно: его задача — отличить доказательство
 * отсутствия от забытого после переименования селектора, а не перечислить все
 * способы что-то утверждать.
 */
const ABSENCE_CHECKS = [/toHaveCount\(\s*0\s*\)/, /toBeHidden\(/, /\.not\./];

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
  // Эти десять проверка раньше не видела: они доходят до разметки склейкой
  // или массивом, а разборщик читал только первый литерал в `className`.
  // В долг они не записаны намеренно — это именно модификаторы, а не блоки:
  // в стилях каждое встречается только видом `.nx-блок.имя` (`.nx-root.compact`,
  // `.nx-panel.collapsed`, `.nx-tile.menu-open`, `.nx-head.bare`,
  // `.nx-dock.drop`) и ни одно — самостоятельным классом.
  'panel-collapsed', 'compact', 'still', 'swapping', 'collapsed',
  'menu-open', 'is-hover', 'is-press', 'bare', 'drop',
  // `brand` и `add` лежали в долге, хотя по тому же признаку это состояния:
  // `.nx-mark.brand`, `.nx-dock-mark.brand`, `.nx-project-card.add`,
  // `.nx-strip-card.add` — и ни одного самостоятельного правила. Долг от
  // этого убывает, а не растёт: `outline` и `save` остаются в нём, потому что
  // они как раз самостоятельные блоки.
  'brand', 'add',
  // `filled` правил не имеет вовсе — это отметка для переписи марок, см. MARKERS.
  'filled',
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
  'outline',
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

/**
 * Выражение в фигурных скобках читается по балансу скобок, а не регулярным
 * выражением.
 *
 * Прежний разборщик брал из `className={...}` первую строку в кавычках и на
 * этом останавливался, а класс доходит до разметки и склейкой. В
 * `className={'nx-panel' + (panelOpen ? '' : ' collapsed')}` он видел
 * `nx-panel` и терял ` collapsed`. Так мимо проверки прошли десять имён вне
 * пространства `nx-`: `collapsed`, `menu-open`, `is-hover`, `is-press`,
 * `bare`, `drop` — склейкой, и `panel-collapsed`, `compact`, `still`,
 * `swapping` — массивом `rootClass`. У каждого есть правила в стилях, и
 * обещание «новое имя вне `nx-` не пройдёт вовсе» для них не работало.
 */
function expression(source, start) {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return '';
}

/**
 * Все строковые литералы выражения: и в кавычках, и шаблонные.
 *
 * Кроме тех, с которыми сравнивают. В `className={'nx-cell nx-cell-pick' +
 * ((ui.mobileMode ?? 'table') === value ? ' on' : '')}` литерал `table` — это
 * значение по умолчанию, а не класс; так же читались `hover` и `press` из
 * `state === 'hover'`. Поэтому операнды сравнений и `??` вычёркиваются до
 * разбора, иначе проверка требует правил для значений.
 */
function literals(code) {
  const classes = code.replace(/(?:===|!==|==|!=|\?\?)\s*(['"`])(?:\\.|(?!\1)[^\\])*\1/g, ' ');
  const found = [];
  for (const match of classes.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
    found.push((match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
  }
  return found;
}

const used = new Map();
for (const file of walk(ROOT)) {
  const source = readFileSync(file, 'utf8');
  const chunks = [];

  for (const match of source.matchAll(/className=(?:"([^"]*)"|')/g)) {
    if (match[1] !== undefined) chunks.push(match[1]);
  }
  for (const match of source.matchAll(/className=\{/g)) {
    const code = expression(source, match.index + 'className='.length);
    chunks.push(...literals(code));
    // `className={rootClass}` — имя переменной: читаем литералы её объявления.
    const variable = code.trim().match(/^([A-Za-z_$][\w$]*)$/);
    if (!variable) continue;
    const declaration = source.match(
      new RegExp(`(?:const|let|var)\\s+${variable[1]}\\s*=([\\s\\S]*?);\\n`));
    if (declaration) chunks.push(...literals(declaration[1]));
  }

  for (const chunk of chunks) {
    if (!chunk) continue;
    for (const name of chunk.split(/\s+/)) {
      // Обрывок склейки: проверять в нём нечего.
      if (!name || name.endsWith('-')) continue;
      if (!used.has(name)) used.set(name, file);
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

/**
 * Третья проверка: класс, по которому ищет спека, должен существовать в
 * разметке.
 *
 * Заведена по следу настоящей поломки. `ac2f55d` переименовал в компоненте
 * `mobile-sections-card` в `nx-mobile-sections-card`, но четыре селектора в
 * `e2e/app-shell.spec.ts` остались на старом имени — в том числе общий
 * помощник перехода по разделам. Шесть мобильных тестов упали по таймауту
 * ожидания несуществующего узла. Ни шкала, ни эта проверка, ни юнит-тесты,
 * ни сборка этого не видели: переименование согласовано между разметкой и
 * стилями, а спеки живут отдельно. Красноту показала только браузерная
 * полоса CI — то есть самая долгая из всех.
 *
 * Разбираются постоянные части селекторов: строки в кавычках и шаблонные
 * строки, отданные `locator`, `querySelector` и `querySelectorAll`.
 *
 * Сверяется имя не со строгим списком `used` выше, а с упоминанием в исходниках
 * компонентов вообще. Причина в том, что класс доходит до разметки не только
 * литералом в `className`: `nx-root` собирается в массиве `rootClass`, `filled`
 * — склейкой в `SiteIcon`. Вопрос, на который отвечает эта проверка, слабее и
 * потому надёжнее: встречается ли имя в слое разметки хоть где-нибудь. Имени,
 * которого нет ни в одном компоненте, в селекторе взяться неоткуда. Сравнение
 * идёт целыми словами, иначе `mobile-sections-card` сошёлся бы с
 * `nx-mobile-sections-card` — именно та ошибка, по следу которой всё заведено.
 */
const SPEC_DIR = 'e2e';
const LITERALS = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g;

const mentioned = new Set();
for (const file of walk(ROOT)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(LITERALS)) {
    const text = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    for (const token of text.split(/[^\w-]+/)) {
      if (/^[A-Za-z][\w-]*$/.test(token)) mentioned.add(token);
    }
  }
}

const selected = new Map();
for (const name of readdirSync(SPEC_DIR)) {
  if (!name.endsWith('.ts')) continue;
  const file = join(SPEC_DIR, name);
  const source = readFileSync(file, 'utf8');
  const calls = /(?:locator|querySelectorAll|querySelector)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;
  for (const match of source.matchAll(calls)) {
    // Утверждение читается от селектора до конца выражения: проверка на
    // отсутствие снимает требование существовать.
    const statement = source.slice(match.index, source.indexOf(';', match.index) + 1 || match.index + 400);
    if (ABSENCE_CHECKS.some(check => check.test(statement))) continue;
    const selector = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    for (const found of selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
      if (!selected.has(found[1])) selected.set(found[1], file);
    }
  }
}

// Склейка вида `'nx-tile-' + mode` оставляет в исходнике обрывок на дефисе;
// спека при этом ищет собранное имя. Поэтому обрывки — разрешённые начала.
const prefixes = [...mentioned].filter(name => name.endsWith('-'));
const known = name => mentioned.has(name) || STATES.has(name) || MARKERS.has(name)
  || prefixes.some(prefix => name.startsWith(prefix));

const missing = [...selected].filter(([name]) => !known(name));
if (missing.length) {
  problems.push('Спеки ищут классы, которых в разметке нет:\n'
    + missing.map(([name, file]) => `  ${name} — ${file}`).join('\n')
    + '\n\nЧаще всего это забытый после переименования селектор: тест будет\n'
    + 'ждать несуществующий узел до таймаута. Поправьте селектор. Если имя\n'
    + 'названо затем, чтобы доказать отсутствие узла, проверка должна это\n'
    + 'и утверждать — `toHaveCount(0)`, `toBeHidden()` или `not`.');
}

if (problems.length) {
  console.error(problems.join('\n\n'));
  process.exit(1);
}
const debt = [...used].filter(([name]) => OUTSIDE_NAMESPACE.has(name)).length;
console.log(`Оформление на месте: ${used.size} классов в разметке, у каждого есть правило`
  + ` (меток: ${MARKERS.size}, вне пространства nx-: ${debt}).`);
console.log(`Селекторы спек на месте: ${selected.size} классов ищут существующие узлы`
  + ` (проверки на отсутствие не в счёт).`);
