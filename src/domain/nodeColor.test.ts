import { describe, expect, it } from 'vitest';
import { NODE_PALETTE, categoryColor, groupColor, paletteIndex, projectColor } from './nodeColor';

describe('nodeColor', () => {
  it('keeps the colour a project already carries', () => {
    expect(projectColor({ id: 'project-home', color: '#3988ee' })).toBe('#3988ee');
  });

  it('falls back to the palette when the stored colour is not a hex value', () => {
    expect(NODE_PALETTE).toContain(projectColor({ id: 'project-home', color: 'синий' }));
  });

  it('gives the same category the same colour every time', () => {
    expect(categoryColor({ id: 'cat-work-dev' })).toBe(categoryColor({ id: 'cat-work-dev' }));
  });

  it('separates neighbouring identifiers', () => {
    expect(categoryColor({ id: 'cat-a' })).not.toBe(categoryColor({ id: 'cat-b' }));
  });

  it('keeps the index inside the palette', () => {
    expect(paletteIndex('')).toBe(0);
    expect(paletteIndex('a-very-long-category-identifier')).toBeLessThan(NODE_PALETTE.length);
  });

  it('colours groups from the same palette', () => {
    expect(NODE_PALETTE).toContain(groupColor({ id: 'grp-social-video' }));
  });
});
