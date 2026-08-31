import test from 'node:test';
import assert from 'node:assert/strict';
import { getTilePreset } from '../domain/tilePresets.ts';
import { toTileCssVariables } from './tileStyle.ts';

test('maps tile content visibility to the shared CSS contract', () => {
  const vars = toTileCssVariables({ ...getTilePreset('standard'), showTitle: false, showSubtitle: true, showDomain: true, showCategory: true, showBadge: false });
  assert.equal(vars['--tile-title-display'], 'none');
  assert.equal(vars['--tile-subtitle-display'], 'block');
  assert.equal(vars['--tile-domain-display'], 'block');
  assert.equal(vars['--tile-category-display'], 'block');
  assert.equal(vars['--tile-badge-display'], 'none');
});
