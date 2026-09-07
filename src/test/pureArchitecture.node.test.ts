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

test('workspace header has only the one content mode control', async () => {
  const source = await read('../components/workspace/WorkspaceHeader.tsx');
  for (const forbidden of ['bookmarkQuery', 'Фильтр по категории', 'searchWrap', 'setSettingsOpen', 'setViewMode']) {
    assert.equal(source.includes(forbidden), false, `duplicate workspace concern returned: ${forbidden}`);
  }
  assert.match(source, /contentMode/);
  assert.match(source, /setContentMode/);
  for (const label of ['Все', 'Избранное', 'Недавние']) assert.ok(source.includes(label));
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

test('store exposes no deprecated section/project navigation API', async () => {
  const [store, types, workspace] = await Promise.all([
    read('../state/appStore.ts'),
    read('../domain/types.ts'),
    read('../domain/workspace.ts'),
  ]);
  for (const forbidden of ['section: AppSection', 'workspaceTab:', 'activeProjectId:', 'bookmarkQuery:', 'setSection(', 'setWorkspaceTab(', 'setActiveProject(', "kind: 'project'"]) {
    assert.equal(store.includes(forbidden), false, `deprecated store API remains: ${forbidden}`);
  }
  for (const forbidden of ['AppSection', 'WorkspaceTab', 'ViewMode']) assert.equal(types.includes(`type ${forbidden}`), false, `deprecated domain type remains: ${forbidden}`);
  assert.equal(workspace.includes('LegacyWorkspaceSelectionInput'), false);
  assert.equal(workspace.includes('projectId: string;\n  categoryId'), false);
});
