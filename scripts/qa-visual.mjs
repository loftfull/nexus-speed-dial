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

export async function runVisualQa(root) {
  const checks = [];
  const failures = [];
  const [helpers, config, visual] = await Promise.all([
    source(root, 'e2e/helpers.ts'),
    source(root, 'playwright.config.ts'),
    source(root, 'e2e/visual.spec.ts'),
  ]);

  add(checks, failures, 'visual-fixed-clock', helpers.includes('page.clock.setFixedTime') && helpers.includes('2026-08-31T12:00:00+03:00'), 'Visual QA must freeze application time to an approved reference instant');
  add(checks, failures, 'visual-network-determinism', helpers.includes('mockWeather') && helpers.includes("page.route('https://www.google.com/s2/favicons**'") && helpers.includes('route.abort()'), 'Weather and favicon network dependencies must be deterministic in visual tests');
  add(checks, failures, 'visual-locale-timezone', config.includes("locale: 'ru-RU'") && config.includes("timezoneId: 'Europe/Minsk'") && config.includes("colorScheme: 'light'"), 'Visual QA must pin locale, timezone and light color scheme');
  const surfaces = ['desktop-main.png','desktop-tile-settings.png','tablet-main.png','mobile-main.png'];
  add(checks, failures, 'visual-approved-surfaces', surfaces.every(name => visual.includes(name)) && visual.includes("animations: 'disabled'"), 'Visual suite must retain four approved deterministic surfaces with animations disabled');
  add(checks, failures, 'visual-reset-before-capture', (visual.match(/resetApp\(page\)/g) ?? []).length >= 4, 'Every visual surface must reset deterministic local state before capture');

  return { checks, failures };
}

async function main() {
  const result = await runVisualQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) {
    console.error(`\nVisual contract QA failed (${result.failures.length})`);
    process.exitCode = 1;
  } else {
    console.log(`\nVisual contract QA passed (${result.checks.length} checks)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
