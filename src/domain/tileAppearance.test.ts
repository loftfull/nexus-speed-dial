import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TILE_APPEARANCE, PRESET_ORDER, TILE_BOUNDS, TILE_PRESETS,
  normalizeTileAppearance, tileLayoutClass, toTileVars, type TileAppearance, type TileNumberKey,
} from './tileAppearance';

/** Значение, заведомо отличное от текущего, для каждого поля настроек. */
const OTHER: { [K in keyof TileAppearance]: (current: TileAppearance[K]) => TileAppearance[K] } = {
  preset: current => (current === 'soft' ? 'contrast' : 'soft'),
  mode: current => (current === 'standard' ? 'list' : 'standard'),
  ratio: current => (current === 'auto' ? '4/3' : 'auto'),
  anchor: current => (current === 'top' ? 'center' : 'top'),
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
  columns: () => 4, markRadius: () => 4, tint: () => 40,
  blur: () => 14, fillOpacity: () => 30, stateLayer: () => 10, ring: () => 20, ringHover: () => 30, ringWidth: () => 20,
  borderWidth: () => 2, borderOpacity: () => 80, shadowDepth: () => 18, shadowSoftness: () => 40,
  shadowOpacity: () => 25, hoverLift: () => 10, hoverScale: () => 106, hoverShadow: () => 200,
  pressedScale: () => 92, transitionMs: () => 400,
};

/**
 * Часть параметров работает только внутри своего материала: размытие и
 * непрозрачность — под стеклом. Такой параметр и проверяется на своём
 * материале, а не на плотной подложке по умолчанию.
 */
const BASE_FOR: Partial<Record<keyof TileAppearance, TileAppearance>> = {
  blur: TILE_PRESETS.glass,
  fillOpacity: TILE_PRESETS.glass,
};

