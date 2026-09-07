import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (relative: string) => readFile(new URL(relative, import.meta.url), 'utf8');

test('app shell has one workspace and no Dock navigation', async () => {
  const [app, shell] = await Promise.all([
    read('../App.tsx'),
    read('../components/shell/AppShell.tsx'),
  ]);
  assert.equal(shell.includes("../dock/Dock"), false);
  assert.equal(shell.includes('<Dock'), false);
  assert.equal(app.includes('SectionContent'), false);
  assert.equal(app.includes("section!=='home'"), false);
});

test('workspace header has one content mode control and no duplicate bookmark search/filter', async () => {
  const source = await read('../components/workspace/WorkspaceHeader.tsx');
  assert.equal(source.includes('bookmarkQuery'), false);
  assert.equal(source.includes('Фильтр по категории'), false);
  assert.equal(source.includes('searchWrap'), false);
  assert.match(source, /contentMode/);
  assert.match(source, /setContentMode/);
  assert.match(source, /setSettingsOpen/);
});

test('sidebar contains one category tree and no explorer/chip duplication or forecast', async () => {
  const source = await read('../components/sidebar/Sidebar.tsx');
  assert.equal(source.includes('ПРОВОДНИК'), false);
  assert.equal(source.includes('styles.chips'), false);
  assert.equal(source.includes('forecast'), false);
  assert.equal(source.includes('Pencil'), false);
  assert.match(source, /Пространства/i);
  assert.match(source, /Все сайты/);
});

test('omnibox does not imitate browser chrome', async () => {
  const source = await read('../components/omnibox/Omnibox.tsx');
  for (const forbidden of ['ChevronLeft', 'ChevronRight', 'Shield', 'profile']) {
    assert.equal(source.includes(forbidden), false, `Omnibox must not contain ${forbidden}`);
  }
});
