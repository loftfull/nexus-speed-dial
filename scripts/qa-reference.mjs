import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(root, relative) { return readFile(resolve(root, relative), 'utf8'); }
function check(checks, failures, name, pass, detail) { checks.push({ name, pass, detail }); if (!pass) failures.push(`${name}: ${detail}`); }

export async function runReferenceQa(root) {
  const checks = [];
  const failures = [];
  const [app, shell, shellCss, types, store, workspace, workspaceHeader, grid, gridCss, sidebar, mobileNav, omniboxUi, omniboxDomain, settings, prefBridge, globalCss, tileBridge, tile, siteOrder, calendarCss, weatherPopover, useWeather, weatherService, e2e, visual, ci] = await Promise.all([
    source(root, 'src/App.tsx'),
    source(root, 'src/components/shell/AppShell.tsx'),
    source(root, 'src/components/shell/AppShell.module.css'),
    source(root, 'src/domain/types.ts'),
    source(root, 'src/state/appStore.ts'),
    source(root, 'src/domain/workspace.ts'),
    source(root, 'src/components/workspace/WorkspaceHeader.tsx'),
    source(root, 'src/components/tiles/SpeedDialGrid.tsx'),
    source(root, 'src/components/tiles/SpeedDialGrid.module.css'),
    source(root, 'src/components/sidebar/Sidebar.tsx'),
    source(root, 'src/components/sidebar/MobileNavigation.tsx'),
    source(root, 'src/components/omnibox/Omnibox.tsx'),
    source(root, 'src/domain/omnibox.ts'),
    source(root, 'src/components/settings/TileSettingsPanel.tsx'),
    source(root, 'src/state/PreferencesBridge.tsx'),
    source(root, 'src/styles/global.css'),
    source(root, 'src/state/TileStyleBridge.tsx'),
    source(root, 'src/components/tiles/SiteTile.tsx'),
    source(root, 'src/domain/siteOrder.ts'),
    source(root, 'src/components/calendar/CalendarPopover.module.css'),
    source(root, 'src/components/weather/WeatherPopover.tsx'),
    source(root, 'src/weather/useWeather.ts'),
    source(root, 'src/weather/weatherService.ts'),
    source(root, 'e2e/app-shell.spec.ts'),
    source(root, 'e2e/visual.spec.ts'),
    source(root, '.github/workflows/ci.yml'),
  ]);

  check(checks, failures, 'pure-one-screen-app', !app.includes('SectionContent') && !app.includes("section !== 'home'") && app.includes('<WorkspaceHeader/>') && app.includes('<SpeedDialGrid/>'), 'Nexus must render one permanent Speed Dial workspace instead of section screens');
  check(checks, failures, 'no-dock-navigation', !shell.includes('../dock/Dock') && !shell.includes('<Dock'), 'Bottom Dock must not return to the application shell');
  check(checks, failures, 'canonical-space-model', types.includes("ContentMode = 'all' | 'favorites' | 'recent'") && types.includes('interface Space') && types.includes('position: number'), 'Domain must expose Space, one ContentMode and canonical positions');
  check(checks, failures, 'no-legacy-ui-types', !['AppSection','WorkspaceTab','ViewMode'].some(token => types.includes(`type ${token}`)), 'Deprecated section/tab/view types must not return to runtime domain');
  check(checks, failures, 'canonical-navigation-state', ['activeSpaceId','activeCategoryId','contentMode','layoutMode','query'].every(token => store.includes(token)) && store.includes("'nexus.navigation'") && !['section: AppSection','workspaceTab:','activeProjectId:','bookmarkQuery:','setSection(','setWorkspaceTab(','setActiveProject('].some(token => store.includes(token)), 'Store must expose only the Pure Speed Dial navigation model');
  check(checks, failures, 'legacy-data-migration', store.includes("'nexus.projects'") && store.includes('spaceId ??') && store.includes('normalizeSpaces') && types.includes('interface Project'), 'Legacy project data may remain only as a storage/backup migration shape');
  check(checks, failures, 'space-scoped-workspace', workspace.includes('siteSpaceId(site) === input.spaceId') && workspace.includes("input.mode === 'favorites'") && workspace.includes("input.mode === 'recent'") && workspace.includes('canonicalOrder') && !workspace.includes('LegacyWorkspaceSelectionInput'), 'All/Favorites/Recent must remain scoped to the active space through one canonical selector');
  check(checks, failures, 'single-mode-switcher', ['Все','Избранное','Недавние'].every(label => workspaceHeader.includes(label)) && !workspaceHeader.includes('searchWrap') && !workspaceHeader.includes('bookmarkQuery'), 'Workspace header must only switch All/Favorites/Recent');
  check(checks, failures, 'single-category-tree', sidebar.includes('ПРОСТРАНСТВА') && sidebar.includes('КАТЕГОРИИ') && sidebar.includes('Все сайты') && !sidebar.includes('ПРОВОДНИК') && !sidebar.includes('forecast') && !sidebar.includes('styles.chips'), 'Sidebar must contain one spaces list, one category tree and no duplicate explorer/forecast');
  check(checks, failures, 'space-editor-target', sidebar.includes("kind: 'space'") && mobileNav.includes("kind: 'space'") && !sidebar.includes("kind: 'project'") && !mobileNav.includes("kind: 'project'"), 'Structure editing must use Space terminology in both desktop and mobile UI');
  check(checks, failures, 'compact-utility-status', sidebar.includes('utilityWeather') && sidebar.includes('date-button') && !sidebar.includes('clockCard'), 'Clock/weather must remain compact utilities rather than a dashboard card');
  check(checks, failures, 'mobile-shared-mental-model', mobileNav.includes('Пространства и категории') && mobileNav.includes('Все сайты') && mobileNav.includes('activeSpaceId') && mobileNav.includes('activeCategoryId'), 'Mobile drawer must use the same spaces/category model as desktop');
  check(checks, failures, 'single-omnibox', omniboxUi.includes('Найти сайт или ввести адрес') && !omniboxUi.includes('ArrowLeft') && !omniboxUi.includes('ArrowRight') && !omniboxUi.includes('Shield') && !omniboxUi.includes('profile'), 'Omnibox must be the only search/address surface and must not imitate browser chrome');
  check(checks, failures, 'omnibox-preferences', ['globalSiteSearch','omniboxSuggestions','searchEngine'].every(token => omniboxUi.includes(token)) && ['google','yandex','duckduckgo'].every(engine => omniboxDomain.includes(engine)), 'Omnibox must honor search scope, suggestions and selected web search engine');
  check(checks, failures, 'user-settings-only', ['Внешний вид','Плитки','Поиск','Данные'].every(label => settings.includes(label)) && !['AdvancedSettings','MotionSettings','TilePreview','Hover glow','Selected glow'].some(token => settings.includes(token)), 'Settings must expose user choices only, not design-engine internals');
  check(checks, failures, 'preferences-are-live', ['dataset.theme','dataset.density','dataset.background','dataset.glass'].every(token => prefBridge.includes(token)) && ["data-theme='dark'","data-density='compact'","data-glass='strong'"].every(token => globalCss.includes(token)), 'Theme, density, background and glass preferences must affect live CSS');
  check(checks, failures, 'single-style-bridge', tileBridge.includes('applyTileCssVariables(document.documentElement.style, settings)'), 'TileStyleBridge must remain the only canonical tile CSS variable writer');
  check(checks, failures, 'single-tile-action-menu', tile.includes('Действия ${site.title}') && ['В избранное','Изменить','Переместить','Удалить'].every(label => tile.includes(label)), 'Secondary tile actions must live behind one context menu');
  check(checks, failures, 'canonical-drag-order', grid.includes('reorderVisibleSites') && grid.includes("contentMode === 'all'") && siteOrder.includes('visibleOrder') && siteOrder.includes('position'), 'Drag reorder must update one canonical space order and be disabled outside All mode');
  check(checks, failures, 'add-site-is-grid-action', grid.includes('Добавить сайт') && grid.includes("contentMode === 'all'"), 'Add site must be a grid action, not another global navigation item');
  check(checks, failures, 'responsive-layout', ['1100px','760px'].every(bp => shellCss.includes(bp)) && ['1300px','1100px','760px','430px'].every(bp => gridCss.includes(bp)), 'Desktop/tablet/mobile layout breakpoints must remain explicit');
  check(checks, failures, 'calendar-is-overlay', /position\s*:\s*fixed/.test(calendarCss), 'Calendar must remain an overlay and never reserve a workspace column');
  check(checks, failures, 'live-weather-single-source', sidebar.includes('useWeather') && mobileNav.includes('useWeather') && weatherPopover.includes('useWeather'), 'Desktop/mobile/weather popover must share the same live weather hook');
  check(checks, failures, 'weather-no-background-geolocation', !useWeather.includes('geolocation') && weatherPopover.includes('requestExplicitPosition(navigator.geolocation)') && weatherService.includes('getCurrentPosition'), 'Geolocation must only happen from explicit user action');
  check(checks, failures, 'interaction-e2e', ['content modes remain scoped','site can be added and survives reload','settings preferences apply immediately','mobile navigation uses one spaces and categories drawer','backup import restores validated sites'].every(signal => e2e.includes(signal)), 'Playwright suite must cover the approved Pure Speed Dial flows');
  const visualNames = ['desktop-main.png','desktop-settings.png','tablet-main.png','mobile-main.png','mobile-navigation.png'];
  check(checks, failures, 'visual-surfaces', visualNames.every(name => visual.includes(name)), 'Visual QA must cover desktop, settings, tablet, mobile and mobile navigation');
  const ciCommands = ['npm run lint','npm run test:node','npm test','npm run build','npm run qa:reference','npm run test:e2e','npm run test:visual','playwright install --with-deps chromium'];
  check(checks, failures, 'full-ci-gate', ciCommands.every(command => ci.includes(command)), 'CI must enforce lint, contracts, unit, build, reference, interaction and visual gates');

  return { checks, failures };
}

async function main() {
  const result = await runReferenceQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) { console.error(`\nReference QA failed (${result.failures.length})`); process.exitCode = 1; }
  else console.log(`\nReference QA passed (${result.checks.length} checks)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
