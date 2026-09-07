import test from 'node:test';
import assert from 'node:assert/strict';
import { getSizePatch } from './tileSettingsPanelModel.ts';

test('size presets update geometry as one coherent patch', () => {
  assert.deepEqual(getSizePatch('S'), { size: 'S', width: 128, height: 132, iconSize: 48 });
  assert.deepEqual(getSizePatch('M'), { size: 'M', width: 170, height: 180, iconSize: 58 });
  assert.deepEqual(getSizePatch('L'), { size: 'L', width: 196, height: 206, iconSize: 66 });
  assert.deepEqual(getSizePatch('XL'), { size: 'XL', width: 220, height: 224, iconSize: 74 });
});
