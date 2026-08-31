import type { TileAppearanceSettings, TileSize } from '../../domain/types.ts';

export type SettingsTab = 'basic' | 'advanced' | 'motion';

export const settingsTabs: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'basic', label: 'Базовые' },
  { id: 'advanced', label: 'Расширенные' },
  { id: 'motion', label: 'Анимация' },
];

const sizeMap: Record<TileSize, Pick<TileAppearanceSettings, 'size' | 'width' | 'height' | 'iconSize'>> = {
  S: { size: 'S', width: 128, height: 132, iconSize: 48 },
  M: { size: 'M', width: 170, height: 180, iconSize: 58 },
  L: { size: 'L', width: 196, height: 206, iconSize: 66 },
  XL: { size: 'XL', width: 220, height: 224, iconSize: 74 },
};

export function getSizePatch(size: TileSize) {
  return { ...sizeMap[size] };
}

export const requiredKeysByTab: Record<SettingsTab, ReadonlyArray<keyof TileAppearanceSettings>> = {
  basic: ['preset', 'size', 'columns', 'width', 'height', 'gap', 'radius', 'iconSize', 'showTitle', 'showSubtitle', 'showDomain', 'showCategory', 'showBadge'],
  advanced: ['glassOpacity', 'blur', 'saturation', 'backgroundMode', 'iconTreatment', 'borderEnabled', 'borderOpacity', 'borderHighlight', 'shadowEnabled', 'shadowOpacity', 'shadowSoftness', 'shadowDepth', 'hoverGlow', 'hoverGlowIntensity', 'selectedGlowIntensity'],
  motion: ['hoverEnabled', 'hoverLift', 'hoverScale', 'pressedScale', 'transitionMs', 'easing', 'loadAnimation', 'focusRingStyle', 'dragFeedback', 'reducedMotion'],
};
