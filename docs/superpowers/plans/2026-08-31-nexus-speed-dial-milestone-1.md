# Nexus Speed Dial — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-usable Nexus Speed Dial desktop experience with a restrained Glass Design, live site-tile appearance controls, local persistence, responsive behavior, and a release gate that prevents visual regressions.

**Architecture:** Implement a Vite + React + TypeScript single-page application organized around focused UI components and a small Zustand store. Visual behavior is controlled by CSS variables/design tokens so tile settings update the main grid and preview instantly without reload. Persistence is isolated behind a storage adapter, and Playwright visual checks cover the approved desktop/tablet/mobile reference states.

**Tech Stack:** React 19, TypeScript 5.x, Vite 7, Zustand, Lucide React, CSS variables + CSS Modules, Vitest, Testing Library, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-31-nexus-speed-dial-design.md`

## Global Constraints

- Russian-language UI with high-quality Cyrillic typography.
- Glass design is used for application shell and controls; site icons remain recognizable and colorful.
- No sci-fi, neon, excessive 3D, ray-traced/refraction shaders, or physically unrealistic glass effects.
- Calendar is never a permanent layout column; it opens only as a popover from the date.
- Desktop-first; tablet and mobile layouts remain functional and visually coherent.
- All visual effects must be achievable with ordinary CSS: `rgba`, `backdrop-filter`, borders, shadows, transforms, transitions.
- Default background range: `#F3F7FC` → `#EDF3FA`.
- Default accent: `#2F7CF6`.
- Default text colors: `#101828`, `#667085`, `#98A2B3`.
- Default panel opacity: `0.58–0.78`; blur: `14–22px`; saturation: `115–130%`.
- Default large panel radius: `24–28px`; tile radius: `18–22px`; control radius: `14–18px`.
- Default tile motion: hover `translateY(-2px)` to `-3px`, scale `1.01–1.02`, pressed scale about `0.97`, duration `180–220ms`.
- Reduced-motion mode must disable or minimize non-essential motion.
- A release is not complete while type/lint, unit, interaction, responsive, screenshot regression, or visual-reference QA is failing.

---

## File Map

### Tooling and application entry
- `package.json` — scripts and dependencies.
- `vite.config.ts` — Vite/Vitest configuration.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — TypeScript configuration.
- `eslint.config.js` — lint rules.
- `index.html` — Vite entry document.
- `src/main.tsx` — React bootstrap.
- `src/App.tsx` — root composition only; no business logic.

### Design system
- `src/styles/tokens.css` — canonical CSS custom properties for color, glass, radii, spacing, motion.
- `src/styles/global.css` — reset, typography, page background, focus-visible baseline.
- `src/components/primitives/GlassSurface.tsx` — reusable semantic glass container.
- `src/components/primitives/GlassSurface.module.css` — role-based glass appearance.

### Domain, storage, state
- `src/domain/types.ts` — `Site`, `Project`, `Category`, tile settings, app section types.
- `src/domain/tilePresets.ts` — canonical presets and settings normalization.
- `src/data/seed.ts` — initial projects/categories/sites used on first launch.
- `src/storage/StorageAdapter.ts` — persistence interface.
- `src/storage/localStorageAdapter.ts` — browser implementation.
- `src/state/appStore.ts` — Zustand store, actions, persistence boundary.

### Shell
- `src/components/shell/AppShell.tsx` / `.module.css` — desktop/tablet/mobile structural grid.
- `src/components/sidebar/Sidebar.tsx` / `.module.css` — brand, clock/date, weather, projects, categories/explorer.
- `src/components/omnibox/Omnibox.tsx` / `.module.css` — nav buttons, query/address field, profile actions.
- `src/components/workspace/WorkspaceHeader.tsx` / `.module.css` — tabs, bookmark search, view controls.
- `src/components/dock/Dock.tsx` / `.module.css` — six top-level navigation actions.

### Speed Dial
- `src/components/tiles/SiteIcon.tsx` — icon/fallback rendering.
- `src/components/tiles/SiteTile.tsx` / `.module.css` — tile visual state machine.
- `src/components/tiles/SpeedDialGrid.tsx` / `.module.css` — grid/list layout.

### Contextual UI
- `src/components/calendar/CalendarPopover.tsx` / `.module.css` — date-triggered popover only.
- `src/components/settings/TileSettingsPanel.tsx` / `.module.css` — Basic/Advanced/Motion controls.
- `src/components/settings/TilePreview.tsx` / `.module.css` — normal/hover/pressed/selected preview states.

### Tests and QA
- `src/test/setup.ts` — Testing Library matchers and cleanup.
- `src/**/*.test.ts(x)` — unit/component tests near implementation.
- `e2e/app-shell.spec.ts` — interaction/responsive smoke tests.
- `e2e/visual.spec.ts` — screenshot baselines.
- `playwright.config.ts` — deterministic viewport/font/animation test configuration.
- `scripts/qa-reference.mjs` — hard assertions for key reference invariants.
- `.github/workflows/ci.yml` — type/lint/unit/build/e2e gate.

