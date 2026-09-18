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
  align: 'left' | 'center';
  font: 'Manrope' | 'Inter';

  /* ── поверхность ──────────────────────────────────────────── */
  surface: 'solid' | 'tinted' | 'translucent' | 'gradient' | 'contrast';
  opacity: number;
  /** Доля акцентного цвета в подложке, %. */
  tint: number;
  blur: number;
  saturation: number;
  borderWidth: number;
  borderOpacity: number;
  innerHighlight: boolean;
  shadowStyle: 'none' | 'drop' | 'neumorphic' | 'layered' | 'ring';
  shadowDepth: number;
  shadowSoftness: number;
  shadowOpacity: number;

  /* ── реакция на взаимодействие ────────────────────────────── */
  hoverLift: number;
  hoverScale: number;
  hoverGlow: number;
  pressedScale: number;
  transitionMs: number;
  easing: 'standard' | 'soft' | 'snappy';
  focusRing: 'minimal' | 'standard' | 'strong';
  loadAnimation: 'none' | 'fade' | 'rise';
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
  columns: [0, 8, 1],
  opacity: [30, 100, 2],
  tint: [0, 60, 2],
  blur: [0, 30, 1],
  saturation: [80, 180, 5],
  borderWidth: [0, 3, 1],
  borderOpacity: [0, 100, 5],
  shadowDepth: [0, 24, 1],
  shadowSoftness: [0, 60, 2],
  shadowOpacity: [0, 40, 1],
  hoverLift: [0, 14, 1],
  hoverScale: [100, 108, 1],
  hoverGlow: [0, 40, 2],
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
  width: 170, minHeight: 148, gap: 20, radius: 20, iconSize: 40, columns: 0,
  align: 'center', font: 'Manrope',
  surface: 'solid', opacity: 100, tint: 0, blur: 0, saturation: 100,
  borderWidth: 0, borderOpacity: 0, innerHighlight: false,
  shadowStyle: 'drop', shadowDepth: 6, shadowSoftness: 18, shadowOpacity: 6,
  hoverLift: 2, hoverScale: 100, hoverGlow: 0, pressedScale: 98,
  transitionMs: 180, easing: 'standard', focusRing: 'standard',
  loadAnimation: 'fade', dragFeedback: true,
  showTitle: true, showDescription: false, showDomain: false, showCategory: false, showFavorite: true,
};

/** Девять готовых видов. Каждый меняет поверхность, тень и реакцию, а не только подпись. */
export const TILE_PRESETS: Record<VisualPreset, TileAppearance> = {
  soft: { ...BASE, preset: 'soft' },
  compact: {
    ...BASE, preset: 'compact',
    width: 132, minHeight: 112, gap: 10, radius: 14, iconSize: 32,
    shadowDepth: 3, shadowSoftness: 10, shadowOpacity: 5, hoverLift: 1, transitionMs: 140,
  },
  flat: {
    ...BASE, preset: 'flat',
    radius: 12, shadowStyle: 'none', borderWidth: 1, borderOpacity: 100,
    hoverLift: 0, hoverGlow: 0, pressedScale: 99, transitionMs: 120, easing: 'snappy',
  },
  glass: {
    ...BASE, preset: 'glass',
    radius: 22, surface: 'translucent', opacity: 62, blur: 18, saturation: 140,
    borderWidth: 1, borderOpacity: 55, innerHighlight: true,
    shadowDepth: 10, shadowSoftness: 30, shadowOpacity: 9, hoverLift: 3, easing: 'soft',
  },
  neon: {
    ...BASE, preset: 'neon',
    radius: 18, surface: 'contrast', tint: 26, borderWidth: 1, borderOpacity: 70,
    shadowStyle: 'ring', shadowDepth: 0, shadowSoftness: 26, shadowOpacity: 30,
    hoverLift: 2, hoverScale: 102, hoverGlow: 34, transitionMs: 220, easing: 'snappy',
    loadAnimation: 'rise',
  },
  neumorphic: {
    ...BASE, preset: 'neumorphic',
    radius: 26, surface: 'tinted', shadowStyle: 'neumorphic',
    shadowDepth: 8, shadowSoftness: 18, shadowOpacity: 14,
    hoverLift: 0, pressedScale: 97, transitionMs: 240, easing: 'soft',
  },
  layered: {
    ...BASE, preset: 'layered',
    radius: 18, shadowStyle: 'layered', shadowDepth: 5, shadowSoftness: 0, shadowOpacity: 18,
    hoverLift: 4, transitionMs: 200,
  },
  aurora: {
    ...BASE, preset: 'aurora',
    radius: 24, surface: 'gradient', tint: 22, saturation: 120,
    shadowDepth: 8, shadowSoftness: 26, shadowOpacity: 8,
    hoverLift: 3, hoverGlow: 16, easing: 'soft', loadAnimation: 'rise',
  },
  elevated: {
    ...BASE, preset: 'elevated',
    radius: 20, shadowDepth: 16, shadowSoftness: 34, shadowOpacity: 16,
    hoverLift: 8, hoverScale: 103, pressedScale: 96, transitionMs: 260, easing: 'soft',
  },
};

