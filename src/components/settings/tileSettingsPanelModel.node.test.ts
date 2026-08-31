import test from 'node:test';
import assert from 'node:assert/strict';
import { getSizePatch, settingsTabs, requiredKeysByTab } from './tileSettingsPanelModel.ts';

test('settings panel exposes the three implementation tabs', () => {
  assert.deepEqual(settingsTabs.map(tab => tab.id), ['basic', 'advanced', 'motion']);
});

test('size presets update geometry as one coherent patch', () => {
  assert.deepEqual(getSizePatch('XL'), { size: 'XL', width: 220, height: 224, iconSize: 74 });
});

test('advanced and motion tabs cover the approved visual controls', () => {
  assert.ok(requiredKeysByTab.advanced.includes('backgroundMode'));
  assert.ok(requiredKeysByTab.advanced.includes('shadowSoftness'));
  assert.ok(requiredKeysByTab.motion.includes('focusRingStyle'));
  assert.ok(requiredKeysByTab.motion.includes('dragFeedback'));
});
