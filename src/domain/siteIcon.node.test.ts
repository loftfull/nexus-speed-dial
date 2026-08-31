import test from 'node:test';
import assert from 'node:assert/strict';
import { faviconUrlFor } from './siteIcon.ts';

test('builds a deterministic high-resolution favicon URL from a site URL', () => {
  const url = faviconUrlFor('https://github.com');
  assert.match(url, /^https:\/\/www\.google\.com\/s2\/favicons\?/);
  assert.ok(url.includes('sz=128'));
  assert.ok(url.includes(encodeURIComponent('https://github.com')));
});
