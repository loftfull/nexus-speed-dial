import test from 'node:test';
import assert from 'node:assert/strict';
import { runReferenceQa } from './qa-reference.mjs';

test('approved Nexus reference invariants remain intact', async () => {
  const result = await runReferenceQa(process.cwd());
  assert.deepEqual(result.failures, []);
  assert.ok(result.checks.length >= 7);
});
