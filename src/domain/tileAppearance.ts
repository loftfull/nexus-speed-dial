import type { TileMode, VisualPreset } from './types';

/**
 * Полное описание внешнего вида плитки сайта.
 *
 * Каждое поле доходит до экрана: `toTileVars` переводит его в CSS-переменную,
 * которую читает `.nx-tile` в theme.css. Тест `tileAppearance.test.ts` проходит
 * по всем полям и падает, если какое-то перестало влиять на переменные.
 */
export type TileAppearance = {
  preset: VisualPreset;
  /** Раскладка сетки: обычная плитка, только иконки, список, превью. */
  mode: TileMode;

  /* ── размер и сетка ───────────────────────────────────────── */
  width: number;
  minHeight: number;
  gap: number;
  radius: number;
  iconSize: number;
  /** 0 — подбирать число колонок по ширине окна. */
  columns: number;
  /** Скругление знака сайта на плитке. */
  markRadius: number;
  /** Пропорция плитки. `auto` — высоту задаёт содержимое и нижняя граница. */
  ratio: 'auto' | '4/3' | '1/1' | '3/4';
  /** Куда прижать сетку, когда она короче окна. */
  anchor: 'top' | 'center';
  align: 'left' | 'center';
  font: 'Manrope' | 'Inter';

  /* ── поверхность ──────────────────────────────────────────── */
  /**
   * `glass` — полупрозрачная подложка с размытием того, что за ней
   * (glassmorphism). Включается только выбором пользователя: по умолчанию
   * подложка плотная.
   */
  surface: 'solid' | 'tinted' | 'gradient' | 'contrast' | 'glass';
  /** Доля акцентного цвета в подложке, %. */
  tint: number;
  borderWidth: number;
  borderOpacity: number;
  innerHighlight: boolean;
  /**
   * `hairline` — только внутреннее кольцо по кромке, без тени: так строят
   *   глубину Linear, Raycast и Resend — лестницей поверхностей и кромкой;
   * `stack` — несколько мелких смещений вместо одной размытой тени, плюс
   *   то же кольцо (приём Vercel: «никогда одна тень с размытием 8 px»);
   * `soft` — мягкая многослойная тень;
   * `neumorph` — две зеркальные тени, тёмная вниз-вправо и светлая
   *   вверх-влево, размытие вдвое больше сдвига (мягкий рельеф);
   * `material` — пара «ключевая + окружающая» по уровням Material 3.
   */
  shadowStyle: 'none' | 'hairline' | 'stack' | 'drop' | 'soft' | 'neumorph' | 'material';
  /**
   * Плотность внутреннего кольца по кромке, %. Кольцо держит край карточки
   * чётким и не даёт ей расплыться — в разобранных системах это главный
   * признак «карточки». 0 — кольца нет.
   */
  ring: number;
  /** Плотность кромки под курсором, %: у Linear наведённая карточка поднимается на ступень. */
  ringHover: number;
  /** Толщина кромки в десятых пикселя: 5 — это 0.5 px, волосяная линия. */
  ringWidth: number;
  shadowDepth: number;
  shadowSoftness: number;
  shadowOpacity: number;
  /** Размытие фона под стеклом, px. 0 — стекло без размытия. */
  blur: number;
  /** Непрозрачность стеклянной подложки, %. */
  fillOpacity: number;
  /**
   * Слой состояния Material 3: цвет содержимого поверх подложки. 0 — выключен.
   * При нажатии слой на два пункта плотнее, как 8 % и 10 % в спецификации.
   */
  stateLayer: number;

  /* ── реакция на взаимодействие ────────────────────────────── */
  hoverLift: number;
  hoverScale: number;
  /** Насколько тень усиливается под курсором, % от покоя. */
  hoverShadow: number;
  pressedScale: number;
  transitionMs: number;
  /** `spring` — лёгкий перелёт на возврате: кривая с выбросом больше единицы. */
  easing: 'standard' | 'soft' | 'snappy' | 'spring';
  focusRing: 'minimal' | 'standard' | 'strong';
  /** `cascade` — то же появление, но плитки выходят по очереди, а не разом. */
  loadAnimation: 'none' | 'fade' | 'rise' | 'cascade';
  dragFeedback: boolean;

  /* ── содержимое ───────────────────────────────────────────── */
  showTitle: boolean;
  showDescription: boolean;
  showDomain: boolean;
  showCategory: boolean;
  showFavorite: boolean;
};