export const PRESET_ORDER: VisualPreset[] = [
  'soft', 'compact', 'flat', 'glass', 'neon', 'neumorphic', 'layered', 'aurora', 'elevated',
];

export const PRESET_LABELS: Record<VisualPreset, string> = {
  soft: 'Мягкий', compact: 'Плотный', flat: 'Плоский', glass: 'Стекло', neon: 'Неон',
  neumorphic: 'Неоморфизм', layered: 'Слоистый', aurora: 'Аврора', elevated: 'Приподнятый',
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
    align: ONE_OF(raw.align, ['left', 'center'] as const, DEFAULT_TILE_APPEARANCE.align),
    font: ONE_OF(raw.font, ['Manrope', 'Inter'] as const, DEFAULT_TILE_APPEARANCE.font),
    surface: ONE_OF(raw.surface, ['solid', 'tinted', 'translucent', 'gradient', 'contrast'] as const, DEFAULT_TILE_APPEARANCE.surface),
    shadowStyle: ONE_OF(raw.shadowStyle, ['none', 'drop', 'neumorphic', 'layered', 'ring'] as const, DEFAULT_TILE_APPEARANCE.shadowStyle),
    easing: ONE_OF(raw.easing, ['standard', 'soft', 'snappy'] as const, DEFAULT_TILE_APPEARANCE.easing),
    focusRing: ONE_OF(raw.focusRing, ['minimal', 'standard', 'strong'] as const, DEFAULT_TILE_APPEARANCE.focusRing),
    loadAnimation: ONE_OF(raw.loadAnimation, ['none', 'fade', 'rise'] as const, DEFAULT_TILE_APPEARANCE.loadAnimation),
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
};
const FOCUS_WIDTH: Record<TileAppearance['focusRing'], string> = { minimal: '1px', standard: '2px', strong: '3px' };
const LOAD_NAME: Record<TileAppearance['loadAnimation'], string> = { none: 'none', fade: 'nx-tile-fade', rise: 'nx-tile-rise' };

/** Подложка плитки. `contrast` даёт тёмную поверхность под неоновый вид. */
function background(tile: TileAppearance): string {
  const alpha = tile.opacity / 100;
  const tint = tile.tint / 100;
  if (tile.surface === 'contrast') {
    return `color-mix(in srgb, var(--nx-accent) ${tile.tint}%, #10151d) `.trim();
  }
  if (tile.surface === 'gradient') {
    return `linear-gradient(140deg, color-mix(in srgb, var(--nx-accent) ${tile.tint}%, var(--nx-surface)),`
      + ` color-mix(in srgb, var(--nx-accent) ${Math.round(tile.tint / 3)}%, var(--nx-surface)))`;
  }
  const base = tile.surface === 'tinted' ? 'var(--nx-sunken)' : 'var(--nx-surface)';
  const tinted = tint > 0 ? `color-mix(in srgb, var(--nx-accent) ${tile.tint}%, ${base})` : base;
  if (tile.surface === 'translucent' || alpha < 1) {
    return `color-mix(in srgb, ${tinted} ${Math.round(alpha * 100)}%, transparent)`;
  }
  return tinted;
}

