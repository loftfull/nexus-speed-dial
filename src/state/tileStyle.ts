import type { TileAppearanceSettings } from '../domain/types.ts';

export type TileCssVariables = Record<`--tile-${string}`, string>;
export function toTileCssVariables(settings: TileAppearanceSettings): TileCssVariables {
  return {
    '--tile-width': `${settings.width}px`, '--tile-height': `${settings.height}px`, '--tile-gap': `${settings.gap}px`, '--tile-radius': `${settings.radius}px`,
    '--tile-icon-size': `${settings.iconSize}px`, '--tile-opacity': String(settings.glassOpacity), '--tile-blur': `${settings.blur}px`, '--tile-saturation': `${settings.saturation}%`,
    '--tile-border-opacity': String(settings.borderOpacity), '--tile-shadow-opacity': settings.shadowEnabled ? String(settings.shadowOpacity) : '0',
    '--tile-hover-glow': settings.hoverGlow ? String(settings.hoverGlowIntensity) : '0', '--tile-selected-glow': String(settings.selectedGlowIntensity),
    '--tile-hover-lift': settings.hoverEnabled && !settings.reducedMotion ? `${-settings.hoverLift}px` : '0px', '--tile-hover-scale': settings.hoverEnabled && !settings.reducedMotion ? String(settings.hoverScale) : '1',
    '--tile-pressed-scale': settings.reducedMotion ? '1' : String(settings.pressedScale), '--tile-transition': settings.reducedMotion ? '0ms' : `${settings.transitionMs}ms`,
    '--tile-columns': settings.columns === 'auto' ? '5' : String(settings.columns),
  };
}
export function applyTileCssVariables(target: Pick<CSSStyleDeclaration, 'setProperty'>, settings: TileAppearanceSettings): void {
  for (const [name, value] of Object.entries(toTileCssVariables(settings))) target.setProperty(name, value);
}