/** Допустимые пределы числовых параметров: [минимум, максимум, шаг]. */
export const TILE_BOUNDS = {
  width: [120, 280, 5],
  minHeight: [72, 260, 4],
  gap: [4, 36, 2],
  radius: [0, 34, 1],
  iconSize: [24, 76, 2],
  markRadius: [0, 26, 1],
  columns: [0, 8, 1],
  tint: [0, 60, 2],
  borderWidth: [0, 3, 1],
  borderOpacity: [0, 100, 5],
  shadowDepth: [0, 24, 1],
  // Выше 20 px размытие роняет кадры на телефонах, поэтому это и потолок.
  ring: [0, 24, 1],
  ringHover: [0, 40, 1],
  ringWidth: [5, 20, 5],
  blur: [0, 20, 1],
  fillOpacity: [4, 40, 1],
  stateLayer: [0, 16, 1],
  shadowSoftness: [0, 60, 2],
  shadowOpacity: [0, 40, 1],
  hoverLift: [0, 14, 1],
  hoverScale: [100, 108, 1],
  hoverShadow: [100, 220, 5],
  pressedScale: [88, 100, 1],
  transitionMs: [0, 500, 10],
} as const satisfies Record<string, readonly [number, number, number]>;

export type TileNumberKey = keyof typeof TILE_BOUNDS;

const clamp = (value: number, key: TileNumberKey) => {
  const [min, max] = TILE_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));
};

/** База, от которой отличаются все девять готовых видов. */
const BASE: TileAppearance = {
  preset: 'soft', mode: 'standard',
  // Знак сайта — главное на плитке, поэтому он крупный, а отступы вокруг
  // минимальные: карточка должна обнимать содержание.
  width: 170, minHeight: 120, gap: 20, radius: 20, iconSize: 52, columns: 0, markRadius: 16, ratio: 'auto', anchor: 'top',
  align: 'center', font: 'Inter',
  surface: 'solid', tint: 0,
  borderWidth: 0, borderOpacity: 0, innerHighlight: false,
  shadowStyle: 'stack', shadowDepth: 6, shadowSoftness: 18, shadowOpacity: 6, ring: 8, ringHover: 14, ringWidth: 10,
  blur: 0, fillOpacity: 18, stateLayer: 0,
  hoverLift: 2, hoverScale: 100, hoverShadow: 140, pressedScale: 98,
  transitionMs: 180, easing: 'standard', focusRing: 'standard',
  loadAnimation: 'cascade', dragFeedback: true,
  // Адрес показан по умолчанию: карточка должна быть заполнена содержанием,
  // а не воздухом. В разобранных системах строка списка всегда несёт вторую
  // строку — заголовок и пояснение.
  showTitle: true, showDescription: true, showDomain: true, showCategory: false, showFavorite: true,
};

/**
 * Девять готовых видов. Каждый меняет подложку, тень и реакцию, а не только
 * подпись под кнопкой. Ни один не использует размытия, свечения и приёмов,
 * которые к 2026 году выглядят устаревшими.
 */
