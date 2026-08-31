import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.isFile() && entry.name.endsWith('.node.test.ts')) files.push(path);
  }
  return files;
}

const files = (await collect(resolve(process.cwd(), 'src'))).sort();
if (files.length === 0) {
  console.error('No *.node.test.ts files found under src');
  process.exit(1);
}

console.log(`Running ${files.length} dependency-free Node contract tests`);
const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
