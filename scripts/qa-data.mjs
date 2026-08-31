import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(root, relative) {
  return readFile(resolve(root, relative), 'utf8');
}

function add(checks, failures, name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) failures.push(`${name}: ${detail}`);
}

export async function runDataQa(root) {
  const checks = [];
  const failures = [];
  const [backup, store, dataControls, sections, dock, e2e] = await Promise.all([
    source(root, 'src/domain/backup.ts'),
    source(root, 'src/state/appStore.ts'),
    source(root, 'src/components/sections/DataControls.tsx'),
    source(root, 'src/components/sections/SectionContent.tsx'),
    source(root, 'src/components/dock/Dock.tsx'),
    source(root, 'e2e/app-shell.spec.ts'),
  ]);

  add(checks, failures, 'backup-schema-v1', backup.includes("schema: 'nexus-speed-dial'") && backup.includes('version: 1') && backup.includes('parseBackup') && backup.includes("id: 'home'"), 'Backup must remain versioned, validated and able to repair the required home project');
  add(checks, failures, 'backup-store-restore', store.includes('restoreBackup(snapshot: BackupSnapshot)') && ['KEYS.tiles','KEYS.projects','KEYS.categories','KEYS.sites','KEYS.history','KEYS.notes','KEYS.weatherLocation'].every(token => store.includes(token)), 'Restore must replace all persisted Nexus data through the store boundary');
  add(checks, failures, 'data-controls-versioned-model', ['createBackup','parseBackup','restoreBackup','data-controls'].every(token => dataControls.includes(token)), 'Settings data controls must use the versioned backup model and store restore action');
  add(checks, failures, 'no-demo-downloads', !sections.includes('seedDownloads') && sections.includes('Загрузок пока нет'), 'Downloads must not present invented files before a real download pipeline exists');
  add(checks, failures, 'settings-dock-does-not-force-tile-panel', !dock.includes('setSettingsOpen') && !dock.includes('openSettings'), 'Dock Settings must open the Settings section only; Tile Settings are a separate explicit action');
  add(checks, failures, 'backup-import-e2e', e2e.includes('backup import restores validated Nexus data') && e2e.includes('Данные восстановлены'), 'Playwright interaction suite must exercise validated backup restore');

  return { checks, failures };
}

async function main() {
  const result = await runDataQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) {
    console.error(`\nData QA failed (${result.failures.length})`);
    process.exitCode = 1;
  } else {
    console.log(`\nData QA passed (${result.checks.length} checks)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
