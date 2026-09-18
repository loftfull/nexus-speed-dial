import { describe, expect, it } from 'vitest';
import { brandPlate, hashHue, luminance, markPalette, toRgb } from './markPalette';

describe('markPalette', () => {
  it('переводит короткую и длинную запись цвета', () => {
    expect(toRgb('#fff')).toEqual([255, 255, 255]);
    expect(toRgb('F24E1E')).toEqual([242, 78, 30]);
    expect(toRgb('не цвет')).toBeNull();
  });

  it('считает яркость по краям шкалы', () => {
    expect(luminance([0, 0, 0])).toBe(0);
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 5);
  });

  it('даёт один и тот же оттенок одному домену', () => {
    expect(hashHue('figma.com')).toBe(hashHue('figma.com'));
    expect(hashHue('figma.com')).not.toBe(hashHue('spotify.com'));
    expect(hashHue('')).toBeGreaterThanOrEqual(0);
  });

  it('строит градиент из выбранного цвета сайта', () => {
    const palette = markPalette('figma.com', '#f24e1e');
    expect(palette.from).not.toBe(palette.to);
    expect(palette.ink).toBe('#ffffff');
  });

  it('берёт тёмную букву на светлой подложке', () => {
    expect(markPalette('example.com', '#ffe066').ink).toBe('rgba(16,22,32,.86)');
  });

  it('выводит оттенок из домена, когда цвет не задан', () => {
    const first = markPalette('example.com');
    const second = markPalette('example.com');
    const other = markPalette('another.com');
    expect(first).toEqual(second);
    expect(first.from).not.toBe(other.from);
  });

  it('под фирменный знак делает светлую подложку того же цвета', () => {
    const plate = brandPlate('#FF0000');
    expect(plate.from).toContain('color-mix');
    expect(plate.from).toContain('255,0,0');
  });
});
