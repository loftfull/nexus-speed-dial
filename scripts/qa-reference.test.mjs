import test from 'node:test';
import assert from 'node:assert/strict';
import { runReferenceQa } from './qa-reference.mjs';

test('approved Pure Speed Dial invariants remain intact', async () => {
  const result = await runReferenceQa(process.cwd());
  assert.deepEqual(result.failures, []);
  const names = result.checks.map(check => check.name);
  for (const required of [
    'pure-one-screen-app',
    'no-dock-navigation',
    'canonical-space-model',
    'space-scoped-workspace',
    'single-category-tree',
    'single-omnibox',
    'user-settings-only',
    'preferences-are-live',
    'canonical-drag-order',
    'mobile-shared-mental-model',
    'interaction-e2e',
    'visual-surfaces',
    'full-ci-gate',
  ]) {
    assert.ok(names.includes(required), `missing reference check: ${required}`);
  }
  assert.ok(result.checks.length >= 24, `expected broad Pure Speed Dial coverage, received ${result.checks.length}`);
});