export const TILE_PRESETS: Record<VisualPreset, TileAppearance> = {
  soft: { ...BASE, preset: 'soft' },
  compact: {
    ...BASE, preset: 'compact',
    width: 132, minHeight: 112, gap: 10, radius: 14, iconSize: 32,
    shadowDepth: 3, shadowSoftness: 10, shadowOpacity: 5,
    hoverLift: 1, hoverShadow: 130, transitionMs: 140,
  },
  flat: {
    ...BASE, preset: 'flat',
    radius: 12, shadowStyle: 'none', borderWidth: 1, borderOpacity: 100,
    hoverLift: 0, hoverShadow: 100, pressedScale: 99, transitionMs: 120, easing: 'snappy',
  },
  outline: {
    ...BASE, preset: 'outline',
    radius: 24, shadowStyle: 'none', borderWidth: 1, borderOpacity: 70,
    hoverLift: 0, hoverShadow: 100, pressedScale: 99, transitionMs: 160,
  },
  floating: {
    ...BASE, preset: 'floating',
    radius: 22, shadowStyle: 'soft', shadowDepth: 14, shadowSoftness: 38, shadowOpacity: 12,
    hoverLift: 6, hoverScale: 101, hoverShadow: 170, pressedScale: 97,
    transitionMs: 240, easing: 'soft',
  },
  aurora: {
    ...BASE, preset: 'aurora',
    radius: 24, surface: 'gradient', tint: 22,
    shadowStyle: 'soft', shadowDepth: 10, shadowSoftness: 30, shadowOpacity: 8,
    hoverLift: 3, hoverShadow: 150, easing: 'soft', loadAnimation: 'rise',
  },
  sand: {
    ...BASE, preset: 'sand',
    radius: 18, surface: 'tinted', shadowStyle: 'none',
    borderWidth: 1, borderOpacity: 55, hoverLift: 1, hoverShadow: 100, transitionMs: 160,
  },
  contrast: {
    ...BASE, preset: 'contrast',
    radius: 20, surface: 'contrast', tint: 10,
    shadowDepth: 8, shadowSoftness: 22, shadowOpacity: 14,
    hoverLift: 3, hoverShadow: 160, transitionMs: 200,
  },
  accent: {
    ...BASE, preset: 'accent',
    radius: 20, surface: 'tinted', tint: 16,
    shadowStyle: 'soft', shadowDepth: 8, shadowSoftness: 24, shadowOpacity: 9,
    hoverLift: 3, hoverScale: 101, hoverShadow: 160, easing: 'soft',
  },

  /*
   * Три вида ниже собраны по опубликованным спецификациям чужих систем.
   * Числа и источники разобраны в docs/design-styles.md.
   */

  // Glassmorphism: полупрозрачная подложка, размытие фона 8–16 px,
  // тонкая светлая рамка сверху.
  glass: {
    ...BASE, preset: 'glass',
    radius: 20, surface: 'glass', tint: 0, fillOpacity: 18, blur: 12,
    borderWidth: 1, borderOpacity: 45, innerHighlight: true,
    shadowStyle: 'soft', shadowDepth: 10, shadowSoftness: 30, shadowOpacity: 10,
    hoverLift: 2, hoverShadow: 150, easing: 'soft',
  },

  // Soft UI: плитка того же цвета, что полотно, и две зеркальные тени,
  // размытие вдвое больше сдвига.
  neumorph: {
    ...BASE, preset: 'neumorph',
    radius: 20, surface: 'solid', tint: 0,
    borderWidth: 0, borderOpacity: 0, innerHighlight: false,
    shadowStyle: 'neumorph', shadowDepth: 9, shadowSoftness: 18, shadowOpacity: 8,
    // Рельеф плохо показывает нажатие тенью, поэтому его берёт на себя масштаб.
    hoverLift: 0, hoverShadow: 100, pressedScale: 97, transitionMs: 200, easing: 'soft',
  },

  /*
   * Ниже — три вида, собранные по разбору чужих систем в
   * docs/design-audit-github.md. Общее у них одно: глубина строится на
   * лестнице поверхностей и волосяной кромке, а не на размытой тени.
   */

  // Linear, Raycast, Resend: подложка на ступень светлее полотна плюс кромка,
  // тени нет вовсе.
  ladder: {
    ...BASE, preset: 'ladder',
    radius: 14, surface: 'tinted', tint: 0,
    borderWidth: 0, borderOpacity: 0, innerHighlight: false,
    shadowStyle: 'hairline', ring: 12,
    hoverLift: 0, hoverScale: 100, hoverShadow: 100, pressedScale: 99,
    transitionMs: 140, easing: 'snappy', stateLayer: 5,
  },

  // Framer, уровень 2: кромка, светлый край сверху и одна мелкая тень.
  edge: {
    ...BASE, preset: 'edge',
    radius: 16, surface: 'solid', tint: 0,
    borderWidth: 0, borderOpacity: 0, innerHighlight: true,
    shadowStyle: 'stack', ring: 10, shadowDepth: 5, shadowSoftness: 16, shadowOpacity: 7,
    hoverLift: 1, hoverShadow: 130, pressedScale: 99, transitionMs: 160, easing: 'soft',
  },

  // Vercel, уровень 4: несколько мелких смещений вместо одной размытой тени,
  // и кольцо, чтобы край оставался чётким.
  studio: {
    ...BASE, preset: 'studio',
    radius: 12, surface: 'solid', tint: 0,
    borderWidth: 0, borderOpacity: 0, innerHighlight: true,
    shadowStyle: 'stack', ring: 9, shadowDepth: 9, shadowSoftness: 24, shadowOpacity: 8,
    hoverLift: 2, hoverShadow: 150, pressedScale: 99, transitionMs: 180, easing: 'standard',
  },

  // Material 3: уровни высоты вместо произвольной тени и слой состояния
  // цветом содержимого — 8 % под курсором и 10 % при нажатии.
  material: {
    ...BASE, preset: 'material',
    radius: 12, surface: 'solid', tint: 0,
    shadowStyle: 'material', shadowDepth: 5, shadowSoftness: 12, shadowOpacity: 14,
    stateLayer: 8,
    hoverLift: 0, hoverScale: 100, hoverShadow: 140, pressedScale: 100,
    transitionMs: 200, easing: 'standard',
  },
};

