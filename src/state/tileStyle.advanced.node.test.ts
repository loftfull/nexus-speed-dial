import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset } from '../domain/tilePresets.ts';
import type { TileAppearanceSettings } from '../domain/types.ts';
import { toTileCssVariables } from './tileStyle.ts';

test('maps expanded glass appearance controls into the shared CSS contract', () => {
  const settings: TileAppearanceSettings = {
    ...getTilePreset('standard'),
    saturation: 132,
    backgroundMode: 'tinted',
    iconTreatment: 'soft',
    borderHighlight: true,
    shadowSoftness: 28,
  };
  const vars = toTileCssVariables(settings);
  assert.equal(vars['--tile-saturation'], '132%');
  assert.equal(vars['--tile-background-mode'], 'tinted');
  assert.equal(vars['--tile-icon-treatment'], 'soft');
  assert.equal(vars['--tile-border-highlight'], '1');
  assert.equal(vars['--tile-shadow-softness'], '28px');
});
