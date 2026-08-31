import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTileState } from './tileInteraction.ts';

test('tile interaction state machine covers press, focus and drag states', () => {
  assert.equal(nextTileState('normal', 'pointer-down'), 'pressed');
  assert.equal(nextTileState('pressed', 'pointer-up'), 'normal');
  assert.equal(nextTileState('normal', 'focus'), 'focus-visible');
  assert.equal(nextTileState('focus-visible', 'blur'), 'normal');
  assert.equal(nextTileState('normal', 'drag-start'), 'dragging');
  assert.equal(nextTileState('normal', 'drag-enter'), 'drop-target');
  assert.equal(nextTileState('drop-target', 'drag-leave'), 'normal');
  assert.equal(nextTileState('dragging', 'drag-end', true), 'selected');
});
