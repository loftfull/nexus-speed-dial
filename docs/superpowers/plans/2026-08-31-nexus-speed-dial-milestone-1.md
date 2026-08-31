# Nexus Speed Dial — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-usable Nexus Speed Dial experience with restrained Glass Design, configurable site tiles with immediate live preview, local persistence, responsive desktop/tablet/mobile behavior, and a release gate that blocks unverified work.

**Architecture:** Use Vite + React + TypeScript with small focused components, Zustand for application state, and an injected storage adapter for persistence. All glass/tile visual values are canonical CSS variables written by a single `TileStyleBridge`, so the main grid and settings preview cannot drift apart. Playwright interaction and screenshot tests enforce the approved visual architecture, including the rule that the calendar is always an overlay and never a persistent column.

**Tech Stack:** React 19, TypeScript 5.x, Vite 7, Zustand, Lucide React, CSS variables + CSS Modules, Vitest, Testing Library, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-31-nexus-speed-dial-design.md`

## Global Constraints

- Repository: `loftfull/nexus-speed-dial`; default branch at planning time: `English`.
- Execute implementation in an isolated feature worktree/branch, recommended branch name `codex/m1-glass-ui`.
- Russian-language UI with correct Cyrillic typography.
- Glass is used for shell and controls; site/service icons retain recognizable brand colors.
- No sci-fi, neon, excessive 3D, ray-traced/refraction glass, chromatic aberration, or particle effects.
- Calendar is never a permanent layout column; it opens only from the clickable date as a popover.
- Desktop first; tablet and mobile must be functional and visually coherent.
- CSS effects only: `rgba`, `backdrop-filter`, borders, shadows, transforms, transitions.
- Default background: `#F3F7FC` → `#EDF3FA`; accent: `#2F7CF6`.
- Main/secondary/muted text: `#101828` / `#667085` / `#98A2B3`.
- Default glass opacity `0.58–0.78`, blur `14–22px`, saturation `115–130%`.
- Default radii: panels `24–28px`, tiles `18–22px`, controls `14–18px`.
- Default tile motion: hover `translateY(-2px..-3px)`, scale `1.01..1.02`, pressed scale about `0.97`, duration `180–220ms`.
- Reduced-motion disables/minimizes non-essential transforms.
- No “готово” report while lint/type/unit/interaction/responsive/visual/reference QA is failing.

---

## File Structure

- `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html` — toolchain.
- `src/main.tsx`, `src/App.tsx` — bootstrap/root composition.
- `src/styles/tokens.css`, `src/styles/global.css` — design tokens/global typography.
- `src/components/primitives/GlassSurface.*` — semantic reusable glass surface.
- `src/domain/types.ts`, `src/domain/tilePresets.ts` — domain contracts and presets.
- `src/data/seed.ts` — first-launch projects/categories/sites.
- `src/storage/StorageAdapter.ts`, `src/storage/localStorageAdapter.ts` — persistence boundary.
- `src/state/appStore.ts`, `src/state/TileStyleBridge.tsx` — state/actions and CSS-variable bridge.
- `src/components/shell/AppShell.*` — two-column desktop shell and responsive structure.
- `src/components/sidebar/Sidebar.*`, `MobileNavigation.*` — time/weather/projects/categories.
- `src/components/omnibox/Omnibox.*`, `src/components/workspace/WorkspaceHeader.*` — top controls.
- `src/components/tiles/SiteIcon.*`, `SiteTile.*`, `SpeedDialGrid.*` — tile engine.
- `src/components/dock/Dock.*` — six top-level sections.
- `src/components/calendar/CalendarPopover.*` — date-triggered calendar overlay.
- `src/components/settings/TileSettingsPanel.*`, `TilePreview.*` — live tile configuration.
- `src/test/setup.ts`, `src/test/memoryStorage.ts`, `src/test/fixtures.ts` — deterministic test support.
- `e2e/app-shell.spec.ts`, `e2e/visual.spec.ts`, `playwright.config.ts` — interaction/visual QA.
- `scripts/qa-reference.mjs` — hard source invariants.
- `.github/workflows/ci.yml` — release gate.