describe('tileAppearance', () => {
  it('содержит ровно пятнадцать готовых видов', () => {
    expect(PRESET_ORDER).toHaveLength(15);
    expect(new Set(PRESET_ORDER).size).toBe(15);
    PRESET_ORDER.forEach(id => expect(TILE_PRESETS[id].preset).toBe(id));
  });

  it('каждый готовый вид действительно отличается от остальных на экране', () => {
    const rendered = PRESET_ORDER.map(id => JSON.stringify(toTileVars(TILE_PRESETS[id])));
    expect(new Set(rendered).size).toBe(15);
  });

  // Главная гарантия: в разделе нет ни одного контрола без видимого действия.
  it.each(Object.keys(DEFAULT_TILE_APPEARANCE) as (keyof TileAppearance)[])(
    'параметр «%s» меняет стиль плитки',
    key => {
      const base = BASE_FOR[key] ?? DEFAULT_TILE_APPEARANCE;
      const before = toTileVars(base);
      const changed = { ...base, [key]: (OTHER[key] as (value: unknown) => unknown)(base[key]) };
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

  it('выключенная тень оставляет только кромку, а без кромки — ничего', () => {
    const bare = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none', ring: 0 });
    expect(bare['--nx-tile-shadow']).toBe('none');
    // Кромка живёт отдельно от тени: это она держит край карточки.
    const edged = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none', ring: 10, ringWidth: 10 });
    expect(edged['--nx-tile-shadow']).toBe('inset 0 0 0 1.0px rgba(var(--nx-ring-rgb), 0.100)');
    // Волосяная кромка: половина пикселя — то, чем эти системы и отличаются.
    const hair = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none', ring: 10, ringWidth: 5 });
    expect(hair['--nx-tile-shadow']).toContain('inset 0 0 0 0.5px');
  });

  it('кромка добавляется ко всем стилям тени, кроме рельефа', () => {
    for (const style of ['hairline', 'stack', 'drop', 'soft', 'material'] as const) {
      const vars = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: style, ring: 10, shadowDepth: 8 });
      expect(vars['--nx-tile-shadow']).toContain('inset 0 0 0 ');
    }
    // У рельефа две зеркальные тени, и кольцо с ними спорит.
    const relief = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'neumorph', ring: 10 });
    expect(relief['--nx-tile-shadow']).not.toContain('inset');
  });

  it('стопка вместо одной размытой тени даёт три смещения', () => {
    const stacked = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'stack', ring: 0, shadowDepth: 9 })['--nx-tile-shadow'];
    // Слои считаем по числу цветов: внутри rgba() тоже есть запятые.
    expect((stacked.match(/rgba\(/g) ?? []).length).toBe(3);
    // Одна размытая тень была бы одним слоем — именно от неё уходим.
    const single = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'drop', ring: 0 })['--nx-tile-shadow'];
    expect((single.match(/rgba\(/g) ?? []).length).toBe(2);
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

  // Стекло и рельеф вернулись как отдельные готовые виды, но вид по
  // умолчанию остаётся плотным: ни размытия, ни слоя состояния в нём нет.
  it('вид по умолчанию не включает ни размытия, ни слоя состояния', () => {
    expect(DEFAULT_TILE_APPEARANCE.surface).toBe('solid');
    expect(DEFAULT_TILE_APPEARANCE.blur).toBe(0);
    expect(DEFAULT_TILE_APPEARANCE.stateLayer).toBe(0);
    const vars = toTileVars(DEFAULT_TILE_APPEARANCE);
    expect(vars['--nx-tile-blur']).toBe('none');
    expect(vars['--nx-tile-state']).toBe('transparent');
  });

  it('размытие остаётся в пределах, на которых оно не роняет кадры', () => {
    const [min, max] = TILE_BOUNDS.blur;
    expect(min).toBe(0);
    expect(max).toBe(20);
    expect(normalizeTileAppearance({ blur: 60 }).blur).toBe(20);
    // У готового вида «Стекло» размытие в рекомендованной полосе 8–16 px.
    expect(TILE_PRESETS.glass.blur).toBeGreaterThanOrEqual(8);
    expect(TILE_PRESETS.glass.blur).toBeLessThanOrEqual(16);
  });

  it('мягкий рельеф не красит плитку, чтобы совпасть с фоном под ней', () => {
    const vars = toTileVars(TILE_PRESETS.neumorph);
    expect(vars['--nx-tile-bg']).toBe('transparent');
    // Две тени: сдвиги одной зеркальны другой.
    expect(vars['--nx-tile-shadow']).toMatch(/^9px 9px 18px .+, -9px -9px 18px /);
  });

  it('свечения и неона по-прежнему нет ни в одном виде', () => {
    const everything = JSON.stringify([
      DEFAULT_TILE_APPEARANCE,
      ...PRESET_ORDER.map(id => [TILE_PRESETS[id], toTileVars(TILE_PRESETS[id])]),
    ]);
    for (const forbidden of ['neon', 'saturate', 'glow', 'translucent']) {
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
    // Число из прежнего профиля переживает переезд и подрезается границами,
    // но остаётся бездействующим: подложка откатилась к плотной, а размывать
    // под ней нечего.
    expect(old.blur).toBe(18);
    expect(old.stateLayer).toBe(DEFAULT_TILE_APPEARANCE.stateLayer);
    expect(toTileVars(old)['--nx-tile-blur']).toBe('none');
  });

  it('усиливает тень под курсором ровно на заданную долю', () => {
    // При равных кромке и тени наведение ничего не меняет.
    const calm = toTileVars({ ...DEFAULT_TILE_APPEARANCE, hoverShadow: 100, ringHover: DEFAULT_TILE_APPEARANCE.ring });
    const strong = toTileVars({ ...DEFAULT_TILE_APPEARANCE, hoverShadow: 200 });
    expect(calm['--nx-tile-shadow-hover']).toBe(calm['--nx-tile-shadow']);

    // А кромка под курсором усиливается сама по себе, даже когда тень не растёт:
    // у «Ступени» тени нет вовсе, и вся реакция на наведение — в кромке.
    const edgeOnly = toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'hairline', hoverShadow: 100, ring: 10, ringHover: 20 });
    expect(edgeOnly['--nx-tile-shadow-hover']).not.toBe(edgeOnly['--nx-tile-shadow']);
    expect(edgeOnly['--nx-tile-shadow-hover']).toContain('0.200');
    expect(strong['--nx-tile-shadow-hover']).not.toBe(strong['--nx-tile-shadow']);
    // Выключенная тень остаётся выключенной и под курсором.
    expect(toTileVars({ ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none', ring: 0 })['--nx-tile-shadow-hover']).toBe('none');
  });
});

describe('размер под окно', () => {
  const base = DEFAULT_TILE_APPEARANCE;

  it('ширина колонки идёт от окна и не уходит дальше границ', () => {
    const vars = toTileVars({ ...base, width: 170, columns: 0 });
    expect(vars['--nx-tile-cols']).toBe('repeat(auto-fill,minmax(clamp(156px,14vw,255px),1fr))');
    expect(vars['--nx-tile-min-h']).toBe('max(148px,10vw)');
  });

  it('границы следуют за слайдером ширины', () => {
    expect(toTileVars({ ...base, width: 240, columns: 0 })['--nx-tile-cols'])
      .toContain('clamp(221px,14vw,360px)');
  });

  it('заданное число колонок сильнее подбора по окну', () => {
    expect(toTileVars({ ...base, columns: 4 })['--nx-tile-cols']).toBe('repeat(4,minmax(0,1fr))');
  });
});

describe('пропорция и прижатие сетки', () => {
  it('пропорция доходит до плитки, а прижатие — до сетки', () => {
    const square = toTileVars({ ...DEFAULT_TILE_APPEARANCE, ratio: '1/1', anchor: 'center' });
    expect(square['--nx-tile-ratio']).toBe('1/1');
    expect(square['--nx-grid-anchor']).toBe('center');
    const auto = toTileVars({ ...DEFAULT_TILE_APPEARANCE, ratio: 'auto', anchor: 'top' });
    expect(auto['--nx-tile-ratio']).toBe('auto');
    expect(auto['--nx-grid-anchor']).toBe('start');
  });

  it('по умолчанию ничего не навязывает: авто и верх', () => {
    expect(DEFAULT_TILE_APPEARANCE.ratio).toBe('auto');
    expect(DEFAULT_TILE_APPEARANCE.anchor).toBe('top');
  });

  it('чужие значения из хранилища приводятся к допустимым', () => {
    const restored = normalizeTileAppearance({ ratio: '16/9', anchor: 'bottom', markRadius: 999 });
    expect(restored.ratio).toBe('auto');
    expect(restored.anchor).toBe('top');
    expect(restored.markRadius).toBe(26);
  });
});
