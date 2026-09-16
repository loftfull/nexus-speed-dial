import { describe, expect, it } from 'vitest';
import { applyTileStyle } from './tileStyleBridge';

describe('tile style bridge', () => {
  it('writes canonical dataset and CSS variables', () => {
    const root = document.createElement('html');
    applyTileStyle({ mode: 'preview', preset: 'aurora', density: 18, radius: 22 }, root);
    expect(root.dataset.tileMode).toBe('preview');
    expect(root.dataset.tilePreset).toBe('aurora');
    expect(root.style.getPropertyValue('--tile-gap')).toBe('18px');
    expect(root.style.getPropertyValue('--tile-radius')).toBe('22px');
  });
  it('clamps unsafe visual values', () => {
    const root = document.createElement('html');
    applyTileStyle({ mode: 'standard', preset: 'soft', density: 1, radius: 1 }, root);
    expect(root.style.getPropertyValue('--tile-gap')).toBe('4px');
    expect(root.style.getPropertyValue('--tile-radius')).toBe('8px');
  });
});
