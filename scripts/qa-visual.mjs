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
  const [helpers, config, visual, e2e, tileCss, dockCss, previewCss, sidebar, mobileNav, navigationIcon, workspace, workspaceCss, omnibox, siteEditorCss, structureEditorCss, weatherCss] = await Promise.all([
    source(root, 'e2e/helpers.ts'),
    source(root, 'playwright.config.ts'),
    source(root, 'e2e/visual.spec.ts'),
    source(root, 'e2e/app-shell.spec.ts'),
    source(root, 'src/components/tiles/SiteTile.module.css'),
    source(root, 'src/components/dock/Dock.module.css'),
    source(root, 'src/components/settings/TilePreview.module.css'),
    source(root, 'src/components/sidebar/Sidebar.tsx'),
    source(root, 'src/components/sidebar/MobileNavigation.tsx'),
    source(root, 'src/domain/navigationIcon.ts'),
    source(root, 'src/components/workspace/WorkspaceHeader.tsx'),
    source(root, 'src/components/workspace/WorkspaceHeader.module.css'),
    source(root, 'src/components/omnibox/Omnibox.tsx'),
    source(root, 'src/components/sites/SiteEditor.module.css'),
    source(root, 'src/components/structure/StructureEditor.module.css'),
    source(root, 'src/components/weather/WeatherPopover.module.css'),
  ]);

  add(checks, failures, 'visual-fixed-clock', helpers.includes('page.clock.setFixedTime') && helpers.includes('2026-08-31T12:00:00+03:00'), 'Visual QA must freeze application time to an approved reference instant');
  add(checks, failures, 'visual-network-determinism', helpers.includes('mockWeather') && helpers.includes("page.route('https://www.google.com/s2/favicons**'") && helpers.includes('route.abort()'), 'Weather and favicon network dependencies must be deterministic in visual tests');
  add(checks, failures, 'visual-locale-timezone', config.includes("locale: 'ru-RU'") && config.includes("timezoneId: 'Europe/Minsk'") && config.includes("colorScheme: 'light'"), 'Visual QA must pin locale, timezone and light color scheme');
  const surfaces = ['desktop-main.png','desktop-tile-settings.png','tablet-main.png','mobile-main.png'];
  add(checks, failures, 'visual-approved-surfaces', surfaces.every(name => visual.includes(name)) && visual.includes("animations: 'disabled'"), 'Visual suite must retain four approved deterministic surfaces with animations disabled');
  add(checks, failures, 'visual-reset-before-capture', (visual.match(/resetApp\(page\)/g) ?? []).length >= 4, 'Every visual surface must reset deterministic local state before capture');

  add(checks, failures, 'tile-shadows-use-live-engine', tileCss.includes('var(--tile-shadow-depth') && tileCss.includes('var(--tile-shadow-softness') && tileCss.includes('var(--tile-shadow-opacity') && !tileCss.includes('.tile:hover{transform:translateY(var(--tile-hover-lift)) scale(var(--tile-hover-scale));box-shadow:0 14px 31px rgba(45,78,126,.12)'), 'Hover and selected tile depth must derive from the canonical live tile CSS variables instead of fixed shadows');
  add(checks, failures, 'dock-workspace-centering', dockCss.includes('left:calc(50% + 159px)') && dockCss.includes('left:calc(50% + 126px)') && !dockCss.includes('left:58%'), 'Dock must remain centered over the desktop/tablet workspace using the actual sidebar half-width, not percentage heuristics');
  add(checks, failures, 'tile-preview-targets-real-tile', previewCss.includes("[data-testid='site-tile']") && !previewCss.includes('.forceHover a') && !previewCss.includes('.forcePressed a') && previewCss.includes('var(--tile-shadow-depth'), 'Live settings preview must apply simulated interaction states to the same SiteTile surface and CSS variables as the workspace');
  add(checks, failures, 'sidebar-no-fake-weather-symbol', !sidebar.includes('>☀<') && sidebar.includes('CalendarDays') && sidebar.includes('useWeather'), 'Sidebar clock card must not display a static weather symbol that can contradict live weather');
  add(checks, failures, 'mobile-calendar-entrypoint', mobileNav.includes('CalendarDays') && mobileNav.includes('calendarOpen') && mobileNav.includes('setCalendarOpen') && mobileNav.includes('Открыть календарь') && e2e.includes('mobile status bar opens the shared calendar bottom sheet'), 'Mobile status bar must open the same calendar overlay state as desktop and keep the interaction covered by E2E');
  add(checks, failures, 'semantic-navigation-icons', navigationIcon.includes('navigationIconKey') && sidebar.includes('navigationIconKey') && mobileNav.includes('navigationIconKey'), 'Desktop and mobile project/category navigation must share the semantic icon resolver');
  add(checks, failures, 'mobile-workspace-icon-forward', workspace.includes('aria-label={label}') && workspace.includes('tabLabel') && workspaceCss.includes('.tabLabel{display:none}') && workspaceCss.includes('@media(max-width:760px)'), 'Mobile workspace tabs must retain accessible icon-forward navigation without cramped text labels');
  add(checks, failures, 'omnibox-truthful-status', omnibox.includes("resolution.kind === 'site'") && omnibox.includes("resolution.kind === 'url'") && omnibox.includes('secureAddress') && omnibox.includes('savedSite') && !omnibox.includes('className={styles.profile}>●⌄'), 'Omnibox security/favorite indicators must be contextual and the profile chip must not pretend to be an inactive button');
  add(checks, failures, 'mobile-overlays-scroll-safely', [siteEditorCss, structureEditorCss, weatherCss].every(css => css.includes('@media(max-width:760px)') && css.includes('max-height:') && css.includes('overflow:auto')), 'Mobile editors and weather bottom sheet must cap height and remain scrollable when the virtual keyboard reduces the viewport');

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
