import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(root, relative) {
  return readFile(resolve(root, relative), 'utf8');
}

function check(checks, failures, name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) failures.push(`${name}: ${detail}`);
}

export async function runReferenceQa(root) {
  const checks = [];
  const failures = [];

  const [
    shell,
    calendarCss,
    types,
    settings,
    settingsModel,
    bridge,
    shellCss,
    gridCss,
    tokens,
    mobileNav,
    sections,
    sidebar,
    weatherPopover,
    useWeather,
    weatherService,
  ] = await Promise.all([
    source(root, 'src/components/shell/AppShell.tsx'),
    source(root, 'src/components/calendar/CalendarPopover.module.css'),
    source(root, 'src/domain/types.ts'),
    source(root, 'src/components/settings/TileSettingsPanel.tsx'),
    source(root, 'src/components/settings/tileSettingsPanelModel.ts'),
    source(root, 'src/state/TileStyleBridge.tsx'),
    source(root, 'src/components/shell/AppShell.module.css'),
    source(root, 'src/components/tiles/SpeedDialGrid.module.css'),
    source(root, 'src/styles/tokens.css'),
    source(root, 'src/components/sidebar/MobileNavigation.tsx'),
    source(root, 'src/components/sections/SectionContent.tsx'),
    source(root, 'src/components/sidebar/Sidebar.tsx'),
    source(root, 'src/components/weather/WeatherPopover.tsx'),
    source(root, 'src/weather/useWeather.ts'),
    source(root, 'src/weather/weatherService.ts'),
  ]);

  check(checks, failures, 'calendar-not-in-layout', !shell.includes('CalendarPopover'), 'AppShell must never reserve a calendar column');
  check(checks, failures, 'calendar-is-overlay', /position\s*:\s*fixed/.test(calendarCss), 'CalendarPopover must be positioned as an overlay');

  const requiredModes = ['minimal', 'standard', 'expanded', 'large', 'list'];
  const missingTypes = requiredModes.filter(mode => !types.includes(`'${mode}'`));
  check(checks, failures, 'tile-modes-domain', missingTypes.length === 0, `Missing TilePreset modes: ${missingTypes.join(', ') || 'none'}`);
  const missingSettings = requiredModes.filter(mode => !settings.includes(`'${mode}'`));
  check(checks, failures, 'tile-modes-settings', missingSettings.length === 0, `Missing settings modes: ${missingSettings.join(', ') || 'none'}`);

  check(checks, failures, 'single-style-bridge', bridge.includes('applyTileCssVariables(document.documentElement.style, settings)'), 'TileStyleBridge must write canonical tile CSS variables to documentElement');
  check(checks, failures, 'desktop-sidebar-width', /grid-template-columns\s*:\s*318px/.test(shellCss), 'Desktop sidebar must start near the approved 300–320px range');
  check(checks, failures, 'mobile-sidebar-breakpoint', /@media\s*\(\s*max-width\s*:\s*760px\s*\)/.test(shellCss), 'AppShell must include the mobile breakpoint');
  check(checks, failures, 'responsive-grid-breakpoints', ['1300px','1100px','760px','430px'].every(bp => gridCss.includes(bp)), 'SpeedDialGrid must retain desktop/tablet/mobile density breakpoints');
  check(checks, failures, 'glass-tokens', ['--nexus-blur-panel: 20px','--nexus-radius-panel: 26px','--nexus-radius-tile: 20px','--nexus-accent: #2f7cf6'].every(token => tokens.includes(token)), 'Canonical Glass Design tokens must stay present');

  check(checks, failures, 'mobile-navigation-drawer', mobileNav.includes('mobileNavOpen') && mobileNav.includes('Разделы и категории'), 'Mobile layout must use a dedicated project/category drawer instead of the desktop sidebar');
  check(checks, failures, 'settings-three-tabs', ['basic','advanced','motion'].every(tab => settingsModel.includes(`'${tab}'`)), 'Tile settings must retain Basic, Advanced and Motion tabs');
  check(checks, failures, 'dock-section-screens', ['FavoritesSection','RecentSection','DownloadsSection','NotesSection','SettingsSection'].every(name => sections.includes(name)), 'All non-home Dock sections must have dedicated workspace content');

  check(checks, failures, 'live-weather-single-source', sidebar.includes('useWeather') && mobileNav.includes('useWeather') && weatherPopover.includes('useWeather'), 'Sidebar, mobile header and WeatherPopover must use the same runtime weather hook');
  check(checks, failures, 'no-fake-weather', !sidebar.includes('22°') && !mobileNav.includes('22°') && !weatherPopover.includes('22°'), 'No static demo temperature may remain in production weather UI');
  check(checks, failures, 'weather-manual-city', weatherPopover.includes('Введите город') && weatherPopover.includes('setWeatherLocation'), 'Manual city selection must remain available');
  check(checks, failures, 'weather-no-background-geolocation', !useWeather.includes('geolocation') && !sidebar.includes('geolocation') && !mobileNav.includes('geolocation'), 'Weather loading must never request geolocation implicitly');
  check(checks, failures, 'weather-explicit-geolocation', weatherPopover.includes('requestExplicitPosition(navigator.geolocation)') && weatherService.includes('getCurrentPosition'), 'Geolocation may only run from the explicit user action path');
  check(checks, failures, 'weather-open-meteo', weatherService.includes('api.open-meteo.com/v1/forecast') && weatherService.includes('geocoding-api.open-meteo.com/v1/search'), 'Live weather must use the configured Open-Meteo endpoints');

  return { checks, failures };
}

async function main() {
  const result = await runReferenceQa(process.cwd());
  for (const item of result.checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name} — ${item.detail}`);
  if (result.failures.length) {
    console.error(`\nReference QA failed (${result.failures.length})`);
    process.exitCode = 1;
  } else {
    console.log(`\nReference QA passed (${result.checks.length} checks)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
