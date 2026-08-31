import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset, normalizeTileSettings } from './tilePresets.ts';

test('minimal preset hides secondary metadata and stays compact', () => { const p=getTilePreset('minimal'); assert.equal(p.showSubtitle,false); assert.equal(p.showDomain,false); assert.ok(p.height<150); });
test('normalization clamps unsafe visual values', () => { const p=normalizeTileSettings({...getTilePreset('standard'),blur:99,glassOpacity:.1,radius:99,hoverScale:1.5}); assert.equal(p.blur,28); assert.equal(p.glassOpacity,.42); assert.equal(p.radius,30); assert.equal(p.hoverScale,1.04); });
