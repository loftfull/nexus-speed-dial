import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('settings exposes only the four Pure Speed Dial user sections', async () => {
  const source = await read('./TileSettingsPanel.tsx');
  for (const section of ['Внешний вид', 'Плитки', 'Поиск', 'Данные']) {
    assert.equal(source.includes(section), true, `missing settings section: ${section}`);
  }
  for (const forbidden of ['AdvancedSettings', 'MotionSettings', 'TilePreview', 'Hover glow', 'Selected glow']) {
    assert.equal(source.includes(forbidden), false, `developer control leaked into user settings: ${forbidden}`);
  }
});

test('settings binds user preferences instead of decorative controls', async () => {
  const source = await read('./TileSettingsPanel.tsx');
  for (const key of ['theme', 'density', 'background', 'glassStrength', 'searchEngine', 'globalSiteSearch', 'omniboxSuggestions']) {
    assert.equal(source.includes(key), true, `preference is not exposed: ${key}`);
  }
  assert.equal(source.includes('DataControls'), true);
  assert.equal(source.includes('clearHistory'), true);
  assert.equal(source.includes('resetPreferences'), true);
});
