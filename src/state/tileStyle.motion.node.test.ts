import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset } from '../domain/tilePresets.ts';
import type { TileAppearanceSettings } from '../domain/types.ts';
import { toTileCssVariables } from './tileStyle.ts';

test('maps motion, focus and drag feedback into the shared tile contract', () => {
  const settings: TileAppearanceSettings = {
    ...getTilePreset('standard'),
    easing: 'snappy',
    loadAnimation: 'rise',
    focusRingStyle: 'strong',
    dragFeedback: false,
  };
  const vars = toTileCssVariables(settings);
  assert.equal(vars['--tile-easing'], 'cubic-bezier(.16,1,.3,1)');
  assert.equal(vars['--tile-load-animation'], 'rise');
  assert.equal(vars['--tile-focus-ring-width'], '3px');
  assert.equal(vars['--tile-drag-feedback'], '0');
});