export const PRESET_ORDER: VisualPreset[] = [
  'soft', 'compact', 'flat', 'outline', 'floating', 'aurora', 'sand', 'contrast', 'accent',
  'glass', 'neumorph', 'material',
  'ladder', 'edge', 'studio',
];

export const PRESET_LABELS: Record<VisualPreset, string> = {
  soft: 'Мягкий', compact: 'Плотный', flat: 'Плоский', outline: 'Контур', floating: 'Парящий',
  aurora: 'Аврора', sand: 'Песочный', contrast: 'Тёмный', accent: 'Акцент',
  glass: 'Стекло', neumorph: 'Рельеф', material: 'Material',
  ladder: 'Ступень', edge: 'Кромка', studio: 'Студия',
};

export const DEFAULT_TILE_APPEARANCE: TileAppearance = { ...TILE_PRESETS.soft };

const ONE_OF = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? value as T : fallback;

/** Приводит значение из хранилища или резервной копии к рабочему виду. */
export function normalizeTileAppearance(value: unknown): TileAppearance {
  const raw = (value ?? {}) as Partial<TileAppearance> & Record<string, unknown>;
  const numbers = Object.fromEntries(
    (Object.keys(TILE_BOUNDS) as TileNumberKey[])
      .map(key => [key, clamp(raw[key] as number ?? DEFAULT_TILE_APPEARANCE[key], key)]),
  ) as Record<TileNumberKey, number>;

  return {
    ...DEFAULT_TILE_APPEARANCE,
    ...numbers,
    preset: ONE_OF(raw.preset, PRESET_ORDER, DEFAULT_TILE_APPEARANCE.preset),
    mode: ONE_OF(raw.mode, ['standard', 'icon', 'list', 'preview'] as const, DEFAULT_TILE_APPEARANCE.mode),
    ratio: ONE_OF(raw.ratio, ['auto', '4/3', '1/1', '3/4'] as const, DEFAULT_TILE_APPEARANCE.ratio),
    anchor: ONE_OF(raw.anchor, ['top', 'center'] as const, DEFAULT_TILE_APPEARANCE.anchor),
    align: ONE_OF(raw.align, ['left', 'center'] as const, DEFAULT_TILE_APPEARANCE.align),
    font: ONE_OF(raw.font, ['Manrope', 'Inter'] as const, DEFAULT_TILE_APPEARANCE.font),
    surface: ONE_OF(raw.surface, ['solid', 'tinted', 'gradient', 'contrast', 'glass'] as const, DEFAULT_TILE_APPEARANCE.surface),
    shadowStyle: ONE_OF(raw.shadowStyle, ['none', 'hairline', 'stack', 'drop', 'soft', 'neumorph', 'material'] as const, DEFAULT_TILE_APPEARANCE.shadowStyle),
    easing: ONE_OF(raw.easing, ['standard', 'soft', 'snappy', 'spring'] as const, DEFAULT_TILE_APPEARANCE.easing),
    focusRing: ONE_OF(raw.focusRing, ['minimal', 'standard', 'strong'] as const, DEFAULT_TILE_APPEARANCE.focusRing),
    loadAnimation: ONE_OF(raw.loadAnimation, ['none', 'fade', 'rise', 'cascade'] as const, DEFAULT_TILE_APPEARANCE.loadAnimation),
    innerHighlight: typeof raw.innerHighlight === 'boolean' ? raw.innerHighlight : DEFAULT_TILE_APPEARANCE.innerHighlight,
    dragFeedback: typeof raw.dragFeedback === 'boolean' ? raw.dragFeedback : DEFAULT_TILE_APPEARANCE.dragFeedback,
    showTitle: typeof raw.showTitle === 'boolean' ? raw.showTitle : DEFAULT_TILE_APPEARANCE.showTitle,
    showDescription: typeof raw.showDescription === 'boolean' ? raw.showDescription : DEFAULT_TILE_APPEARANCE.showDescription,
    showDomain: typeof raw.showDomain === 'boolean' ? raw.showDomain : DEFAULT_TILE_APPEARANCE.showDomain,
    showCategory: typeof raw.showCategory === 'boolean' ? raw.showCategory : DEFAULT_TILE_APPEARANCE.showCategory,
    showFavorite: typeof raw.showFavorite === 'boolean' ? raw.showFavorite : DEFAULT_TILE_APPEARANCE.showFavorite,
  };
}

