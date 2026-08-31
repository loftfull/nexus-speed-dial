import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset, normalizeTileSettings } from './tilePresets.ts';

test('minimal preset hides secondary metadata and stays compact', () => {
  const preset = getTilePreset('minimal');
  assert.equal(preset.showSubtitle, false);
  assert.equal(preset.showDomain, false);
  assert.ok(preset.height < 150);
});

test('normalization clamps unsafe visual values', () => {
  const normalized = normalizeTileSettings({
    ...getTilePreset('standard'),
    blur: 99,
    glassOpacity: 0.1,
    radius: 99,
    hoverScale: 1.5,
  });
  assert.equal(normalized.blur, 28);
  assert.equal(normalized.glassOpacity, 0.42);
  assert.equal(normalized.radius, 30);
  assert.equal(normalized.hoverScale, 1.04);
});
