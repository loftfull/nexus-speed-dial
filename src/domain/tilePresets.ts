import type { TileAppearanceSettings, TilePreset } from './types.ts';

export const tileBounds = {
  width: [112, 260], height: [76, 240], gap: [8, 32], radius: [10, 30], iconSize: [32, 84],
  glassOpacity: [0.42, 0.86], blur: [8, 28], saturation: [100, 140], borderOpacity: [0, 0.8],
  shadowOpacity: [0, 0.18], hoverGlowIntensity: [0, 0.24], selectedGlowIntensity: [0, 0.30],
  hoverLift: [0, 6], hoverScale: [1, 1.04], pressedScale: [0.94, 1], transitionMs: [80, 400],
} as const;

const base: Omit<TileAppearanceSettings, 'preset' | 'size' | 'width' | 'height' | 'iconSize' | 'showSubtitle' | 'showDomain'> = {
  columns: 5, gap: 18, radius: 20, showTitle: true, showCategory: false, showBadge: true,
  glassOpacity: 0.68, blur: 18, saturation: 122, borderOpacity: 0.6,
  shadowEnabled: true, shadowOpacity: 0.08, hoverGlow: true, hoverGlowIntensity: 0.08,
  selectedGlowIntensity: 0.14, hoverEnabled: true, hoverLift: 3, hoverScale: 1.015,
  pressedScale: 0.97, transitionMs: 200, easing: 'standard', reducedMotion: false,
};

const presets: Record<TilePreset, TileAppearanceSettings> = {
  minimal: { ...base, preset: 'minimal', size: 'S', width: 128, height: 128, iconSize: 48, showSubtitle: false, showDomain: false, gap: 14 },
  standard: { ...base, preset: 'standard', size: 'M', width: 170, height: 180, iconSize: 58, showSubtitle: true, showDomain: false },
  expanded: { ...base, preset: 'expanded', size: 'L', width: 188, height: 204, iconSize: 64, showSubtitle: true, showDomain: true },
  large: { ...base, preset: 'large', size: 'XL', width: 220, height: 224, iconSize: 74, showSubtitle: true, showDomain: true, gap: 20 },
  list: { ...base, preset: 'list', size: 'M', width: 260, height: 76, iconSize: 40, showSubtitle: false, showDomain: true, gap: 10, columns: 1 },
};

function clamp(value: number, [min, max]: readonly [number, number]) {
  return Math.min(max, Math.max(min, value));
}

export function getTilePreset(preset: TilePreset): TileAppearanceSettings {
  return { ...presets[preset] };
}

export function normalizeTileSettings(settings: TileAppearanceSettings): TileAppearanceSettings {
  return {
    ...settings,
    columns: settings.columns === 'auto' ? 'auto' : Math.round(clamp(Number(settings.columns), [2, 8])),
    width: clamp(settings.width, tileBounds.width), height: clamp(settings.height, tileBounds.height),
    gap: clamp(settings.gap, tileBounds.gap), radius: clamp(settings.radius, tileBounds.radius),
    iconSize: clamp(settings.iconSize, tileBounds.iconSize), glassOpacity: clamp(settings.glassOpacity, tileBounds.glassOpacity),
    blur: clamp(settings.blur, tileBounds.blur), saturation: clamp(settings.saturation, tileBounds.saturation),
    borderOpacity: clamp(settings.borderOpacity, tileBounds.borderOpacity), shadowOpacity: clamp(settings.shadowOpacity, tileBounds.shadowOpacity),
    hoverGlowIntensity: clamp(settings.hoverGlowIntensity, tileBounds.hoverGlowIntensity), selectedGlowIntensity: clamp(settings.selectedGlowIntensity, tileBounds.selectedGlowIntensity),
    hoverLift: clamp(settings.hoverLift, tileBounds.hoverLift), hoverScale: clamp(settings.hoverScale, tileBounds.hoverScale),
    pressedScale: clamp(settings.pressedScale, tileBounds.pressedScale), transitionMs: clamp(settings.transitionMs, tileBounds.transitionMs),
  };
}