const EASING: Record<TileAppearance['easing'], string> = {
  standard: 'cubic-bezier(.2,.8,.2,1)',
  soft: 'cubic-bezier(.22,.61,.36,1)',
  snappy: 'cubic-bezier(.16,1,.3,1)',
  // Кривая с выбросом: значение больше единицы даёт перелёт и возврат.
  spring: 'cubic-bezier(.34,1.56,.64,1)',
};
const FOCUS_WIDTH: Record<TileAppearance['focusRing'], string> = { minimal: '1px', standard: '2px', strong: '3px' };
const LOAD_NAME: Record<TileAppearance['loadAnimation'], string> = {
  none: 'none', fade: 'nx-tile-fade', rise: 'nx-tile-rise', cascade: 'nx-tile-rise',
};

/** Подложка плитки. `contrast` даёт тёмную поверхность, `gradient` — переливы. */
function background(tile: TileAppearance): string {
  // Мягкий рельеф требует, чтобы плитка была того же цвета, что и фон под
  // ней. Фон у нас — обои с градиентом, поэтому плитка не красится вовсе:
  // так совпадение точное, а рельеф создают две зеркальные тени.
  if (tile.shadowStyle === 'neumorph') return 'transparent';
  if (tile.surface === 'glass') {
    return `color-mix(in srgb, var(--nx-surface) ${tile.fillOpacity}%, transparent)`;
  }
  if (tile.surface === 'contrast') {
    return `color-mix(in srgb, var(--nx-accent) ${tile.tint}%, #10151d)`;
  }
  if (tile.surface === 'gradient') {
    return `linear-gradient(140deg, color-mix(in srgb, var(--nx-accent) ${tile.tint}%, var(--nx-surface)),`
      + ` color-mix(in srgb, var(--nx-accent) ${Math.round(tile.tint / 3)}%, var(--nx-surface)))`;
  }
  const base = tile.surface === 'tinted' ? 'var(--nx-sunken)' : 'var(--nx-surface)';
  return tile.tint > 0 ? `color-mix(in srgb, var(--nx-accent) ${tile.tint}%, ${base})` : base;
}

/**
 * Тень из выбранного типа и трёх чисел. `soft` кладёт три слабых слоя —
 * так тень читается мягко и не превращается в жёсткий контур.
 */
/**
 * Внутреннее кольцо по кромке. В разобранных системах (см.
 * docs/design-audit-github.md) это универсальный признак карточки: Vercel
 * добавляет его к каждому уровню, Linear и Raycast строят на нём всю глубину.
 */
function ring(tile: TileAppearance, hovered = false): string {
  const density = hovered ? tile.ringHover : tile.ring;
  if (tile.ring <= 0 || density <= 0) return '';
  return `inset 0 0 0 ${(tile.ringWidth / 10).toFixed(1)}px rgba(var(--nx-ring-rgb), ${(density / 100).toFixed(3)})`;
}

