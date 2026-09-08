import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(root, relative) { return readFile(resolve(root, relative), 'utf8'); }
function add(checks, failures, name, pass, detail) { checks.push({ name, pass, detail }); if (!pass) failures.push(`${name}: ${detail}`); }

export async function runVisualQa(root) {
  const checks = [];
  const failures = [];
  const [helpers, config, visual, e2e, tileCss, grid, sidebar, sidebarCss, mobileNav, mobileCss, workspace, workspaceCss, omnibox, omniboxCss, settings, settingsCss, prefBridge, globalCss, shell, siteEditorCss, structureEditorCss, weatherCss] = await Promise.all([
    source(root, 'e2e/helpers.ts'),
    source(root, 'playwright.config.ts'),
    source(root, 'e2e/visual.spec.ts'),
    source(root, 'e2e/app-shell.spec.ts'),
    source(root, 'src/components/tiles/SiteTile.module.css'),
    source(root, 'src/components/tiles/SpeedDialGrid.tsx'),
    source(root, 'src/components/sidebar/Sidebar.tsx'),
    source(root, 'src/components/sidebar/Sidebar.module.css'),
    source(root, 'src/components/sidebar/MobileNavigation.tsx'),
    source(root, 'src/components/sidebar/MobileNavigation.module.css'),
    source(root, 'src/components/workspace/WorkspaceHeader.tsx'),
    source(root, 'src/components/workspace/WorkspaceHeader.module.css'),
    source(root, 'src/components/omnibox/Omnibox.tsx'),
    source(root, 'src/components/omnibox/Omnibox.module.css'),
    source(root, 'src/components/settings/TileSettingsPanel.tsx'),
    source(root, 'src/components/settings/TileSettingsPanel.module.css'),
    source(root, 'src/state/PreferencesBridge.tsx'),
    source(root, 'src/styles/global.css'),
    source(root, 'src/components/shell/AppShell.tsx'),
    source(root, 'src/components/sites/SiteEditor.module.css'),
    source(root, 'src/components/structure/StructureEditor.module.css'),
    source(root, 'src/components/weather/WeatherPopover.module.css'),
  ]);

  add(checks, failures, 'visual-fixed-clock', helpers.includes('page.clock.setFixedTime') && helpers.includes('2026-08-31T12:00:00+03:00'), 'Visual QA must freeze time to the reference instant');
  add(checks, failures, 'visual-network-determinism', helpers.includes('mockWeather') && helpers.includes("page.route('https://www.google.com/s2/favicons**'") && helpers.includes('route.abort()'), 'Weather and favicon dependencies must be deterministic');
  add(checks, failures, 'visual-locale-timezone', config.includes("locale: 'ru-RU'") && config.includes("timezoneId: 'Europe/Minsk'") && config.includes("colorScheme: 'light'"), 'Visual QA must pin locale, timezone and light scheme');
  const surfaces = ['desktop-main.png','desktop-settings.png','tablet-main.png','mobile-main.png','mobile-navigation.png'];
  add(checks, failures, 'visual-approved-surfaces', surfaces.every(name => visual.includes(name)) && visual.includes("animations: 'disabled'"), 'Visual suite must cover five Pure Speed Dial surfaces');
  add(checks, failures, 'visual-reset-before-capture', (visual.match(/resetApp\(page\)/g) ?? []).length >= 5, 'Every visual surface must reset deterministic local state');

  add(checks, failures, 'visual-no-dock', !shell.includes('../dock/Dock') && !shell.includes('<Dock'), 'The obsolete bottom Dock must never reappear visually');
  add(checks, failures, 'workspace-no-default-selection', !grid.includes('selected={index === 0}') && !grid.includes('selected={index===0}'), 'The first tile must not look selected by default');
  add(checks, failures, 'tile-depth-live-engine', ['var(--tile-shadow-depth','var(--tile-shadow-softness','var(--tile-shadow-opacity'].every(token => tileCss.includes(token)), 'Tile hover/selected depth must come from canonical CSS variables');
  add(checks, failures, 'tile-menu-is-secondary', tileCss.includes('.menu') && tileCss.includes('.contextMenu') && tileCss.includes('.menuWrap'), 'Secondary tile actions must render as one compact context menu');
  add(checks, failures, 'sidebar-is-navigation-not-dashboard', sidebar.includes('ПРОСТРАНСТВА') && sidebar.includes('КАТЕГОРИИ') && sidebar.includes('utilityWeather') && !sidebar.includes('forecast') && !sidebar.includes('clockCard') && !sidebar.includes('styles.chips'), 'Sidebar must visually prioritize spaces/categories and compact utilities');
  add(checks, failures, 'sidebar-hover-actions', sidebarCss.includes('.more') && sidebarCss.includes('opacity:0') && sidebarCss.includes(':focus-within'), 'Structure edit controls must stay hidden until hover/focus');
  add(checks, failures, 'mobile-one-drawer', mobileNav.includes('Пространства и категории') && mobileNav.includes('Все сайты') && mobileCss.includes('.drawer') && mobileCss.includes('.layer'), 'Mobile must use one drawer for spaces/categories');
  add(checks, failures, 'mobile-calendar-entrypoint', mobileNav.includes('Открыть календарь') && mobileNav.includes('data-calendar-trigger') && e2e.includes('mobile status opens and closes the shared calendar'), 'Mobile status must open the shared calendar overlay');
  add(checks, failures, 'workspace-mode-density', ['Все','Избранное','Недавние'].every(label => workspace.includes(label)) && workspaceCss.includes('@media(max-width:760px)'), 'All/Favorites/Recent must remain a compact responsive segmented control');
  add(checks, failures, 'omnibox-single-surface', omnibox.includes('Найти сайт или ввести адрес') && !omnibox.includes('ArrowLeft') && !omnibox.includes('Shield') && omniboxCss.includes('.tools'), 'Top chrome must be one Omnibox plus Grid/List/Settings only');
  add(checks, failures, 'settings-side-sheet', settings.includes('Настройки Nexus') && settingsCss.includes('.layer') && settingsCss.includes('position:absolute') && !settings.includes('TilePreview'), 'Settings must render as one overlay side-sheet without developer preview controls');
  add(checks, failures, 'preferences-live-visuals', ['dataset.theme','dataset.density','dataset.background','dataset.glass'].every(token => prefBridge.includes(token)) && ["data-theme='dark'","data-background='contrast'","data-density='compact'","data-glass='strong'"].every(token => globalCss.includes(token)), 'Theme/background/density/glass preferences must alter live visuals');
  add(checks, failures, 'mobile-overlays-scroll-safely', [siteEditorCss, structureEditorCss, weatherCss].every(css => css.includes('@media(max-width:760px)') && css.includes('max-height:') && css.includes('overflow:auto')), 'Mobile editors/weather must remain scrollable with reduced viewport height');

  return { checks, failures };
}

async function main() {
  const result = await runVisualQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) { console.error(`\nVisual contract QA failed (${result.failures.length})`); process.exitCode = 1; }
  else console.log(`\nVisual contract QA passed (${result.checks.length} checks)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