---

### Task 1: Scaffold and canonical Glass Design tokens

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`
- Create: `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Create: `src/components/primitives/GlassSurface.tsx`, `GlassSurface.module.css`, `GlassSurface.test.tsx`

**Interfaces:**
- Produces: `GlassSurface({ as, role, className, children })` and all global design tokens.
- Consumes: none.

- [ ] **Step 1: Create package/tooling baseline**

Use scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test e2e/app-shell.spec.ts",
  "test:visual": "playwright test e2e/visual.spec.ts"
}
```

Dependencies: `react`, `react-dom`, `zustand`, `lucide-react`. Dev dependencies: Vite React plugin, TypeScript, ESLint + TypeScript ESLint + React Hooks/Refresh, Vitest, jsdom, Testing Library + jest-dom + user-event, Playwright.

- [ ] **Step 2: Write the failing glass primitive test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlassSurface } from './GlassSurface';

describe('GlassSurface', () => {
  it('exposes its semantic surface role', () => {
    render(<GlassSurface role="panel">Контент</GlassSurface>);
    expect(screen.getByText('Контент')).toHaveAttribute('data-glass-role', 'panel');
  });
});
```

- [ ] **Step 3: Run test to verify RED**

Run: `npm install && npm test -- GlassSurface.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 4: Implement design tokens**

`src/styles/tokens.css` must include:

```css
:root {
  --nexus-bg-top: #f3f7fc;
  --nexus-bg-bottom: #edf3fa;
  --nexus-accent: #2f7cf6;
  --nexus-text: #101828;
  --nexus-text-secondary: #667085;
  --nexus-text-muted: #98a2b3;
  --nexus-glass-panel: rgba(255,255,255,.68);
  --nexus-glass-control: rgba(255,255,255,.62);
  --nexus-glass-border: rgba(255,255,255,.60);
  --nexus-glass-border-secondary: rgba(120,145,180,.10);
  --nexus-blur-panel: 20px;
  --nexus-blur-control: 16px;
  --nexus-saturation: 122%;
  --nexus-radius-panel: 26px;
  --nexus-radius-tile: 20px;
  --nexus-radius-control: 16px;
  --nexus-shadow-panel: 0 8px 28px rgba(55,80,120,.08);
  --nexus-shadow-control: 0 3px 10px rgba(40,70,110,.07);
  --nexus-motion-fast: 180ms;
  --nexus-motion-normal: 210ms;
  --nexus-ease: cubic-bezier(.2,.8,.2,1);
}
```

- [ ] **Step 5: Implement `GlassSurface`**

```tsx
import type { ElementType, PropsWithChildren } from 'react';
import styles from './GlassSurface.module.css';

type GlassRole = 'panel' | 'control' | 'dock' | 'popover';
type Props = PropsWithChildren<{ as?: ElementType; role?: GlassRole; className?: string }>;

export function GlassSurface({ as: Tag = 'div', role = 'panel', className = '', children }: Props) {
  return <Tag className={`${styles.surface} ${styles[role]} ${className}`} data-glass-role={role}>{children}</Tag>;
}
```

The CSS role classes differ only in opacity/blur/shadow strength; they must not duplicate arbitrary colors/radii outside tokens.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm run lint && npm test -- GlassSurface.test.tsx && npm run build`
Expected: PASS.

```bash
git add .
git commit -m "chore: scaffold Nexus glass design system"
```

---

### Task 2: Domain model, presets, storage, deterministic test fixtures

**Files:**
- Create: `src/domain/types.ts`, `src/domain/tilePresets.ts`, `src/domain/tilePresets.test.ts`
- Create: `src/storage/StorageAdapter.ts`, `src/storage/localStorageAdapter.ts`, `src/storage/localStorageAdapter.test.ts`
- Create: `src/data/seed.ts`
- Create: `src/test/memoryStorage.ts`, `src/test/fixtures.ts`

