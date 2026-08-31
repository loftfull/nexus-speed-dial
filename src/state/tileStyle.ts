import type { TileAppearanceSettings } from '../domain/types.ts';

export type TileCssVariables = Record<`--tile-${string}`, string>;

function easingCurve(easing: TileAppearanceSettings['easing']): string {
  if (easing === 'soft') return 'cubic-bezier(.22,.61,.36,1)';
  if (easing === 'snappy') return 'cubic-bezier(.16,1,.3,1)';
  return 'cubic-bezier(.2,.8,.2,1)';
}

function focusRingWidth(style: TileAppearanceSettings['focusRingStyle']): string {
  if (style === 'minimal') return '1px';
  if (style === 'strong') return '3px';
  return '2px';
}

function tileBackground(settings: TileAppearanceSettings): string {
  if (settings.backgroundMode === 'transparent') return 'rgba(255,255,255,0)';
  if (settings.backgroundMode === 'tinted') return `rgba(235,244,255,${settings.glassOpacity})`;
  return `rgba(255,255,255,${settings.glassOpacity})`;
}

function iconSurface(settings: TileAppearanceSettings): { surface: string; shadow: string } {
  if (settings.iconTreatment === 'soft') return { surface: 'rgba(255,255,255,.72)', shadow: '0 8px 18px rgba(40,72,118,.12)' };
  return { surface: 'transparent', shadow: 'none' };
}

export function toTileCssVariables(settings: TileAppearanceSettings): TileCssVariables {
  const icon = iconSurface(settings);
  return {
    '--tile-width': `${settings.width}px`,
    '--tile-height': `${settings.height}px`,
    '--tile-gap': `${settings.gap}px`,
    '--tile-radius': `${settings.radius}px`,
    '--tile-icon-size': `${settings.iconSize}px`,
    '--tile-opacity': String(settings.glassOpacity),
    '--tile-background-mode': settings.backgroundMode,
    '--tile-background': tileBackground(settings),
    '--tile-icon-treatment': settings.iconTreatment,
    '--tile-icon-surface': icon.surface,
    '--tile-icon-shadow': icon.shadow,
    '--tile-blur': `${settings.blur}px`,
    '--tile-saturation': `${settings.saturation}%`,
    '--tile-border-opacity': settings.borderEnabled ? String(settings.borderOpacity) : '0',
    '--tile-border-highlight': settings.borderHighlight ? '1' : '0',
    '--tile-shadow-opacity': settings.shadowEnabled ? String(settings.shadowOpacity) : '0',
    '--tile-shadow-softness': `${settings.shadowSoftness}px`,
    '--tile-shadow-depth': `${settings.shadowDepth}px`,
    '--tile-hover-glow': settings.hoverGlow ? String(settings.hoverGlowIntensity) : '0',
    '--tile-selected-glow': String(settings.selectedGlowIntensity),
    '--tile-hover-lift': settings.hoverEnabled && !settings.reducedMotion ? `${-settings.hoverLift}px` : '0px',
    '--tile-hover-scale': settings.hoverEnabled && !settings.reducedMotion ? String(settings.hoverScale) : '1',
    '--tile-pressed-scale': settings.reducedMotion ? '1' : String(settings.pressedScale),
    '--tile-transition': settings.reducedMotion ? '0ms' : `${settings.transitionMs}ms`,
    '--tile-easing': easingCurve(settings.easing),
    '--tile-load-animation': settings.reducedMotion ? 'none' : settings.loadAnimation,
    '--tile-load-name': settings.reducedMotion || settings.loadAnimation === 'none' ? 'none' : settings.loadAnimation === 'rise' ? 'tile-rise' : 'tile-fade',
    '--tile-focus-ring-width': focusRingWidth(settings.focusRingStyle),
    '--tile-drag-feedback': settings.dragFeedback ? '1' : '0',
    '--tile-columns': settings.columns === 'auto' ? '5' : String(settings.columns),
    '--tile-label-align': settings.labelAlignment,
    '--tile-title-display': settings.showTitle ? 'block' : 'none',
    '--tile-subtitle-display': settings.showSubtitle ? 'block' : 'none',
    '--tile-domain-display': settings.showDomain ? 'block' : 'none',
    '--tile-category-display': settings.showCategory ? 'block' : 'none',
    '--tile-badge-display': settings.showBadge ? 'inline-block' : 'none',
  };
}

export function applyTileCssVariables(target: Pick<CSSStyleDeclaration, 'setProperty'>, settings: TileAppearanceSettings): void {
  for (const [name, value] of Object.entries(toTileCssVariables(settings))) target.setProperty(name, value);
}
