import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset } from '../domain/tilePresets.ts';
import { toTileCssVariables } from './tileStyle.ts';

test('maps canonical tile settings to CSS custom properties', () => {
  const vars = toTileCssVariables({ ...getTilePreset('standard'), blur: 24, radius: 22 });
  assert.equal(vars['--tile-blur'], '24px');
  assert.equal(vars['--tile-radius'], '22px');
  assert.equal(vars['--tile-transition'], '200ms');
  assert.equal(vars['--tile-hover-lift'], '-3px');
  assert.equal(vars['--tile-columns'], '5');
});

test('reduced motion disables non-essential transforms and transitions', () => {
  const vars = toTileCssVariables({ ...getTilePreset('standard'), reducedMotion: true });
  assert.equal(vars['--tile-transition'], '0ms');
  assert.equal(vars['--tile-hover-lift'], '0px');
  assert.equal(vars['--tile-hover-scale'], '1');
  assert.equal(vars['--tile-pressed-scale'], '1');
});