**Interfaces:**
- Produces: `TilePreset`, `TileAppearanceSettings`, `Site`, `Project`, `Category`, `AppSection`, `getTilePreset`, `normalizeTileSettings`, `StorageAdapter`, `createMemoryStorage`, `sampleSite`.
- Consumes: none from UI.

- [ ] **Step 1: Define exact domain types**

```ts
export type TilePreset = 'minimal' | 'standard' | 'expanded' | 'large' | 'list';
export type TileSize = 'S' | 'M' | 'L' | 'XL';
export type AppSection = 'home' | 'favorites' | 'recent' | 'downloads' | 'notes' | 'settings';

export interface Site {
  id: string; title: string; url: string; domain: string; projectId: string;
  subtitle?: string; categoryId?: string; iconUrl?: string; favorite: boolean; badge?: string;
}
export interface Project { id: string; name: string; icon: string; }
export interface Category { id: string; name: string; projectId: string; parentId?: string; icon: string; }

export interface TileAppearanceSettings {
  preset: TilePreset; size: TileSize; columns: 'auto' | number;
  width: number; height: number; gap: number; radius: number; iconSize: number;
  showTitle: boolean; showSubtitle: boolean; showDomain: boolean; showCategory: boolean; showBadge: boolean;
  glassOpacity: number; blur: number; saturation: number; borderOpacity: number;
  shadowEnabled: boolean; shadowOpacity: number;
  hoverGlow: boolean; hoverGlowIntensity: number; selectedGlowIntensity: number;
  hoverEnabled: boolean; hoverLift: number; hoverScale: number; pressedScale: number;
  transitionMs: number; easing: 'standard' | 'soft' | 'snappy'; reducedMotion: boolean;
}
```

- [ ] **Step 2: Write failing preset tests**

```ts
import { describe, expect, it } from 'vitest';
import { getTilePreset, normalizeTileSettings } from './tilePresets';

describe('tile presets', () => {
  it('keeps minimal tiles compact', () => {
    const p = getTilePreset('minimal');
    expect(p.showSubtitle).toBe(false);
    expect(p.showDomain).toBe(false);
    expect(p.height).toBeLessThan(150);
  });

  it('clamps unsafe visual values', () => {
    const p = normalizeTileSettings({ ...getTilePreset('standard'), blur: 99, glassOpacity: .1 });
    expect(p.blur).toBe(28);
    expect(p.glassOpacity).toBe(.42);
  });
});
```

Run: `npm test -- tilePresets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement canonical preset objects and normalization**

Use sizes: minimal `128x128`, standard `170x180`, expanded `188x204`, large `220x224`, list `260x76`. Clamp values to:

```ts
export const tileBounds = {
  width: [112,260], height: [76,240], gap: [8,32], radius: [10,30], iconSize: [32,84],
  glassOpacity: [.42,.86], blur: [8,28], saturation: [100,140], borderOpacity: [0,.8],
  shadowOpacity: [0,.18], hoverGlowIntensity: [0,.24], selectedGlowIntensity: [0,.30],
  hoverLift: [0,6], hoverScale: [1,1.04], pressedScale: [.94,1], transitionMs: [80,400]
} as const;
```

- [ ] **Step 4: Define storage contract and test malformed data**

```ts
export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}
```

Test that invalid JSON returns the fallback without throwing.

- [ ] **Step 5: Create deterministic memory storage and fixture**

`src/test/memoryStorage.ts`:

```ts
import type { StorageAdapter } from '../storage/StorageAdapter';
export function createMemoryStorage(): StorageAdapter {
  const values = new Map<string, unknown>();
  return {
    get: <T,>(key: string, fallback: T) => (values.has(key) ? values.get(key) as T : fallback),
    set: (key, value) => { values.set(key, value); },
    remove: key => { values.delete(key); }
  };
}
```

`src/test/fixtures.ts`:

```ts
import type { Site } from '../domain/types';
export const sampleSite: Site = {
  id: 'github', title: 'GitHub', url: 'https://github.com', domain: 'github.com',
  projectId: 'home', categoryId: 'development', favorite: true
};
```

- [ ] **Step 6: Seed recognizable services**

Include Telegram, РБК, VC.ru, YouTube, Google Фото, Google Диск, Google Календарь, Gmail, Todoist, Dropbox, Ozon, Сбербанк, Яндекс Метрика, GitHub, Kaspersky. Icon URLs are optional data; broken images must be handled later.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- tilePresets.test.ts localStorageAdapter.test.ts`
Expected: PASS.

