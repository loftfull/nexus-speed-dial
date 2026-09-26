/**
 * Тема категории: иконка и цвет выводятся из названия.
 *
 * Прежде любая категория получала один и тот же знак — тег, — а цвет брался
 * хешем от идентификатора. Знак поэтому ничего не сообщал, а цвет менялся от
 * того, в каком порядке категории создавали: «Соцсети» в одном пространстве и
 * «Соцсети» в другом оказывались разного цвета. Со стороны это выглядит как
 * лотерея, а не как система.
 *
 * Теперь работает так:
 *   1. название узнаётся по словарю — тогда у категории свой знак и свой цвет;
 *   2. название не узнано — знака нет вовсе, остаётся монограмма на подложке.
 *
 * Второй пункт важнее первого. Показать тег на «Рецептах» — значит утверждать,
 * что категория про ярлыки. Буква честнее: она говорит «имя знаю, смысл нет».
 *
 * Цвет неузнанной категории всё ещё берётся хешем, но от нормализованного
 * названия, а не от идентификатора: одинаковые названия везде получают
 * одинаковый цвет, и это уже воспринимается как правило.
 */

/** Знаки берутся из собранного набора: src/app/icons.generated.tsx. */
export type ThemeIcon =
  | 'Users' | 'ChatCircle' | 'FilmSlate' | 'Briefcase' | 'GraduationCap' | 'ShoppingBag'
  | 'Wallet' | 'Newspaper' | 'MusicNotes' | 'Code' | 'PenNib' | 'Airplane' | 'Heartbeat'
  | 'ForkKnife' | 'GameController' | 'Camera' | 'Envelope' | 'Cloud' | 'Book' | 'Wrench'
  | 'House' | 'User';

export type CategoryTheme = { id: string; icon: ThemeIcon; color: string };

/**
 * Приводит название к виду, по которому можно искать: нижний регистр, «ё» как
 * «е», разделители — пробелы. Без этого «Соц. сети» и «соцсети» считались бы
 * разными, а «Причёски» и «Прически» получали бы разные цвета.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Словарь. Порядок значим: частное идёт раньше общего, иначе «рабочая почта»
 * попадёт в «работу» вместо почты.
 *
 * Ключи — корни, а не целые слова: русский склоняется. Корень при этом берётся
 * по самой короткой форме, которая ещё однозначна: «покупк» не покрывает
 * «покупок» — беглая гласная съедает «к», — поэтому в словаре «покуп». Та же
 * причина у пары «деньг|денег».
 */
const THEMES: { theme: CategoryTheme; match: RegExp }[] = [
  { theme: { id: 'mail', icon: 'Envelope', color: '#2f74d0' }, match: /почт|mail|inbox|письм/ },
  { theme: { id: 'social', icon: 'Users', color: '#3988ee' }, match: /соцсет|соц сет|социальн|social|общени|друзь/ },
  { theme: { id: 'chat', icon: 'ChatCircle', color: '#22a2c4' }, match: /мессендж|чат|chat|messeng|перепис|звонк/ },
  { theme: { id: 'video', icon: 'FilmSlate', color: '#c9364f' }, match: /развлеч|кино|фильм|видео|сериал|movie|video|стрим/ },
  { theme: { id: 'music', icon: 'MusicNotes', color: '#1f9d6b' }, match: /музык|music|подкаст|аудио|радио/ },
  { theme: { id: 'game', icon: 'GameController', color: '#7a5cf0' }, match: /игр|game|gaming|консол/ },
  { theme: { id: 'work', icon: 'Briefcase', color: '#4b5b74' }, match: /работ|work|офис|business|бизнес|задач|проект/ },
  { theme: { id: 'study', icon: 'GraduationCap', color: '#8b63e8' }, match: /учеб|обучен|курс|study|learn|школ|универ|образован/ },
  { theme: { id: 'read', icon: 'Book', color: '#9a6b3f' }, match: /книг|книж|чтени|read|book|библиотек|стать/ },
  { theme: { id: 'news', icon: 'Newspaper', color: '#6a7382' }, match: /новост|news|пресс|сми/ },
  { theme: { id: 'shop', icon: 'ShoppingBag', color: '#e0851f' }, match: /покуп|магазин|shop|store|маркет|заказ/ },
  { theme: { id: 'money', icon: 'Wallet', color: '#2aa879' }, match: /финанс|банк|деньг|денег|money|bank|бюджет|инвест|крипт/ },
  { theme: { id: 'dev', icon: 'Code', color: '#3d6bd6' }, match: /код|разработ|программ|dev|code|git|api|фронт|бэкенд/ },
  { theme: { id: 'design', icon: 'PenNib', color: '#d2447e' }, match: /дизайн|design|график|макет|шрифт|иллюстр/ },
  { theme: { id: 'photo', icon: 'Camera', color: '#b5623a' }, match: /фото|photo|снимк|камер/ },
  { theme: { id: 'travel', icon: 'Airplane', color: '#0f8ab8' }, match: /путешеств|travel|отпуск|билет|отел|поездк|туризм/ },
  { theme: { id: 'health', icon: 'Heartbeat', color: '#d2622c' }, match: /здоров|спорт|health|фитнес|трениров|медиц|врач/ },
  { theme: { id: 'food', icon: 'ForkKnife', color: '#c98f21' }, match: /ед|еда|food|рецепт|кухн|ресторан|достав/ },
  { theme: { id: 'cloud', icon: 'Cloud', color: '#5b78a8' }, match: /облак|cloud|диск|хранилищ|файл|бэкап/ },
  { theme: { id: 'tools', icon: 'Wrench', color: '#7d8695' }, match: /инструмент|tool|сервис|утилит|админ/ },
  // Частые имена пространств: они проходят через тот же словарь, что и
  // категории, поэтому «Дом» и «Личное» тоже перестают получать знак по счёту.
  { theme: { id: 'home', icon: 'House', color: '#3d78c4' }, match: /^дом$|домашн|home|быт/ },
  { theme: { id: 'personal', icon: 'User', color: '#7a5cf0' }, match: /личн|персональн|personal|мо[еи]/ },
];

/** Палитра для неузнанных названий. Та же, что была, чтобы вид не поехал. */
export const FALLBACK_PALETTE = [
  '#3988ee', '#8b63e8', '#2aa879', '#e0851f', '#c9364f', '#0f8ab8', '#7a5cf0', '#d2622c',
];

/** Устойчивый индекс палитры: порядок создания на него не влияет. */
export function nameIndex(name: string): number {
  const key = normalizeName(name);
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100_000;
  }
  return hash % FALLBACK_PALETTE.length;
}

/** Тема по названию или null, если название ни о чём не говорит. */
export function detectTheme(name: string): CategoryTheme | null {
  const key = normalizeName(name);
  if (!key) return null;
  for (const { theme, match } of THEMES) {
    if (match.test(key)) return theme;
  }
  return null;
}

/** Знак категории. null — значит рисуется монограмма, а не ложный символ. */
export const themeIcon = (name: string): ThemeIcon | null => detectTheme(name)?.icon ?? null;

/** Цвет категории: из темы, а при неузнанном названии — из его же хеша. */
export const themeColor = (name: string): string =>
  detectTheme(name)?.color ?? FALLBACK_PALETTE[nameIndex(name)];

/** Монограмма: одна буква, две — для составного названия. */
export function themeMonogram(name: string): string {
  const words = normalizeName(name).split(' ').filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
