import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeSiteUrl } from '../components/sites/siteEditorModel.ts';

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8');

test('normalizes user URL safely', () => {
  assert.deepEqual(normalizeSiteUrl('openai.com'), { url:'https://openai.com/', domain:'openai.com' });
  assert.equal(normalizeSiteUrl('javascript:alert(1)'), null);
  assert.equal(normalizeSiteUrl('data:text/html,x'), null);
});

test('site editor owns data and location while destructive actions stay in tile menu', async () => {
  const [grid, tile, editor, css, app] = await Promise.all([
    read('src/components/tiles/SpeedDialGrid.tsx'),
    read('src/components/tiles/SiteTile.tsx'),
    read('src/components/sites/SiteEditor.tsx'),
    read('src/components/sites/SiteEditor.module.css'),
    read('src/App.tsx'),
  ]);
  assert.equal(grid.includes('seedSites'), false);
  assert.ok(grid.includes("setSiteEditor('new')"));
  assert.ok(tile.includes('setSiteEditor(site.id)'));
  assert.ok(editor.includes('addSite'));
  assert.ok(editor.includes('updateSite'));
  assert.ok(editor.includes('spaceId'));
  assert.ok(editor.includes('categoryId'));
  assert.equal(editor.includes('removeSite'), false);
  assert.equal(editor.includes('toggleFavorite'), false);
  assert.ok(tile.includes('removeSite'));
  assert.ok(tile.includes('toggleFavorite'));
  assert.equal(editor.includes('localStorage'), false);
  assert.match(css, /position\s*:\s*fixed/);
  assert.ok(app.includes('<SiteEditor'));
});