```bash
git add src/domain src/storage src/data src/test
git commit -m "feat: define tile model presets and storage boundary"
```

---

### Task 3: Persistent app store and one-way CSS-variable bridge

**Files:**
- Create: `src/state/appStore.ts`, `src/state/appStore.test.ts`
- Create: `src/state/TileStyleBridge.tsx`, `src/state/TileStyleBridge.test.tsx`

**Interfaces:**
- Produces: `createAppStore(storage)`, browser `useAppStore`, actions `setSection`, `setActiveProject`, `setActiveCategory`, `setBookmarkQuery`, `setWorkspaceTab`, `setViewMode`, `setTileSetting`, `applyTilePreset`, `resetTileSettings`.
- `TileStyleBridge` is the only code that writes tile-style CSS custom properties to `document.documentElement`.
- Consumes: Task 2 domain/storage.

- [ ] **Step 1: Write failing store tests with defined memory storage**

```ts
import { createMemoryStorage } from '../test/memoryStorage';
import { createAppStore } from './appStore';

it('changes one setting without replacing unrelated settings', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  const before = store.getState().tileSettings;
  store.getState().setTileSetting('radius', 24);
  expect(store.getState().tileSettings.radius).toBe(24);
  expect(store.getState().tileSettings.iconSize).toBe(before.iconSize);
});

it('persists tile settings', () => {
  const storage = createMemoryStorage();
  const store = createAppStore(storage);
  store.getState().setTileSetting('blur', 24);
  expect(storage.get('nexus.tileSettings', null)?.blur).toBe(24);
});
```

Run: `npm test -- appStore.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement store with injected storage**

Use Zustand vanilla store for `createAppStore` so tests are isolated. Components must never call `localStorage` directly.

- [ ] **Step 3: Write failing bridge test**

```tsx
it('reflects radius as a CSS variable', () => {
  render(<TileStyleBridge />);
  act(() => useAppStore.getState().setTileSetting('radius', 24));
  expect(document.documentElement.style.getPropertyValue('--tile-radius')).toBe('24px');
});
```

- [ ] **Step 4: Implement exact bridge variables**

Set at least `--tile-width`, `--tile-height`, `--tile-gap`, `--tile-radius`, `--tile-icon-size`, `--tile-glass-opacity`, `--tile-blur`, `--tile-saturation`, `--tile-border-opacity`, `--tile-shadow-opacity`, `--tile-hover-lift`, `--tile-hover-scale`, `--tile-pressed-scale`, `--tile-transition`. When `reducedMotion=true`, output lift `0px`, scales `1`, duration `0ms` while preserving saved slider values.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- appStore.test.ts TileStyleBridge.test.tsx`
Expected: PASS.

```bash
git add src/state
git commit -m "feat: add persistent live tile style state"
```

---