function shadow(tile: TileAppearance, boost = 1, hovered = false): string {
  const edge = ring(tile, hovered);
  const withEdge = (value: string) => (edge ? (value === 'none' ? edge : `${value}, ${edge}`) : value);
  if (tile.shadowStyle === 'none') return withEdge('none');
  if (tile.shadowStyle === 'hairline') return withEdge('none');
  const alpha = (tile.shadowOpacity / 100) * boost;
  const depth = Math.round(tile.shadowDepth * boost);
  const soft = Math.round(tile.shadowSoftness * boost);
  const layer = (offset: number, blurRadius: number, weight: number) =>
    `0 ${offset}px ${blurRadius}px rgba(var(--nx-shade-rgb), ${(alpha * weight).toFixed(3)})`;
  if (tile.shadowStyle === 'stack') {
    // Несколько мелких смещений вместо одной размытой тени: так свет читается
    // как настоящий, а край остаётся чётким.
    const step = Math.max(1, Math.round(depth / 3));
    return withEdge([
      layer(1, 1, 0.5),
      layer(step, step, 0.7),
      `0 ${step * 3}px ${Math.round(soft * 0.8)}px -${step * 2}px rgba(var(--nx-shade-rgb), ${(alpha * 0.9).toFixed(3)})`,
    ].join(', '));
  }
  if (tile.shadowStyle === 'neumorph') {
    // Две зеркальные тени: тёмная вниз-вправо, светлая вверх-влево,
    // размытие вдвое больше сдвига. Цвета берутся от полотна, поэтому
    // рельеф работает и в тёмной теме.
    const offset = Math.max(1, depth);
    const spread = offset * 2;
    const mix = Math.max(40, 100 - Math.round(alpha * 100 * 4));
    // У рельефа кольца нет: оно спорит с зеркальными тенями.
    return `${offset}px ${offset}px ${spread}px color-mix(in srgb, var(--nx-canvas) ${mix}%, #000),`
      + ` -${offset}px -${offset}px ${spread}px color-mix(in srgb, var(--nx-canvas) ${mix}%, #fff)`;
  }
  if (tile.shadowStyle === 'material') {
    // Уровни 0…5 как в Material 3; на каждом уровне пара слоёв —
    // ключевая тень и окружающая. Сами значения прозрачности наши.
    const level = Math.min(5, Math.round(depth / 5));
    if (level === 0) return 'none';
    const key = layer(level, level + 1, 1.6);
    const ambient = `0 ${level * 2}px ${level * 3 + 2}px ${level}px`
      + ` rgba(var(--nx-shade-rgb), ${(alpha * 0.8).toFixed(3)})`;
    return withEdge(`${key}, ${ambient}`);
  }
  if (tile.shadowStyle === 'soft') {
    return withEdge([layer(Math.round(depth / 4), Math.round(soft / 3), 0.5), layer(depth, soft, 0.7),
      layer(Math.round(depth * 1.8), Math.round(soft * 1.8), 0.4)].join(', '));
  }
  return withEdge(`${layer(1, 2, 0.4)}, ${layer(depth, soft, 1)}`);
}

/** Класс сетки для выбранной раскладки: им `mode` доходит до экрана. */
export function tileLayoutClass(mode: TileAppearance['mode']): string {
  return 'layout-' + mode;
}

export type TileVars = Record<string, string>;

