import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(root, relative) { return readFile(resolve(root, relative), 'utf8'); }
function add(checks, failures, name, pass, detail) { checks.push({ name, pass, detail }); if (!pass) failures.push(`${name}: ${detail}`); }

export async function runDataQa(root) {
  const checks = [];
  const failures = [];
  const [backup, store, dataControls, app, workspace, grid, siteTile, siteOrder, e2e] = await Promise.all([
    source(root, 'src/domain/backup.ts'),
    source(root, 'src/state/appStore.ts'),
    source(root, 'src/components/sections/DataControls.tsx'),
    source(root, 'src/App.tsx'),
    source(root, 'src/domain/workspace.ts'),
    source(root, 'src/components/tiles/SpeedDialGrid.tsx'),
    source(root, 'src/components/tiles/SiteTile.tsx'),
    source(root, 'src/domain/siteOrder.ts'),
    source(root, 'e2e/app-shell.spec.ts'),
  ]);

  add(checks, failures, 'backup-schema-v1-compatible', backup.includes("schema: 'nexus-speed-dial'") && backup.includes('version: 1') && backup.includes('parseBackup') && backup.includes("id: 'home'"), 'Backup must stay compatible with existing version-1 files');
  add(checks, failures, 'backup-import-safety', backup.includes('isSafeHttpUrl') && backup.includes('uniqueById'), 'Backup import must reject unsafe URLs and duplicate entity ids');
  add(checks, failures, 'backup-preserves-preferences', backup.includes('preferences?: UserPreferences') && backup.includes('isPreferences') && dataControls.includes('preferences') && dataControls.includes('restorePreferences'), 'Export/import must preserve new user preferences while accepting old backups');
  add(checks, failures, 'spaces-migrate-legacy-projects', store.includes("preferences: 'nexus.preferences'") && store.includes("spaces: 'nexus.spaces'") && store.includes("projects: 'nexus.projects'") && store.includes('normalizeSpaces(persistedSpaces ?? legacyProjects)'), 'Store must migrate legacy projects into canonical spaces without deleting data');
  add(checks, failures, 'navigation-persists-canonically', store.includes("navigation: 'nexus.navigation'") && ['activeSpaceId','activeCategoryId','contentMode','layoutMode'].every(token => store.includes(token)), 'Canonical navigation state must persist independently of deprecated UI adapters');
  add(checks, failures, 'destructive-structure-preserves-sites', store.includes("spaceId: 'home', projectId: 'home', categoryId: undefined") && store.includes("{ ...site, categoryId: undefined }"), 'Removing a space/category must relocate or detach sites instead of deleting them');
  add(checks, failures, 'recent-mode-uses-history', workspace.includes("mode === 'recent'") && workspace.includes('input.history') && siteTile.includes('recordVisit(site.id)'), 'Recent mode must derive from persisted visit history and site opens must record visits');
  add(checks, failures, 'canonical-site-order', workspace.includes('canonicalOrder') && grid.includes('reorderVisibleSites') && siteOrder.includes('visibleOrder') && siteOrder.includes('position'), 'All/category/favorites must share one canonical site order');
  add(checks, failures, 'legacy-notes-retained-not-navigable', store.includes("notes: 'nexus.notes'") && store.includes('normalizeNotes') && !app.includes('NotesSection') && !app.includes('SectionContent'), 'Legacy notes data must remain recoverable without returning as top-level navigation');
  add(checks, failures, 'backup-import-e2e', e2e.includes('backup import restores validated sites and user preferences') && e2e.includes('Данные восстановлены'), 'Playwright must exercise validated backup restore including preferences');
  add(checks, failures, 'site-add-persists-e2e', e2e.includes('site can be added and survives reload'), 'Playwright must verify actual Speed Dial data persistence');

  return { checks, failures };
}

async function main() {
  const result = await runDataQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) { console.error(`\nData QA failed (${result.failures.length})`); process.exitCode = 1; }
  else console.log(`\nData QA passed (${result.checks.length} checks)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
