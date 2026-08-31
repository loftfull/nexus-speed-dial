import test from 'node:test';
import assert from 'node:assert/strict';
import { runReferenceQa } from './qa-reference.mjs';

test('approved Nexus reference invariants remain intact', async () => {
  const result = await runReferenceQa(process.cwd());
  assert.deepEqual(result.failures, []);
  const names = result.checks.map(check => check.name);
  for (const required of [
    'calendar-not-in-layout',
    'single-style-bridge',
    'mobile-navigation-drawer',
    'settings-three-tabs',
    'dock-section-screens',
    'live-weather-single-source',
    'persistent-history-notes',
    'functional-omnibox',
    'interaction-e2e',
    'visual-surfaces',
    'full-ci-gate',
  ]) {
    assert.ok(names.includes(required), `missing reference check: ${required}`);
  }
  assert.ok(result.checks.length >= 20, `expected broad reference coverage, received ${result.checks.length}`);
});
