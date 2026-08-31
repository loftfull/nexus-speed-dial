import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset } from '../domain/tilePresets.ts';
import { toTileCssVariables } from './tileStyle.ts';

test('maps motion, focus and drag feedback into the shared tile contract', () => {
  const vars = toTileCssVariables({ ...getTilePreset('standard'), easing: 'snappy', loadAnimation: 'rise', focusRingStyle: 'strong', dragFeedback: false } as any);
  assert.equal(vars['--tile-easing'], 'cubic-bezier(.16,1,.3,1)');
  assert.equal(vars['--tile-load-animation'], 'rise');
  assert.equal(vars['--tile-focus-ring-width'], '3px');
  assert.equal(vars['--tile-drag-feedback'], '0');
});