/** Переводит настройки в CSS-переменные, которые читает `.nx-tile`. */
export function toTileVars(tile: TileAppearance): TileVars {
  return {
    '--nx-tile': `${tile.width}px`,
    // Высота тоже идёт от окна: иначе на широком экране крупная плитка
    // выглядела бы вытянутой строкой. Значение слайдера — нижняя граница.
    '--nx-tile-min-h': `max(${tile.minHeight}px,8vw)`,
    '--nx-gap': `${tile.gap}px`,
    '--nx-tile-radius': `${tile.radius}px`,
    '--nx-icon': `${tile.iconSize}px`,
    '--nx-mark-radius': `${tile.markRadius}px`,
    // Ширина колонки идёт от самой области сетки, но не уходит дальше чем на
    // 8 % вниз и в полтора раза вверх от заданной: слайдер «Ширина» остаётся
    // главным. «Ширина» и раньше была нижней границей — колонка всё равно
    // тянется на 1fr.
    //
    // Единица именно cqw, а не vw. С vw доля считалась от окна целиком, и
    // стоило рядом появиться правому рельсу, как область сузилась на 284 px,
    // а нижняя граница колонки осталась прежней: пять столбцов схлопывались
    // в три растянутые плитки. cqw меряет ту ширину, которая сетке досталась
    // на самом деле. Где контейнер не найден, единица падает обратно на
    // размер окна — то есть на прежнее поведение.
    '--nx-tile-cols': tile.columns > 0
      ? `repeat(${tile.columns},minmax(0,1fr))`
      : `repeat(auto-fill,minmax(clamp(${Math.round(tile.width * 0.92)}px,14cqw,${Math.round(tile.width * 1.5)}px),1fr))`,
    '--nx-tile-ratio': tile.ratio,
    '--nx-grid-anchor': tile.anchor === 'center' ? 'center' : 'start',
    '--nx-tile-align': tile.align === 'left' ? 'flex-start' : 'center',
    '--nx-tile-text-align': tile.align,
    '--nx-tile-font': tile.font === 'Manrope' ? 'Manrope,Inter,system-ui,sans-serif' : 'Inter,Manrope,system-ui,sans-serif',
    '--nx-tile-bg': background(tile),
    // Запасная подложка: когда размытие недоступно или его просит отключить
    // сама система, стекло становится плотным — иначе текст поплывёт.
    '--nx-tile-bg-solid': tile.surface === 'glass' ? 'var(--nx-surface)' : background(tile),
    '--nx-tile-border': `${tile.borderWidth}px solid rgba(var(--nx-line-rgb), ${(tile.borderOpacity / 100).toFixed(2)})`,
    // Светлая кромка сверху: у Framer это 0.10, у Linear — «едва заметная».
    // Прежние 0.72 читались как глянец, а не как свет.
    '--nx-tile-highlight': tile.innerHighlight ? 'inset 0 1px 0 rgba(255,255,255,.12)' : 'inset 0 0 0 rgba(0,0,0,0)',
    // Размытие работает только под стеклом: на плотной подложке размывать нечего.
    '--nx-tile-blur': tile.surface === 'glass' && tile.blur > 0 ? `blur(${tile.blur}px)` : 'none',
    // Слой состояния Material 3: цвет содержимого поверх подложки,
    // при нажатии на два пункта плотнее.
    '--nx-tile-state': tile.stateLayer > 0
      ? `color-mix(in srgb, currentColor ${tile.stateLayer}%, transparent)` : 'transparent',
    '--nx-tile-state-press': tile.stateLayer > 0
      ? `color-mix(in srgb, currentColor ${Math.min(100, tile.stateLayer + 2)}%, transparent)` : 'transparent',
    '--nx-tile-shadow': shadow(tile),
    // Кромка под курсором усиливается независимо от тени: у «Ступени» тени нет,
    // и вся реакция на наведение — в кромке.
    '--nx-tile-shadow-hover': shadow(tile, tile.hoverShadow / 100, true),
    '--nx-tile-ink': tile.surface === 'contrast' ? '#f2f6fc' : 'var(--nx-text)',
    '--nx-tile-ink-soft': tile.surface === 'contrast' ? 'rgba(242,246,252,.66)' : 'var(--nx-muted)',
    '--nx-tile-lift': `-${tile.hoverLift}px`,
    '--nx-tile-hover-scale': (tile.hoverScale / 100).toFixed(3),
    '--nx-tile-press-scale': (tile.pressedScale / 100).toFixed(3),
    '--nx-tile-transition': `${tile.transitionMs}ms`,
    '--nx-tile-easing': EASING[tile.easing],
    '--nx-tile-focus-width': FOCUS_WIDTH[tile.focusRing],
    '--nx-tile-load': LOAD_NAME[tile.loadAnimation],
    // Шаг каскада: плитки выходят по очереди. Ноль — все разом, как раньше.
    '--nx-tile-step': tile.loadAnimation === 'cascade' ? '26ms' : '0ms',
    '--nx-tile-drag-opacity': tile.dragFeedback ? '.55' : '1',
    '--nx-tile-title': tile.showTitle ? 'block' : 'none',
    '--nx-tile-desc': tile.showDescription ? '-webkit-box' : 'none',
    '--nx-tile-domain': tile.showDomain ? 'block' : 'none',
    '--nx-tile-category': tile.showCategory ? 'block' : 'none',
    '--nx-tile-star': tile.showFavorite ? 'block' : 'none',
  };
}
