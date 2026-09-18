import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TILE_APPEARANCE, PRESET_ORDER, TILE_BOUNDS, TILE_PRESETS,
  normalizeTileAppearance, tileLayoutClass, toTileVars, type TileAppearance, type TileNumberKey,
} from './tileAppearance';

/** Значение, заведомо отличное от текущего, для каждого поля настроек. */
const OTHER: { [K in keyof TileAppearance]: (current: TileAppearance[K]) => TileAppearance[K] } = {
  preset: current => (current === 'soft' ? 'contrast' : 'soft'),
  mode: current => (current === 'standard' ? 'list' : 'standard'),
  align: current => (current === 'center' ? 'left' : 'center'),
  font: current => (current === 'Manrope' ? 'Inter' : 'Manrope'),
  surface: current => (current === 'solid' ? 'contrast' : 'solid'),
  shadowStyle: current => (current === 'drop' ? 'soft' : 'drop'),
  easing: current => (current === 'standard' ? 'snappy' : 'standard'),
  focusRing: current => (current === 'standard' ? 'strong' : 'standard'),
  loadAnimation: current => (current === 'fade' ? 'rise' : 'fade'),
  innerHighlight: current => !current,
  dragFeedback: current => !current,
  showTitle: current => !current,
  showDescription: current => !current,
  showDomain: current => !current,
  showCategory: current => !current,
  showFavorite: current => !current,
  width: () => 210, minHeight: () => 200, gap: () => 8, radius: () => 4, iconSize: () => 64,
  columns: () => 4, tint: () => 40,
  borderWidth: () => 2, borderOpacity: () => 80, shadowDepth: () => 18, shadowSoftness: () => 40,
  shadowOpacity: () => 25, hoverLift: () => 10, hoverScale: () => 106, hoverShadow: () => 200,
  pressedScale: () => 92, transitionMs: () => 400,
};