### Task 4: App shell, sidebar, omnibox, workspace header, dock

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `AppShell.module.css`, `AppShell.test.tsx`
- Create: `src/components/sidebar/Sidebar.tsx`, `Sidebar.module.css`, `Sidebar.test.tsx`
- Create: `src/components/omnibox/Omnibox.tsx`, `Omnibox.module.css`, `Omnibox.test.tsx`
- Create: `src/components/workspace/WorkspaceHeader.tsx`, `WorkspaceHeader.module.css`, `WorkspaceHeader.test.tsx`
- Create: `src/components/dock/Dock.tsx`, `Dock.module.css`, `Dock.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- AppShell slots: `sidebar`, `topbar`, `workspace`, `dock`, `overlays`.
- Sidebar receives `onDateClick` and uses store project/category actions.
- WorkspaceHeader writes `bookmarkQuery`, `workspaceTab`, `viewMode`.
- Dock writes `section`.

- [ ] **Step 1: Write hard shell invariant test**

```tsx
it('uses no permanent calendar column', () => {
  render(<App />);
  expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  expect(screen.queryByTestId('calendar-column')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement two-column desktop shell**

```css
.shell {
  min-height: 100dvh;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(300px,320px) minmax(0,1fr);
  gap: 16px;
}
.sidebar { grid-column: 1; }
.main { grid-column: 2; min-width: 0; }
```

Never add a third persistent column.

- [ ] **Step 3: Write/implement Sidebar tests**

Test project switching and assert the date is a button named `Открыть календарь`, with no calendar grid present by default. Implement clock/date using `Intl.DateTimeFormat('ru-RU')`; update time every 30s and clean interval. Weather summary in milestone 1 is deterministic model data `{ temperature: 22, condition: 'Облачно', feelsLike: 21 }`; do not trigger geolocation on mount.

- [ ] **Step 4: Implement projects/categories hierarchy**

Render roots plus one child level only. Active state is subtle blue glass, not saturated fill. Keep compact counters.

- [ ] **Step 5: Implement omnibox**

Exact placeholder: `Введите запрос или адрес`; Lucide `ArrowLeft`, `ArrowRight`, `Search`, `Star`, `ShieldCheck`, `UserCircle`, `ChevronDown`. Back/forward are accessible but disabled in milestone 1 rather than pretending browser integration exists.

- [ ] **Step 6: Implement workspace header**

Tabs: `Быстрый доступ`, `Недавние`, `Избранное`; search placeholder `Поиск по закладкам`; grid/list buttons use `aria-pressed`. Active tab is translucent capsule with blue text.

- [ ] **Step 7: Implement Dock**

Six buttons: `Главная`, `Избранное`, `Недавние`, `Загрузки`, `Заметки`, `Настройки`; icons `House`, `Star`, `Clock3`, `Download`, `NotebookText`, `Settings`. Dock is fixed centered at bottom and workspace reserves bottom padding.

- [ ] **Step 8: Verify and commit**

Run: `npm test -- AppShell.test.tsx Sidebar.test.tsx Omnibox.test.tsx WorkspaceHeader.test.tsx Dock.test.tsx && npm run build`
Expected: PASS.

```bash
git add src/App.tsx src/components/shell src/components/sidebar src/components/omnibox src/components/workspace src/components/dock
git commit -m "feat: build Nexus application shell"
```

---

### Task 5: SiteTile engine, icon fallback, grid/list rendering

**Files:**
- Create: `src/components/tiles/SiteIcon.tsx`, `SiteIcon.test.tsx`
- Create: `src/components/tiles/SiteTile.tsx`, `SiteTile.module.css`, `SiteTile.test.tsx`
- Create: `src/components/tiles/SpeedDialGrid.tsx`, `SpeedDialGrid.module.css`, `SpeedDialGrid.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `SiteIcon({ site })` uses original icon and replaces failures with generated domain/letter fallback.
- `SiteTile({ site, mode, forcedState? })` supports `normal | hover | pressed | selected | focus | dragging | drop-target` visual states; `forcedState` is test/preview only.
- `SpeedDialGrid` filters by project/category/tab/query and chooses grid/list layout.

- [ ] **Step 1: Write broken-icon test with defined fixture**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { sampleSite } from '../../test/fixtures';
import { SiteIcon } from './SiteIcon';

it('falls back when favicon fails', () => {
  render(<SiteIcon site={{ ...sampleSite, iconUrl: '/broken.png' }} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByTestId('site-icon-fallback')).toHaveTextContent('G');
});
```

- [ ] **Step 2: Write pressed-state test**

```tsx
render(<SiteTile site={sampleSite} mode="standard" />);
const tile = screen.getByRole('link', { name: /GitHub/i });
fireEvent.pointerDown(tile);
expect(tile).toHaveAttribute('data-tile-state', 'pressed');
fireEvent.pointerUp(tile);
expect(tile).toHaveAttribute('data-tile-state', 'normal');
```

Run: `npm test -- SiteIcon.test.tsx SiteTile.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement tile visuals only from variables**

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
@media (hover:hover) {
  .tile:hover { transform: translateY(calc(var(--tile-hover-lift) * -1)) scale(var(--tile-hover-scale)); }
}
.tile[data-tile-state='pressed'] { transform: scale(var(--tile-pressed-scale)); }
.tile:focus-visible { outline: 2px solid color-mix(in srgb,var(--nexus-accent) 70%,white); outline-offset: 3px; }
```

Do not recolor all service icons into one artificial icon style.

- [ ] **Step 4: Implement filtering**

Filter case-insensitively across `title`, `domain`, `subtitle`; additionally filter by active project/category and favorites tab. `columns='auto'` uses `repeat(auto-fill,minmax(var(--tile-width),1fr))`; explicit columns use `--tile-columns`.

- [ ] **Step 5: Implement all five modes**

Minimal: icon + title only. Standard: icon + title + subtitle. Expanded: icon + title + subtitle + domain/category as enabled. Large: same metadata with larger geometry. List: horizontal compact row with icon/title/domain/category.

- [ ] **Step 6: Add `+ Добавить сайт` card**

Use subtle dashed glass border; no oversized CTA. In milestone 1 it opens a small modal that accepts URL and title and appends a local site to store; metadata fetching is not required.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- SiteIcon.test.tsx SiteTile.test.tsx SpeedDialGrid.test.tsx`
Expected: PASS.

```bash
git add src/components/tiles src/App.tsx
git commit -m "feat: implement configurable speed dial tiles"
```

---

### Task 6: Calendar popover and live tile settings

**Files:**
- Create: `src/components/calendar/CalendarPopover.tsx`, `CalendarPopover.module.css`, `CalendarPopover.test.tsx`
- Create: `src/components/settings/TileSettingsPanel.tsx`, `TileSettingsPanel.module.css`, `TileSettingsPanel.test.tsx`
- Create: `src/components/settings/TilePreview.tsx`, `TilePreview.module.css`, `TilePreview.test.tsx`
- Modify: `src/components/sidebar/Sidebar.tsx`, `src/App.tsx`

**Interfaces:**
- `CalendarPopover({ open, anchorRef, onClose, selectedDate, onSelectDate })`.
- Tile settings write store actions immediately; no Apply button.
- Preview uses `SiteTile.forcedState` for deterministic `normal`, `hover`, `pressed`, `selected` examples.

- [ ] **Step 1: Write calendar behavior test**

```tsx
it('opens from date and closes on Escape', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.queryByRole('dialog', { name: 'Календарь' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
  expect(screen.getByRole('dialog', { name: 'Календарь' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: 'Календарь' })).not.toBeInTheDocument();
});
```

Also test outside click and second date click.

- [ ] **Step 2: Implement popover without layout participation**

Render into the overlay slot/portal with `position: fixed`, placed using the date button rectangle. Include Russian month navigation, selected day, optional note preview. It must not alter shell grid dimensions.

- [ ] **Step 3: Write live settings test with explicit import**

```tsx
import { getTilePreset } from '../../domain/tilePresets';

it('changes radius immediately and has no Apply button', async () => {
  const user = userEvent.setup();
  render(<TileSettingsPanel />);
  const input = screen.getByLabelText('Скругление');
  await user.clear(input);
  await user.type(input, '24');
  expect(useAppStore.getState().tileSettings.radius).toBe(24);
  expect(document.documentElement.style.getPropertyValue('--tile-radius')).toBe('24px');
  expect(screen.queryByRole('button', { name: /применить/i })).not.toBeInTheDocument();
});

it('reset restores standard values', async () => {
  useAppStore.getState().setTileSetting('blur', 26);
  const user = userEvent.setup();
  render(<TileSettingsPanel />);
  await user.click(screen.getByRole('button', { name: 'Сбросить настройки плиток' }));
  expect(useAppStore.getState().tileSettings.blur).toBe(getTilePreset('standard').blur);
});
```

- [ ] **Step 4: Implement Basic settings**

Exact controls: `Представление` (Минимальный/Стандартный/Расширенный/Крупный/Список), `Размер` S/M/L/XL, `Колонки` Авто or 2–8, `Ширина`, `Высота`, `Интервал`, `Скругление`, `Размер иконки`, switches `Название`, `Описание`, `Домен`, `Категория`, `Счётчик`.

- [ ] **Step 5: Implement Advanced settings**

`Прозрачность стекла` 42–86%, `Размытие` 8–28px, `Насыщенность` 100–140%, `Интенсивность контура` 0–80%, `Тень` + 0–18%, `Свечение при наведении` + 0–24%, `Свечение выбранной плитки` 0–30%.

- [ ] **Step 6: Implement Motion settings**

`Анимация наведения`, `Подъём` 0–6px, `Масштаб` 1.00–1.04, `Нажатие` .94–1.00, `Длительность` 80–400ms, `Характер` Стандартный/Мягкий/Быстрый, `Уменьшить движение`.

- [ ] **Step 7: Implement four-state preview**

Four tiles labelled `Обычное`, `Наведение`, `Нажатие`, `Выбрано`. Changes must affect preview and the home grid through the same CSS variables.

- [ ] **Step 8: Implement settings shell honestly**

Settings navigation contains: `Общие`, `Оформление`, `Плитки сайтов`, `Боковая панель`, `Поиск`, `Погода и дата`, `Данные`, `Приватность`, `Горячие клавиши`. In milestone 1, `Плитки сайтов` is enabled; other entries are visibly disabled with `aria-disabled="true"` and no fake toggles. This avoids presenting unimplemented controls as working functionality.

- [ ] **Step 9: Verify and commit**

Run: `npm test -- CalendarPopover.test.tsx TileSettingsPanel.test.tsx TilePreview.test.tsx AppShell.test.tsx`
Expected: PASS.

```bash
git add src/components/calendar src/components/settings src/components/sidebar src/App.tsx
git commit -m "feat: add calendar popover and live tile settings"
```

---

### Task 7: Responsive tablet/mobile adaptation

**Files:**
- Create: `src/components/sidebar/MobileNavigation.tsx`, `MobileNavigation.module.css`, `MobileNavigation.test.tsx`
- Modify: `src/components/shell/AppShell.module.css`, `src/components/sidebar/Sidebar.module.css`, `src/components/tiles/SpeedDialGrid.module.css`, `src/components/settings/TileSettingsPanel.module.css`

**Interfaces:**
- `MobileNavigation` opens `dialog` named `Разделы и проекты` and reuses existing project/category store actions.

- [ ] **Step 1: Write mobile navigation test**

```tsx
it('opens compact project/category navigation', async () => {
  const user = userEvent.setup();
  render(<MobileNavigation />);
  await user.click(screen.getByRole('button', { name: 'Разделы' }));
  expect(screen.getByRole('dialog', { name: 'Разделы и проекты' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement breakpoints**

- `>=1280px`: 300–320px sidebar; auto-fit grid normally yields about five columns at 1536px.
- `761–1279px`: sidebar 260–290px; fewer columns.
- `<=760px`: no persistent sidebar; mobile navigation trigger; 2–3 tile columns; dock constrained to viewport.

- [ ] **Step 3: Mobile category presentation**

Icons are always visible; labels remain visible for active/ambiguous items. Do not reduce navigation to unlabeled mystery icons.

- [ ] **Step 4: Mobile settings layout**

One-column controls; preview becomes compact sticky header or collapsible block. Do not squeeze desktop two-column settings into 390px width.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- MobileNavigation.test.tsx && npm run build`
Expected: PASS.

```bash
git add src/components/sidebar src/components/shell src/components/tiles src/components/settings
git commit -m "feat: adapt Nexus UI for tablet and mobile"
```

---

### Task 8: Release gate, screenshot regression, hard visual invariants, CI

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/app-shell.spec.ts`, `e2e/visual.spec.ts`
- Create: `scripts/qa-reference.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Produces scripts `qa:reference`, `qa:e2e`, `qa:full`.
- Consumes entire milestone.

- [ ] **Step 1: Configure deterministic Playwright projects**

Use Chromium, `locale: 'ru-RU'`, `deviceScaleFactor: 1` and viewports:

```ts
[
  { name: 'desktop', use: { viewport: { width: 1536, height: 1024 } } },
  { name: 'tablet', use: { viewport: { width: 1024, height: 900 } } },
  { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }
]
```

Freeze clock only in Playwright screenshot setup, never production runtime. Wait for `document.fonts.ready` before screenshots.

- [ ] **Step 2: Write interaction E2E**

Assert:
1. Home shows site tiles.
2. Settings dock opens tile settings.
3. Radius/blur changes persist when returning Home.
4. Date opens calendar; Escape closes.
5. `[data-testid="calendar-column"]` never exists.
6. Mobile does not render persistent desktop sidebar.

- [ ] **Step 3: Write visual baselines**

Create exactly six screenshots: `desktop-home.png`, `desktop-tile-settings.png`, `desktop-calendar-popover.png`, `tablet-home.png`, `mobile-home.png`, `mobile-tile-settings.png`. Avoid masking core UI. Use deterministic/local icon rendering for baseline if remote icons are unstable.

- [ ] **Step 4: Implement source-reference guard without false positives**

`scripts/qa-reference.mjs` scans only production `src/**/*.tsx` and `src/**/*.module.css`, explicitly excluding `*.test.*`, `src/test/**`, docs, and e2e files. It exits non-zero if:
- production markup contains `data-testid="calendar-column"`;
- `AppShell.module.css` defines a three-or-more persistent-column grid;
- `.tile` production CSS contains `perspective`, `rotateX`, `rotateY`, or chained `drop-shadow` effects;
- shell/tile production CSS contains black shadow alpha greater than `.20`.

Each failure prints the file/path and violated rule.

- [ ] **Step 5: Add package release scripts**

```json
{
  "qa:reference": "node scripts/qa-reference.mjs",
  "qa:e2e": "playwright test e2e/app-shell.spec.ts",
  "qa:full": "npm run lint && npm run test && npm run build && npm run qa:reference && npm run qa:e2e && npm run test:visual"
}
```

- [ ] **Step 6: Add GitHub Actions gate**

Workflow: checkout → Node 22 → `npm ci` → install Chromium Playwright deps → `npm run qa:full`. Upload Playwright report and screenshot diffs on failure. No deployment step may depend on a failed job.

- [ ] **Step 7: Create and inspect first baselines**

First baseline creation only: `npm run test:visual -- --update-snapshots`. Manually inspect all six screenshots for spacing, radii, glass intensity, original icon colors, dock placement, sidebar hierarchy, Russian typography, no permanent calendar column, and no mobile clipping. Then run visual tests again without update mode.

- [ ] **Step 8: Run complete release gate**

```bash
npm ci
npx playwright install --with-deps chromium
npm run qa:full
```

Expected: ESLint PASS; Vitest PASS; TypeScript/Vite build PASS; reference guard PASS; Playwright interaction PASS for desktop/tablet/mobile; screenshot regression PASS.

- [ ] **Step 9: Commit**

```bash
git add playwright.config.ts e2e scripts .github package.json
git commit -m "test: enforce Nexus visual release gate"
```

---

## Final Milestone Acceptance

Milestone 1 can be reported complete only after `npm run qa:full` passes and the six visual baselines are manually checked against the approved Glass Design. Any failure in layout hierarchy, excessive/fantasy glass effects, icon fidelity, live tile settings, dock overlap, Russian typography, mobile overflow, or the calendar-column invariant blocks completion.

## Explicitly Out of Scope

Cloud sync/accounts, collaboration, AI features, analytics dashboards, system-monitor widgets, deep category nesting, browser-extension integration, and custom GPU/refraction glass shaders are excluded from Milestone 1. They require later specs after this visual core passes its release gate.