/** Тень собирается из выбранного типа и трёх числовых параметров. */
function shadow(tile: TileAppearance): string {
  const alpha = (tile.shadowOpacity / 100).toFixed(3);
  const depth = tile.shadowDepth;
  const soft = tile.shadowSoftness;
  if (tile.shadowStyle === 'none') return 'none';
  if (tile.shadowStyle === 'ring') return `0 0 ${soft}px rgba(var(--nx-glow-rgb), ${alpha}), 0 0 0 1px rgba(var(--nx-glow-rgb), ${alpha})`;
  if (tile.shadowStyle === 'neumorphic') {
    return `${depth}px ${depth}px ${soft}px rgba(var(--nx-shade-rgb), ${alpha}),`
      + ` -${depth}px -${depth}px ${soft}px rgba(var(--nx-light-rgb), ${alpha})`;
  }
  if (tile.shadowStyle === 'layered') {
    return `0 ${depth}px 0 rgba(var(--nx-shade-rgb), ${alpha}),`
      + ` 0 ${depth * 2}px 0 rgba(var(--nx-shade-rgb), ${(Number(alpha) / 2).toFixed(3)})`;
  }
  return `0 1px 2px rgba(var(--nx-shade-rgb), ${(Number(alpha) / 2).toFixed(3)}), 0 ${depth}px ${soft}px rgba(var(--nx-shade-rgb), ${alpha})`;
}

/** Прозрачна ли подложка настолько, чтобы размытие и насыщенность были видны. */
export function backdropVisible(tile: TileAppearance): boolean {
  return tile.surface === 'translucent' || tile.opacity < 100;
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
    '--nx-tile-min-h': `${tile.minHeight}px`,
    '--nx-gap': `${tile.gap}px`,
    '--nx-tile-radius': `${tile.radius}px`,
    '--nx-icon': `${tile.iconSize}px`,
    '--nx-tile-cols': tile.columns > 0
      ? `repeat(${tile.columns},minmax(0,1fr))`
      : `repeat(auto-fill,minmax(${tile.width}px,1fr))`,
    '--nx-tile-align': tile.align === 'left' ? 'flex-start' : 'center',
    '--nx-tile-text-align': tile.align,
    '--nx-tile-font': tile.font === 'Inter' ? 'Inter,Manrope,system-ui,sans-serif' : 'Manrope,system-ui,sans-serif',
    '--nx-tile-bg': background(tile),
    '--nx-tile-blur': tile.blur > 0 || tile.saturation !== 100
      ? `blur(${tile.blur}px) saturate(${tile.saturation}%)` : 'none',
    '--nx-tile-border': `${tile.borderWidth}px solid rgba(var(--nx-line-rgb), ${(tile.borderOpacity / 100).toFixed(2)})`,
    '--nx-tile-highlight': tile.innerHighlight ? 'inset 0 1px 0 rgba(255,255,255,.72)' : 'inset 0 0 0 rgba(0,0,0,0)',
    '--nx-tile-shadow': shadow(tile),
    '--nx-tile-ink': tile.surface === 'contrast' ? '#f2f6fc' : 'var(--nx-text)',
    '--nx-tile-ink-soft': tile.surface === 'contrast' ? 'rgba(242,246,252,.66)' : 'var(--nx-muted)',
    '--nx-tile-lift': `-${tile.hoverLift}px`,
    '--nx-tile-hover-scale': (tile.hoverScale / 100).toFixed(3),
    '--nx-tile-glow': `0 0 0 ${Math.round(tile.hoverGlow / 4)}px rgba(var(--nx-glow-rgb), ${(tile.hoverGlow / 200).toFixed(3)})`,
    '--nx-tile-press-scale': (tile.pressedScale / 100).toFixed(3),
    '--nx-tile-transition': `${tile.transitionMs}ms`,
    '--nx-tile-easing': EASING[tile.easing],
    '--nx-tile-focus-width': FOCUS_WIDTH[tile.focusRing],
    '--nx-tile-load': LOAD_NAME[tile.loadAnimation],
    '--nx-tile-drag-opacity': tile.dragFeedback ? '.55' : '1',
    '--nx-tile-title': tile.showTitle ? 'block' : 'none',
    '--nx-tile-desc': tile.showDescription ? '-webkit-box' : 'none',
    '--nx-tile-domain': tile.showDomain ? 'block' : 'none',
    '--nx-tile-category': tile.showCategory ? 'block' : 'none',
    '--nx-tile-star': tile.showFavorite ? 'block' : 'none',
  };
}