describe('tileAppearance', () => {
  it('содержит ровно девять готовых видов', () => {
    expect(PRESET_ORDER).toHaveLength(9);
    expect(new Set(PRESET_ORDER).size).toBe(9);
    PRESET_ORDER.forEach(id => expect(TILE_PRESETS[id].preset).toBe(id));
  });

  it('каждый готовый вид действительно отличается от остальных на экране', () => {
    const rendered = PRESET_ORDER.map(id => JSON.stringify(toTileVars(TILE_PRESETS[id])));
    expect(new Set(rendered).size).toBe(9);
  });

  // Главная гарантия: в разделе нет ни одного контрола без видимого действия.
  it.each(Object.keys(DEFAULT_TILE_APPEARANCE) as (keyof TileAppearance)[])(
    'параметр «%s» меняет стиль плитки',
    key => {
      const before = toTileVars(DEFAULT_TILE_APPEARANCE);
      const changed = { ...DEFAULT_TILE_APPEARANCE, [key]: (OTHER[key] as (value: unknown) => unknown)(DEFAULT_TILE_APPEARANCE[key]) };
      if (key === 'preset') {
        // Пресет не переменная, а набор значений: он меняет плитку через них.
        expect(JSON.stringify(toTileVars(TILE_PRESETS.contrast))).not.toBe(JSON.stringify(before));
        return;
      }
      if (key === 'mode') {
        // Раскладка доходит до экрана классом сетки, а не переменной.
        expect(tileLayoutClass('list')).not.toBe(tileLayoutClass(DEFAULT_TILE_APPEARANCE.mode));
        return;
      }
      expect(JSON.stringify(toTileVars(changed as TileAppearance))).not.toBe(JSON.stringify(before));
    },
  );

  it('удерживает числа в объявленных границах', () => {
    const keys = Object.keys(TILE_BOUNDS) as TileNumberKey[];
    const tooLow = normalizeTileAppearance(Object.fromEntries(keys.map(key => [key, -9999])));
    const tooHigh = normalizeTileAppearance(Object.fromEntries(keys.map(key => [key, 9999])));
    keys.forEach(key => {
      const [min, max] = TILE_BOUNDS[key];
      expect(tooLow[key]).toBe(min);
      expect(tooHigh[key]).toBe(max);
    });
  });

  it('заменяет неизвестные варианты значениями по умолчанию', () => {
    const value = normalizeTileAppearance({ preset: 'из-космоса', surface: 'нет', easing: 42, mode: null });
    expect(value.preset).toBe(DEFAULT_TILE_APPEARANCE.preset);
    expect(value.surface).toBe(DEFAULT_TILE_APPEARANCE.surface);
    expect(value.easing).toBe(DEFAULT_TILE_APPEARANCE.easing);
    expect(value.mode).toBe(DEFAULT_TILE_APPEARANCE.mode);
  });

  it('принимает настройки прежних версий без потери известных полей', () => {
    // Старая форма: radius/iconSize числом, hover строкой, размер буквой.
    const value = normalizeTileAppearance({ radius: 26, iconSize: 48, hover: 'float', size: 'L', showDomain: true });
    expect(value.radius).toBe(26);
    expect(value.iconSize).toBe(48);
    expect(value.showDomain).toBe(true);
    expect(value.preset).toBe('soft');
  });

  it('не выдаёт тень, когда тень выключена', () => {
    expect(toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none' })['--nx-tile-shadow']).toBe('none');
  });

  it('прячет подписи, когда они выключены', () => {
    const bare = toTileVars({ ...DEFAULT_TILE_APPEARANCE, showTitle: false, showDomain: false, showCategory: false, showFavorite: false });
    expect(bare['--nx-tile-title']).toBe('none');
    expect(bare['--nx-tile-domain']).toBe('none');
    expect(bare['--nx-tile-category']).toBe('none');
    expect(bare['--nx-tile-star']).toBe('none');
    const shown = toTileVars({ ...DEFAULT_TILE_APPEARANCE, showCategory: true });
    expect(shown['--nx-tile-category']).toBe('block');
  });

  // Пользователь попросил убрать неон, размытие и устаревшие приёмы целиком.
  it('нигде не осталось размытия, свечения и неонового вида', () => {
    const everything = JSON.stringify([
      DEFAULT_TILE_APPEARANCE,
      ...PRESET_ORDER.map(id => [TILE_PRESETS[id], toTileVars(TILE_PRESETS[id])]),
    ]);
    for (const forbidden of ['blur', 'saturate', 'neon', 'glass', 'translucent',
      'neumorphic', 'layered', 'elevated', 'glow']) {
      expect(everything).not.toContain(forbidden);
    }
  });

  it('старые значения из хранилища заменяются на действующие', () => {
    // Профиль, сохранённый прежней версией приложения.
    const old = normalizeTileAppearance({
      preset: 'neon', surface: 'translucent', shadowStyle: 'ring',
      blur: 18, saturation: 140, opacity: 62, hoverGlow: 34,
    });
    expect(old.preset).toBe(DEFAULT_TILE_APPEARANCE.preset);
    expect(old.surface).toBe(DEFAULT_TILE_APPEARANCE.surface);
    expect(old.shadowStyle).toBe(DEFAULT_TILE_APPEARANCE.shadowStyle);
    expect(JSON.stringify(old)).not.toContain('blur');
  });

  it('усиливает тень под курсором ровно на заданную долю', () => {
    const calm = toTileVars({ ...DEFAULT_TILE_APPEARANCE, hoverShadow: 100 });
    const strong = toTileVars({ ...DEFAULT_TILE_APPEARANCE, hoverShadow: 200 });
    expect(calm['--nx-tile-shadow-hover']).toBe(calm['--nx-tile-shadow']);
    expect(strong['--nx-tile-shadow-hover']).not.toBe(strong['--nx-tile-shadow']);
    // Выключенная тень остаётся выключенной и под курсором.
    expect(toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none' })['--nx-tile-shadow-hover']).toBe('none');
  });
});