---

### Task 1: Scaffold, tooling, typography, and glass tokens

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/components/primitives/GlassSurface.tsx`
- Create: `src/components/primitives/GlassSurface.module.css`
- Create: `src/components/primitives/GlassSurface.test.tsx`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `GlassSurface({ as, role, className, children })` and the complete canonical CSS variable set consumed by all later tasks.
- Consumes: none.

- [ ] **Step 1: Create the scaffold and dependencies**

Use this package baseline:

```json
{
  "name": "nexus-speed-dial",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:visual": "playwright test e2e/visual.spec.ts",
    "qa": "npm run lint && npm run test && npm run build"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "globals": "^16.0.0",
    "jsdom": "^26.0.0",
    "typescript": "~5.8.0",
    "typescript-eslint": "^8.0.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Write the failing primitive test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlassSurface } from './GlassSurface';

describe('GlassSurface', () => {
  it('exposes a semantic glass role for deterministic styling', () => {
    render(<GlassSurface role="panel">Контент</GlassSurface>);
    expect(screen.getByText('Контент')).toHaveAttribute('data-glass-role', 'panel');
  });
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npm install && npm test -- GlassSurface.test.tsx`
Expected: FAIL because `GlassSurface` does not exist yet.

- [ ] **Step 4: Implement tokens and the primitive**

`src/styles/tokens.css` must define at least:

```css
:root {
  --nexus-bg-top: #f3f7fc;
  --nexus-bg-bottom: #edf3fa;
  --nexus-accent: #2f7cf6;
  --nexus-text: #101828;
  --nexus-text-secondary: #667085;
  --nexus-text-muted: #98a2b3;
  --nexus-glass-panel: rgba(255, 255, 255, 0.68);
  --nexus-glass-control: rgba(255, 255, 255, 0.62);
  --nexus-glass-border: rgba(255, 255, 255, 0.60);
  --nexus-glass-border-secondary: rgba(120, 145, 180, 0.10);
  --nexus-blur-panel: 20px;
  --nexus-blur-control: 16px;
  --nexus-saturation: 122%;
  --nexus-radius-panel: 26px;
  --nexus-radius-tile: 20px;
  --nexus-radius-control: 16px;
  --nexus-shadow-panel: 0 8px 28px rgba(55, 80, 120, 0.08);
  --nexus-shadow-control: 0 3px 10px rgba(40, 70, 110, 0.07);
  --nexus-motion-fast: 180ms;
  --nexus-motion-normal: 210ms;
  --nexus-ease: cubic-bezier(.2,.8,.2,1);
}
```

`GlassSurface.tsx`:

```tsx
import type { ElementType, PropsWithChildren } from 'react';
import styles from './GlassSurface.module.css';

type Props = PropsWithChildren<{
  as?: ElementType;
  role?: 'panel' | 'control' | 'dock' | 'popover';
  className?: string;
}>;

export function GlassSurface({ as: Tag = 'div', role = 'panel', className = '', children }: Props) {
  return (
    <Tag className={`${styles.surface} ${styles[role]} ${className}`} data-glass-role={role}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 5: Run unit/lint/build checks**

Run: `npm run lint && npm test -- GlassSurface.test.tsx && npm run build`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Nexus glass design system"
```

---

### Task 2: Domain model, tile presets, and persistence abstraction

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/tilePresets.ts`
- Create: `src/domain/tilePresets.test.ts`
- Create: `src/storage/StorageAdapter.ts`
- Create: `src/storage/localStorageAdapter.ts`
- Create: `src/storage/localStorageAdapter.test.ts`
- Create: `src/data/seed.ts`

**Interfaces:**
- Produces: `TileAppearanceSettings`, `TilePreset`, `Site`, `Project`, `Category`, `AppSection`, `normalizeTileSettings`, `getTilePreset`, `StorageAdapter`.
- Consumes: design constants only conceptually; no UI imports.

- [ ] **Step 1: Define the exact domain types**

```ts
export type TilePreset = 'minimal' | 'standard' | 'expanded' | 'large' | 'list';
export type TileSize = 'S' | 'M' | 'L' | 'XL';
export type AppSection = 'home' | 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings';

export interface Site {
  id: string;
  title: string;
  url: string;
  subtitle?: string;
  domain: string;
  categoryId?: string;
  projectId: string;
  iconUrl?: string;
  favorite: boolean;
  badge?: string;
}

export interface Project { id: string; name: string; icon: string; }
export interface Category { id: string; name: string; projectId: string; parentId?: string; icon: string; }

export interface TileAppearanceSettings {
  preset: TilePreset;
  size: TileSize;
  columns: 'auto' | number;
  width: number;
  height: number;
  gap: number;
  radius: number;
  iconSize: number;
  showTitle: boolean;
  showSubtitle: boolean;
  showDomain: boolean;
  showCategory: boolean;
  showBadge: boolean;
  glassOpacity: number;
  blur: number;
  saturation: number;
  borderOpacity: number;
  shadowEnabled: boolean;
  shadowOpacity: number;
  hoverGlow: boolean;
  hoverGlowIntensity: number;
  selectedGlowIntensity: number;
  hoverEnabled: boolean;
  hoverLift: number;
  hoverScale: number;
  pressedScale: number;
  transitionMs: number;
  easing: 'standard' | 'soft' | 'snappy';
  reducedMotion: boolean;
}
```

- [ ] **Step 2: Write failing preset tests**

```ts
import { describe, expect, it } from 'vitest';
import { getTilePreset, normalizeTileSettings } from './tilePresets';

describe('tile presets', () => {
  it('keeps minimal tiles compact and hides secondary metadata', () => {
    const p = getTilePreset('minimal');
    expect(p.showSubtitle).toBe(false);
    expect(p.showDomain).toBe(false);
    expect(p.height).toBeLessThan(150);
  });

  it('clamps unsafe visual values', () => {
    const p = normalizeTileSettings({ ...getTilePreset('standard'), blur: 99, glassOpacity: 0.1 });
    expect(p.blur).toBe(28);
    expect(p.glassOpacity).toBe(0.42);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- tilePresets.test.ts`
Expected: FAIL because preset functions do not exist.

- [ ] **Step 4: Implement canonical presets and clamps**

Use explicit preset objects; do not compute them ad hoc in components. Bounds:

```ts
const bounds = {
  width: [112, 260], height: [112, 240], gap: [8, 32], radius: [10, 30],
  iconSize: [32, 84], glassOpacity: [0.42, 0.86], blur: [8, 28], saturation: [100, 140],
  borderOpacity: [0, 0.8], shadowOpacity: [0, 0.18], hoverGlowIntensity: [0, 0.24],
  selectedGlowIntensity: [0, 0.30], hoverLift: [0, 6], hoverScale: [1, 1.04],
  pressedScale: [0.94, 1], transitionMs: [80, 400]
} as const;
```

Define `minimal` as `128x128`, `standard` as `170x180`, `expanded` as `188x204`, `large` as `220x224`; list mode uses width `260`, height `76` and hides grid-only assumptions.

- [ ] **Step 5: Write and implement storage contract tests**

```ts
export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}
```

Test that malformed JSON returns the supplied fallback and does not throw.

Run: `npm test -- localStorageAdapter.test.ts`
Expected: PASS after implementation.

- [ ] **Step 6: Add seed data with recognizable services**

Seed at least Telegram, РБК, VC.ru, YouTube, Google Фото, Google Диск, Google Календарь, Gmail, Todoist, Dropbox, Ozon, Сбербанк, Яндекс Метрика, GitHub, Kaspersky. Use remote icon URLs only as optional data; `SiteIcon` must later survive failures.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/storage src/data
git commit -m "feat: define tile model presets and storage contract"
```

---

### Task 3: Zustand application store and live CSS-variable bridge

**Files:**
- Create: `src/state/appStore.ts`
- Create: `src/state/appStore.test.ts`
- Create: `src/state/TileStyleBridge.tsx`
- Create: `src/state/TileStyleBridge.test.tsx`

**Interfaces:**
- Consumes: `TileAppearanceSettings`, seed data, `StorageAdapter`.
- Produces: `useAppStore`, `createAppStore`, actions `setSection`, `setActiveProject`, `setActiveCategory`, `setTileSetting`, `applyTilePreset`, `resetTileSettings`; `TileStyleBridge` writes settings to `document.documentElement` CSS variables.

- [ ] **Step 1: Write failing store tests**

```ts
it('applies one tile setting without replacing unrelated settings', () => {
  const store = createAppStore(memoryStorage);
  const before = store.getState().tileSettings;
  store.getState().setTileSetting('radius', 24);
  expect(store.getState().tileSettings.radius).toBe(24);
  expect(store.getState().tileSettings.iconSize).toBe(before.iconSize);
});

it('persists appearance changes', () => {
  const store = createAppStore(memoryStorage);
  store.getState().setTileSetting('blur', 24);
  expect(memoryStorage.get('nexus.tileSettings', null)?.blur).toBe(24);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- appStore.test.ts`
Expected: FAIL because store is missing.

- [ ] **Step 3: Implement the store with injected storage**

`createAppStore(storage)` must create a vanilla Zustand store for deterministic tests; `useAppStore` binds the browser store. Do not access `localStorage` directly inside React components.

- [ ] **Step 4: Write failing CSS bridge test**

```tsx
it('reflects tile radius and blur as CSS variables', () => {
  render(<TileStyleBridge />);
  act(() => useAppStore.getState().setTileSetting('radius', 24));
  expect(document.documentElement.style.getPropertyValue('--tile-radius')).toBe('24px');
});
```

- [ ] **Step 5: Implement exact CSS variables**

Bridge at least:

```ts
{
  '--tile-width': `${s.width}px`,
  '--tile-height': `${s.height}px`,
  '--tile-gap': `${s.gap}px`,
  '--tile-radius': `${s.radius}px`,
  '--tile-icon-size': `${s.iconSize}px`,
  '--tile-glass-opacity': String(s.glassOpacity),
  '--tile-blur': `${s.blur}px`,
  '--tile-saturation': `${s.saturation}%`,
  '--tile-border-opacity': String(s.borderOpacity),
  '--tile-shadow-opacity': String(s.shadowEnabled ? s.shadowOpacity : 0),
  '--tile-hover-lift': `${s.reducedMotion ? 0 : s.hoverLift}px`,
  '--tile-hover-scale': String(s.reducedMotion ? 1 : s.hoverScale),
  '--tile-pressed-scale': String(s.reducedMotion ? 1 : s.pressedScale),
  '--tile-transition': `${s.reducedMotion ? 0 : s.transitionMs}ms`
}
```

- [ ] **Step 6: Run store and bridge tests**

Run: `npm test -- appStore.test.ts TileStyleBridge.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/state
git commit -m "feat: add persistent live tile style state"
```

---

### Task 4: AppShell and responsive structural grid

**Files:**
- Create: `src/components/shell/AppShell.tsx`
- Create: `src/components/shell/AppShell.module.css`
- Create: `src/components/shell/AppShell.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: layout slots `sidebar`, `topbar`, `workspace`, `dock`, `overlays`.
- Consumes: `GlassSurface`, `TileStyleBridge`.

- [ ] **Step 1: Write the failing shell invariant test**

```tsx
it('does not allocate a permanent calendar column', () => {
  render(<App />);
  expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  expect(screen.queryByTestId('calendar-column')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- AppShell.test.tsx`
Expected: FAIL until shell exists.

- [ ] **Step 3: Implement desktop layout**

Use CSS grid with only two persistent columns:

```css
.shell {
  min-height: 100dvh;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(300px, 320px) minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  gap: 16px;
}

.sidebar { grid-column: 1; grid-row: 1 / -1; }
.main { grid-column: 2; grid-row: 1 / -1; min-width: 0; }
```

At `max-width: 1024px`, sidebar width becomes `260px`; at `max-width: 760px`, persistent sidebar is removed from grid and replaced later by mobile drawer controls. Never add a calendar column.

- [ ] **Step 4: Compose only structural placeholders in `App.tsx`**

`App` should remain declarative: no timers, storage calls, or tile calculations.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- AppShell.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/shell
git commit -m "feat: add two-column responsive application shell"
```

---

### Task 5: Sidebar — brand, real clock/date, weather summary, projects, categories

**Files:**
- Create: `src/components/sidebar/Sidebar.tsx`
- Create: `src/components/sidebar/Sidebar.module.css`
- Create: `src/components/sidebar/Sidebar.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces callbacks `onDateClick`, active project/category navigation.
- Consumes: app store actions, seed projects/categories, `GlassSurface`.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('switches active project', async () => {
  const user = userEvent.setup();
  render(<Sidebar onDateClick={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Работа' }));
  expect(useAppStore.getState().activeProjectId).toBe('work');
});

it('exposes the date as a button instead of permanent calendar content', () => {
  render(<Sidebar onDateClick={() => {}} />);
  expect(screen.getByRole('button', { name: /открыть календарь/i })).toBeInTheDocument();
  expect(screen.queryByRole('grid', { name: /календарь/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- Sidebar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement real time/date formatting**

Use `Intl.DateTimeFormat('ru-RU', ...)`. Clock update interval is 30 seconds; clean it up on unmount. Do not hardcode 09:42 in runtime code.

- [ ] **Step 4: Implement weather summary without permission traps**

First milestone uses a deterministic local placeholder model `{ temperature: 22, condition: 'Облачно', feelsLike: 21 }` behind a `WeatherSummary` object. No automatic geolocation prompt on mount. A later weather provider can replace this without changing sidebar markup.

- [ ] **Step 5: Implement project chips and two-level explorer**

Render only root categories plus one child level. Active project/category uses the accent token; inactive items remain neutral. Counters are compact badges.

- [ ] **Step 6: Run tests**

Run: `npm test -- Sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/sidebar src/App.tsx
git commit -m "feat: build glass sidebar navigation"
```

---

### Task 6: Omnibox and workspace controls

**Files:**
- Create: `src/components/omnibox/Omnibox.tsx`
- Create: `src/components/omnibox/Omnibox.module.css`
- Create: `src/components/omnibox/Omnibox.test.tsx`
- Create: `src/components/workspace/WorkspaceHeader.tsx`
- Create: `src/components/workspace/WorkspaceHeader.module.css`
- Create: `src/components/workspace/WorkspaceHeader.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: local bookmark query state in store (`bookmarkQuery`), view mode `grid | list`, active workspace tab `quick | recent | favorites`.
- Consumes: app-store setters.

- [ ] **Step 1: Write failing search and tab tests**

```tsx
it('updates local bookmark query while typing', async () => {
  const user = userEvent.setup();
  render(<WorkspaceHeader />);
  await user.type(screen.getByPlaceholderText('Поиск по закладкам'), 'git');
  expect(useAppStore.getState().bookmarkQuery).toBe('git');
});

it('selects Избранное without navigating away from the shell', async () => {
  const user = userEvent.setup();
  render(<WorkspaceHeader />);
  await user.click(screen.getByRole('button', { name: 'Избранное' }));
  expect(useAppStore.getState().workspaceTab).toBe('favorites');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- Omnibox.test.tsx WorkspaceHeader.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the top omnibox**

Include `ArrowLeft`, `ArrowRight`, `Search`, `Star`, `ShieldCheck`, `UserCircle`, `ChevronDown` from Lucide. The field placeholder is exactly `Введите запрос или адрес`. Do not implement browser-history APIs in milestone 1; buttons are disabled with accessible labels until browser integration exists.

- [ ] **Step 4: Implement segmented workspace tabs and bookmark search**

Active tab uses a translucent capsule and accent text, not a saturated rectangle. Grid/list buttons use `aria-pressed`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- Omnibox.test.tsx WorkspaceHeader.test.tsx`
Expected: PASS.

```bash
git add src/components/omnibox src/components/workspace src/App.tsx
git commit -m "feat: add omnibox and workspace navigation"
```

---

### Task 7: Site icon fallback, SiteTile state machine, grid/list renderer

**Files:**
- Create: `src/components/tiles/SiteIcon.tsx`
- Create: `src/components/tiles/SiteIcon.test.tsx`
- Create: `src/components/tiles/SiteTile.tsx`
- Create: `src/components/tiles/SiteTile.module.css`
- Create: `src/components/tiles/SiteTile.test.tsx`
- Create: `src/components/tiles/SpeedDialGrid.tsx`
- Create: `src/components/tiles/SpeedDialGrid.module.css`
- Create: `src/components/tiles/SpeedDialGrid.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `SiteIcon({ site })` renders original icon when available, generated letter/domain fallback on error.
- `SiteTile({ site, mode, forcedState? })` exposes state via `data-tile-state` for preview/testing.
- `SpeedDialGrid` consumes store filters/preset/view mode and renders the filtered site collection.

- [ ] **Step 1: Write failing broken-icon fallback test**

```tsx
it('replaces a broken icon with a generated fallback', () => {
  render(<SiteIcon site={{ ...sampleSite, iconUrl: '/broken.png' }} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByTestId('site-icon-fallback')).toHaveTextContent('G');
});
```

- [ ] **Step 2: Write failing tile-state tests**

```tsx
it('enters pressed state on pointer down and restores on pointer up', () => {
  render(<SiteTile site={sampleSite} mode="standard" />);
  const tile = screen.getByRole('link', { name: /GitHub/i });
  fireEvent.pointerDown(tile);
  expect(tile).toHaveAttribute('data-tile-state', 'pressed');
  fireEvent.pointerUp(tile);
  expect(tile).toHaveAttribute('data-tile-state', 'normal');
});
```

- [ ] **Step 3: Run and verify failures**

Run: `npm test -- SiteIcon.test.tsx SiteTile.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement tile rendering and visual states**

CSS must use the CSS-variable bridge rather than inline duplicate calculations:

```css
.tile {
  width: var(--tile-width);
  min-height: var(--tile-height);
  border-radius: var(--tile-radius);
  background: rgba(255,255,255,var(--tile-glass-opacity));
  backdrop-filter: blur(var(--tile-blur)) saturate(var(--tile-saturation));
  border: 1px solid rgba(255,255,255,var(--tile-border-opacity));
  transition: transform var(--tile-transition) var(--nexus-ease), box-shadow var(--tile-transition) var(--nexus-ease);
}

@media (hover: hover) {
  .tile:hover {
    transform: translateY(calc(var(--tile-hover-lift) * -1)) scale(var(--tile-hover-scale));
  }
}

.tile[data-tile-state='pressed'] { transform: scale(var(--tile-pressed-scale)); }
.tile:focus-visible { outline: 2px solid color-mix(in srgb, var(--nexus-accent) 70%, white); outline-offset: 3px; }
```

- [ ] **Step 5: Implement filtering and layout**

Filter by active project, active category, tab (`favorites`), and case-insensitive query across title/domain/subtitle. `columns='auto'` uses CSS `repeat(auto-fill, minmax(var(--tile-width), 1fr))`; explicit columns set a style variable `--tile-columns`.

- [ ] **Step 6: Add the + Добавить сайт tile**

Use a low-contrast dashed glass border and no oversized CTA. It may open a milestone-1 placeholder dialog state, but it must not look like a marketing card.

- [ ] **Step 7: Run tile/grid tests**

Run: `npm test -- SiteIcon.test.tsx SiteTile.test.tsx SpeedDialGrid.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/tiles src/App.tsx
git commit -m "feat: implement configurable speed dial tiles"
```

---

### Task 8: Floating Dock and top-level section switching

**Files:**
- Create: `src/components/dock/Dock.tsx`
- Create: `src/components/dock/Dock.module.css`
- Create: `src/components/dock/Dock.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AppSection`, `setSection`.
- Produces: six icon-only desktop actions with accessible names.

- [ ] **Step 1: Write failing section-switch test**

```tsx
it('opens tile settings from the dock', async () => {
  const user = userEvent.setup();
  render(<Dock />);
  await user.click(screen.getByRole('button', { name: 'Настройки' }));
  expect(useAppStore.getState().section).toBe('settings');
});
```

- [ ] **Step 2: Implement dock icons**

Use `House`, `Star`, `Clock3`, `Download`, `NotebookText`, `Settings`. Desktop renders icons only plus native tooltip/title and accessible labels; active section uses blue icon plus subtle inner glow.

- [ ] **Step 3: Place dock as floating application navigation**

Keep it inside the app viewport with `position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);`. Reserve bottom padding in workspace so dock does not cover the last tile row.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- Dock.test.tsx`
Expected: PASS.

```bash
git add src/components/dock src/App.tsx
git commit -m "feat: add floating glass section dock"
```

---

### Task 9: Calendar popover — open/close behavior without layout reflow

**Files:**
- Create: `src/components/calendar/CalendarPopover.tsx`
- Create: `src/components/calendar/CalendarPopover.module.css`
- Create: `src/components/calendar/CalendarPopover.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`

**Interfaces:**
- `CalendarPopover({ open, anchorRef, onClose, selectedDate, onSelectDate })`.
- Sidebar date button toggles `calendarOpen` in root overlay state.

- [ ] **Step 1: Write failing behavior tests**

```tsx
it('opens only after clicking the date and closes on Escape', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.queryByRole('dialog', { name: 'Календарь' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /открыть календарь/i }));
  expect(screen.getByRole('dialog', { name: 'Календарь' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: 'Календарь' })).not.toBeInTheDocument();
});
```

Also test outside click and second date click.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- CalendarPopover.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement popover placement**

Use `position: fixed`/portal or overlay layer anchored from `getBoundingClientRect()`. It must not participate in AppShell grid and therefore cannot resize workspace.

- [ ] **Step 4: Implement calendar content**

Russian month/day labels, previous/next month buttons, selected day, and note preview region. Keep calendar functionality intentionally small; no full Outlook-style dashboard.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- CalendarPopover.test.tsx AppShell.test.tsx`
Expected: PASS, including `no calendar column` invariant.

```bash
git add src/components/calendar src/components/sidebar src/App.tsx
git commit -m "feat: add date-triggered calendar popover"
```

---

### Task 10: Live Tile Settings panel with Basic / Advanced / Motion groups

**Files:**
- Create: `src/components/settings/TileSettingsPanel.tsx`
- Create: `src/components/settings/TileSettingsPanel.module.css`
- Create: `src/components/settings/TileSettingsPanel.test.tsx`
- Create: `src/components/settings/TilePreview.tsx`
- Create: `src/components/settings/TilePreview.module.css`
- Create: `src/components/settings/TilePreview.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: store actions and `TileAppearanceSettings`.
- Produces: live settings UI and preview; no separate Apply button.

- [ ] **Step 1: Write failing live-preview tests**

```tsx
it('updates tile radius immediately without an Apply action', async () => {
  const user = userEvent.setup();
  render(<TileSettingsPanel />);
  const radius = screen.getByLabelText('Скругление');
  await user.clear(radius);
  await user.type(radius, '24');
  expect(useAppStore.getState().tileSettings.radius).toBe(24);
  expect(document.documentElement.style.getPropertyValue('--tile-radius')).toBe('24px');
  expect(screen.queryByRole('button', { name: /применить/i })).not.toBeInTheDocument();
});

it('reset restores the standard preset', async () => {
  useAppStore.getState().setTileSetting('blur', 26);
  const user = userEvent.setup();
  render(<TileSettingsPanel />);
  await user.click(screen.getByRole('button', { name: 'Сбросить настройки плиток' }));
  expect(useAppStore.getState().tileSettings.blur).toBe(getTilePreset('standard').blur);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- TileSettingsPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the Basic group**

Controls, exact labels:
- `Представление`: Минимальный / Стандартный / Расширенный / Крупный / Список.
- `Размер`: S / M / L / XL.
- `Колонки`: Авто + numeric 2–8.
- `Ширина`, `Высота`, `Интервал`, `Скругление`, `Размер иконки`.
- switches `Название`, `Описание`, `Домен`, `Категория`, `Счётчик`.

Preset selection replaces the settings object with the canonical preset; individual changes then diverge from the preset while keeping `preset` as the last chosen base.

- [ ] **Step 4: Implement the Advanced group**

Controls:
- `Прозрачность стекла` 42–86%.
- `Размытие` 8–28px.
- `Насыщенность` 100–140%.
- `Интенсивность контура` 0–80%.
- `Тень` toggle + opacity 0–18%.
- `Свечение при наведении` toggle + 0–24%.
- `Свечение выбранной плитки` 0–30%.

Do not add ray-tracing, refraction meshes, chromatic aberration, particles, or animated liquid effects.

- [ ] **Step 5: Implement the Motion group**

Controls:
- `Анимация наведения`.
- `Подъём` 0–6px.
- `Масштаб` 1.00–1.04.
- `Нажатие` 0.94–1.00.
- `Длительность` 80–400ms.
- `Характер`: Стандартный / Мягкий / Быстрый.
- `Уменьшить движение`.

When reduced motion is on, preview and main grid must stop non-essential transforms even if sliders keep their saved values.

- [ ] **Step 6: Build the four-state live preview**

Render four deterministic tiles with labels `Обычное`, `Наведение`, `Нажатие`, `Выбрано`. Use `forcedState` so the preview does not depend on pointer location and remains screenshot-testable.

- [ ] **Step 7: Make Settings a real top-level workspace**

When `section === 'settings'`, render a compact settings frame with left navigation entries: `Общие`, `Оформление`, `Плитки сайтов`, `Боковая панель`, `Поиск`, `Погода и дата`, `Данные`, `Приватность`, `Горячие клавиши`. Only `Плитки сайтов` is fully implemented in milestone 1; other entries render concise non-interactive “следующий этап” descriptions, not fake controls. This keeps architecture visible without pretending unfinished features work.

- [ ] **Step 8: Run tests and commit**

Run: `npm test -- TileSettingsPanel.test.tsx TilePreview.test.tsx`
Expected: PASS.

```bash
git add src/components/settings src/App.tsx
git commit -m "feat: add live tile appearance settings"
```

---

### Task 11: Mobile/tablet adaptation and icon-forward navigation

**Files:**
- Modify: `src/components/shell/AppShell.module.css`
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/sidebar/Sidebar.module.css`
- Modify: `src/components/tiles/SpeedDialGrid.module.css`
- Create: `src/components/sidebar/MobileNavigation.tsx`
- Create: `src/components/sidebar/MobileNavigation.module.css`
- Create: `src/components/sidebar/MobileNavigation.test.tsx`

**Interfaces:**
- Produces mobile drawer/bottom-sheet trigger for projects/categories.
- Consumes existing project/category store actions.

- [ ] **Step 1: Write the mobile navigation test**

```tsx
it('shows projects and categories through compact mobile navigation', async () => {
  const user = userEvent.setup();
  render(<MobileNavigation />);
  await user.click(screen.getByRole('button', { name: 'Разделы' }));
  expect(screen.getByRole('dialog', { name: 'Разделы и проекты' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement responsive rules**

Breakpoints:
- `>= 1280px`: 300–320px sidebar, 5+ auto-fit tile columns.
- `761–1279px`: 260–290px sidebar, reduced tile columns.
- `<= 760px`: no persistent sidebar, compact header trigger, 2–3 tile columns, dock width constrained to viewport.

On mobile, categories/subcategories are icon-forward: icon is always visible; labels are compact and may appear beside or beneath the active item. Do not hide all labels to the point of ambiguity.

- [ ] **Step 3: Ensure settings become a full-height sheet on mobile**

No desktop-sized modal squeezed into a phone viewport. `TileSettingsPanel` uses one-column controls and sticky live-preview summary at top or collapsible preview.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- MobileNavigation.test.tsx && npm run build`
Expected: PASS.

```bash
git add src/components/shell src/components/sidebar src/components/tiles src/components/settings
git commit -m "feat: adapt Nexus shell and tiles for mobile"
```

---

### Task 12: Playwright interaction tests, visual regression, hard reference QA, CI gate

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/app-shell.spec.ts`
- Create: `e2e/visual.spec.ts`
- Create: `scripts/qa-reference.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Produces release-gate scripts `qa`, `qa:e2e`, `qa:full`.
- Consumes the entire milestone.

- [ ] **Step 1: Configure deterministic Playwright**

Use Chromium, `deviceScaleFactor: 1`, `locale: 'ru-RU'`, reduced motion disabled for baseline screenshots, and a fixed application clock via `page.addInitScript` only for screenshots. Do not freeze runtime clock in production code.

Define projects/viewports:

```ts
[
  { name: 'desktop', use: { viewport: { width: 1536, height: 1024 } } },
  { name: 'tablet', use: { viewport: { width: 1024, height: 900 } } },
  { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }
]
```

- [ ] **Step 2: Write interaction smoke tests**

`e2e/app-shell.spec.ts` must assert:
1. Home opens with Speed Dial tiles visible.
2. Settings dock button opens `Плитки сайтов` settings.
3. Radius/blur change updates preview and a real main-grid tile after returning Home.
4. Date click opens calendar; Escape closes it.
5. No permanent calendar column exists at any viewport.
6. Mobile has no persistent desktop sidebar.

- [ ] **Step 3: Add visual regression screenshots**

Capture exactly:
- `desktop-home.png`
- `desktop-tile-settings.png`
- `desktop-calendar-popover.png`
- `tablet-home.png`
- `mobile-home.png`
- `mobile-tile-settings.png`

Disable caret blinking and wait for document fonts before screenshots. Mask only genuinely unstable external image content; prefer local/generated icon fallback in snapshots so baseline remains deterministic.

- [ ] **Step 4: Implement hard reference assertions**

`scripts/qa-reference.mjs` should fail if source contains forbidden structural regressions. At minimum scan built/source text for:
- `calendar-column` — forbidden.
- CSS grid declarations with three persistent columns in `AppShell` — forbidden.
- shadow values with black opacity > 0.20 in core shell/tile CSS — forbidden.
- `filter: drop-shadow` stacks or `perspective`/`rotateX`/`rotateY` on `.tile` — forbidden.

Print explicit failure messages; exit non-zero.

- [ ] **Step 5: Extend package scripts**

```json
{
  "scripts": {
    "qa:reference": "node scripts/qa-reference.mjs",
    "qa:e2e": "playwright test e2e/app-shell.spec.ts",
    "qa:full": "npm run lint && npm run test && npm run build && npm run qa:reference && npm run qa:e2e && npm run test:visual"
  }
}
```

- [ ] **Step 6: Add GitHub Actions release gate**

Workflow steps: checkout → setup Node 22 → `npm ci` → Playwright browser install → `npm run qa:full`. Upload Playwright report and screenshot diff artifacts on failure. Do not deploy from a failing job.

- [ ] **Step 7: Run the complete gate locally**

Run: `npm run qa:full`
Expected: all checks PASS. If screenshot baselines are intentionally created for the first time, run `npm run test:visual -- --update-snapshots`, inspect every baseline manually, then rerun `npm run qa:full` without update mode.

- [ ] **Step 8: Manual visual QA checklist before reporting completion**

Confirm all items explicitly:
- Sidebar hierarchy is compact and readable.
- Omnibox is the dominant glass control but not oversized.
- Main grid has original colorful service icons.
- Tile radius/blur/shadow match settings live.
- No heavy black shadows, neon, fantasy refraction, or exaggerated 3D.
- Dock is centered, floating, and does not cover tiles.
- Calendar exists only as a popover.
- Settings preview shows normal/hover/pressed/selected states.
- Desktop, tablet, and mobile have no clipping/overflow.
- Russian text is legible and correctly spelled.

- [ ] **Step 9: Commit**

```bash
git add playwright.config.ts e2e scripts .github package.json
git commit -m "test: enforce visual and release quality gate"
```

---

## Final Milestone Verification

Before claiming milestone 1 is complete, execute exactly:

```bash
npm ci
npx playwright install --with-deps chromium
npm run qa:full
```

Expected result:
- ESLint: PASS
- Vitest: PASS
- TypeScript/Vite build: PASS
- reference invariant script: PASS
- Playwright interaction tests: PASS at desktop/tablet/mobile
- Playwright visual regression: PASS

Then inspect the six baseline screenshots manually against the approved Glass Design specification. Any mismatch in layout hierarchy, permanent calendar placement, excessive glass fantasy, icon fidelity, spacing, radii, or mobile overflow blocks completion.

## Out of Scope for Milestone 1

Do not implement cloud sync, accounts, collaboration, AI features, analytics dashboards, system-monitor widgets, browser-extension integration, deep category nesting, or custom GPU glass shaders. These belong to later specs after the first usable visual core passes its release gate.
