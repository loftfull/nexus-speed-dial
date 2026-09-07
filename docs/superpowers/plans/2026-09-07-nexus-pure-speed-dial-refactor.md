# Nexus Pure Speed Dial Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated dashboard/navigation architecture with one coherent Pure Speed Dial screen centered on Spaces, a two-level category tree, one Omnibox, and All/Favorites/Recent workspace modes.

**Architecture:** Keep the existing React/Vite/storage foundation but replace `AppSection + WorkspaceTab + Project` navigation with canonical `activeSpaceId + activeCategoryId + contentMode + layoutMode`. Preserve existing storage/backups through deterministic migration. Remove Dock, Downloads/Notes top-level UI, duplicate bookmark search/filter, duplicate category structures and low-level user-facing visual tuning.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, CSS Modules, Lucide, dependency-free `node:test` contracts, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-nexus-pure-speed-dial-architecture-design.md`

## Global Constraints

- Work only on `codex/m1-glass-ui`; do not merge or publish to default branch without explicit permission.
- Russian UI and high-quality Cyrillic typography.
- Spaces are strict: every site/category belongs to exactly one Space.
- Category depth is at most two levels.
- All/Favorites/Recent are workspace modes scoped to active Space/category.
- Omnibox is the only search field.
- One Settings entry point and one Settings side-sheet.
- Existing sites/categories/history/notes/backups must not be silently lost.
- Calendar stays overlay-only.
- Preserve original service favicons/colors.
- Full release gate remains lint → Vitest → build → node contracts → reference QA → E2E → visual.

---

### Task 1: Canonical Pure Speed Dial domain and selector

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/workspace.ts`
- Modify: `src/test/workspace.node.test.ts`

**Interfaces:**
- Produces: `ContentMode = 'all' | 'favorites' | 'recent'`, `LayoutMode = 'grid' | 'list'`, `Space`, `Site.position`, `Category.position`, `spaceId` fields.
- Produces: `selectWorkspaceSites({ sites, categories, history, spaceId, categoryId, mode })`.

- [ ] **Step 1: Write/replace selector contracts first**

Add tests proving: strict space scope, parent includes direct child, favorites stay scoped, Recent uses history order, canonical position sorts non-Recent results.

```ts
const result = selectWorkspaceSites({
  sites, categories, history,
  spaceId: 'work', categoryId: null, mode: 'favorites',
});
assert.deepEqual(result.map(site => site.id), ['github']);
```

- [ ] **Step 2: Run `npm run test:node` and confirm the new contracts fail for the old API**
- [ ] **Step 3: Replace legacy navigation/domain types and implement canonical selector**
- [ ] **Step 4: Run `npm run test:node` and confirm selector contracts pass**
- [ ] **Step 5: Commit `refactor: define Pure Speed Dial domain`**

### Task 2: Storage migration and canonical app store

**Files:**
- Modify: `src/state/appStore.ts`
- Modify: `src/state/appStore.node.test.ts`
- Modify: `src/test/structureCrud.node.test.ts`
- Modify: `src/test/historyNotes.node.test.ts`
- Modify: `src/data/seed.ts`

**Interfaces:**
- Consumes Task 1 `Space`, `ContentMode`, `LayoutMode`.
- Produces state: `activeSpaceId`, `activeCategoryId`, `contentMode`, `layoutMode`, `query`, `spaces`.
- Produces actions: `setActiveSpace`, `setActiveCategory`, `setContentMode`, `setLayoutMode`, `setQuery`, `addSpace`, `updateSpace`, `removeSpace`, existing category/site CRUD adapted to `spaceId`.

- [ ] **Step 1: Add migration/store tests before store changes**

```ts
assert.equal(store.getState().activeSpaceId, 'home');
store.getState().setContentMode('favorites');
assert.equal(store.getState().contentMode, 'favorites');
```

Add a storage fixture using old `nexus.projects`/`projectId` payloads and assert they load as Spaces/`spaceId` without losing sites.

- [ ] **Step 2: Run Node contracts and confirm expected failures**
- [ ] **Step 3: Implement deterministic legacy Project→Space normalization**
- [ ] **Step 4: Add `position` normalization preserving array order**
- [ ] **Step 5: Replace `section/workspaceTab/viewMode/bookmarkQuery/activeProjectId/projects` with canonical state/API**
- [ ] **Step 6: Preserve notes internally but remove them from navigation state**
- [ ] **Step 7: Run Node contracts**
- [ ] **Step 8: Commit `refactor: migrate store to spaces and content modes`**

### Task 3: Backup compatibility

**Files:**
- Modify: `src/domain/backup.ts`
- Modify: `src/test/backup.node.test.ts`
- Modify: `src/components/sections/DataControls.tsx` or replacement Settings data component

**Interfaces:**
- Import version-1 legacy backups.
- Export canonical Pure Speed Dial data while retaining legacy notes payload safely.

- [ ] **Step 1: Add tests for importing old `projects/projectId` backup into Spaces**
- [ ] **Step 2: Add tests that no site is lost and positions are deterministic**
- [ ] **Step 3: Implement version-compatible parser/normalizer**
- [ ] **Step 4: Verify backup round-trip contracts**
- [ ] **Step 5: Commit `refactor: preserve backups across space migration`**

### Task 4: One-screen shell and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/shell/AppShell.tsx`
- Modify: `src/components/shell/AppShell.module.css`
- Delete after replacement: `src/components/dock/Dock.tsx`
- Delete after replacement: `src/components/dock/Dock.module.css`
- Remove top-level section dependencies from `src/components/sections/SectionContent.tsx`

**Interfaces:**
- App always renders one workspace.
- Overlays remain Calendar, Weather, Settings, StructureEditor, SiteEditor.

- [ ] **Step 1: Add source/reference QA asserting no Dock and no AppSection navigation**
- [ ] **Step 2: Replace shell layout with Sidebar + Workspace only**
- [ ] **Step 3: Remove Dock render and top-level section switching**
- [ ] **Step 4: Keep legacy notes data inaccessible but preserved**
- [ ] **Step 5: Run build/reference contracts**
- [ ] **Step 6: Commit `refactor: collapse app to one Speed Dial screen`**

### Task 5: Sidebar = Spaces + one category tree + utility status

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`
- Modify: `src/components/sidebar/Sidebar.module.css`
- Modify: `src/components/structure/StructureEditor.tsx`
- Modify: `src/components/structure/StructureEditor.module.css`
- Modify: `src/domain/navigationIcon.ts`

**Interfaces:**
- Sidebar lists Spaces once.
- Categories appear in one tree only.
- `⋯` owns rename/delete management; headings own one `+` each.
- Utility footer exposes date/time and weather triggers.

- [ ] **Step 1: Add source contracts forbidding `Проводник`, duplicate category chips, permanent pencils and forecast block**
- [ ] **Step 2: Implement compact Spaces list with active state and per-item context menu**
- [ ] **Step 3: Implement one two-level category tree with `Все сайты` virtual root**
- [ ] **Step 4: Move clock/weather/date to compact footer and remove multi-day forecast**
- [ ] **Step 5: Adapt StructureEditor copy/actions from Project→Space**
- [ ] **Step 6: Run Node/reference/build checks**
- [ ] **Step 7: Commit `refactor: simplify sidebar navigation`**

### Task 6: Workspace header and one Omnibox

**Files:**
- Modify: `src/components/omnibox/Omnibox.tsx`
- Modify: `src/components/omnibox/Omnibox.module.css`
- Modify: `src/domain/omnibox.ts`
- Modify: `src/components/workspace/WorkspaceHeader.tsx`
- Modify: `src/components/workspace/WorkspaceHeader.module.css`

**Interfaces:**
- Omnibox globally searches saved sites and displays Space/category context.
- Workspace header exposes only content mode + Grid/List + Settings.

- [ ] **Step 1: Add Omnibox tests for global result context and safe URL/web-search behavior**
- [ ] **Step 2: Remove Back/Forward, Shield and profile UI**
- [ ] **Step 3: Delete duplicate bookmark search and category filter**
- [ ] **Step 4: Render segmented All/Favorites/Recent control**
- [ ] **Step 5: Render compact Grid/List and single Settings action**
- [ ] **Step 6: Run contracts/build**
- [ ] **Step 7: Commit `refactor: make Omnibox the only search surface`**

### Task 7: Tile actions, ordering and editor move flow

**Files:**
- Modify: `src/components/tiles/SpeedDialGrid.tsx`
- Modify: `src/components/tiles/SpeedDialGrid.module.css`
- Modify: `src/components/tiles/SiteTile.tsx`
- Modify: `src/components/tiles/SiteTile.module.css`
- Modify: `src/components/sites/SiteEditor.tsx`
- Modify: `src/components/sites/SiteEditor.module.css`
- Modify: `src/state/appStore.ts`
- Add/modify Node contracts for ordering/site CRUD.

**Interfaces:**
- Tile click opens site.
- One `⋯` menu: favorite/edit/move/delete.
- Add tile remains at end.
- `recent` disables manual reorder.

- [ ] **Step 1: Add ordering contracts for `position` and Recent override**
- [ ] **Step 2: Implement `moveSite(id, spaceId, categoryId?)` with reference validation**
- [ ] **Step 3: Replace permanent tile actions with one contextual menu**
- [ ] **Step 4: Add move controls to editor/menu**
- [ ] **Step 5: Keep original favicon/icon treatment**
- [ ] **Step 6: Run contracts/build**
- [ ] **Step 7: Commit `refactor: unify tile actions and ordering`**

### Task 8: Compact Settings side-sheet

**Files:**
- Replace/modify: `src/components/settings/TileSettingsPanel.tsx`
- Replace/modify: `src/components/settings/TileSettingsPanel.module.css`
- Remove normal-user preview/tuning UI from `src/components/settings/TilePreview.tsx` as appropriate.
- Modify tile settings model/presets only where necessary.
- Reuse DataControls.

**Interfaces:**
- Groups: Appearance / Tiles / Search / Data.
- No Advanced/Motion tabs in normal UI.

- [ ] **Step 1: Replace settings source contracts to require four compact groups and forbid Advanced/Motion labels**
- [ ] **Step 2: Implement user-level appearance presets instead of low-level sliders**
- [ ] **Step 3: Implement compact tile controls**
- [ ] **Step 4: Add search preferences and existing data controls**
- [ ] **Step 5: Verify immediate persistence**
- [ ] **Step 6: Commit `refactor: simplify settings for end users`**

### Task 9: Mobile architecture

**Files:**
- Modify: `src/components/sidebar/MobileNavigation.tsx`
- Modify: `src/components/sidebar/MobileNavigation.module.css`
- Modify responsive CSS in shell/workspace/grid/settings.

**Interfaces:**
- Top bar + one drawer/bottom-sheet containing Spaces and categories.
- No Dock.
- Same content modes and Omnibox as desktop.

- [ ] **Step 1: Add E2E contracts for mobile drawer space/category selection**
- [ ] **Step 2: Remove duplicate mobile navigation actions**
- [ ] **Step 3: Build compact status top bar**
- [ ] **Step 4: Ensure overlays are keyboard/viewport scroll-safe**
- [ ] **Step 5: Run mobile E2E/build**
- [ ] **Step 6: Commit `refactor: align mobile with Pure Speed Dial`**

### Task 10: Architecture QA, E2E and visual surfaces

**Files:**
- Modify: `scripts/qa-reference.mjs`
- Modify: `scripts/qa-data.mjs`
- Modify: `scripts/qa-visual.mjs`
- Modify: `e2e/app-shell.spec.ts`
- Modify: `e2e/visual.spec.ts`

**Interfaces:**
- Release gate fails on reintroduced Dock/duplicate search/duplicate category tree/top-level Downloads/Notes/Advanced Motion UI.

- [ ] **Step 1: Update source/reference QA to semantic Pure Speed Dial invariants**
- [ ] **Step 2: Rewrite E2E around Spaces/category/content-mode flows**
- [ ] **Step 3: Add canonical site add/edit/favorite/move/delete flow**
- [ ] **Step 4: Retain backup/calendar/weather/mobile checks**
- [ ] **Step 5: Expand visual surfaces to desktop main/settings, tablet, mobile main/drawer**
- [ ] **Step 6: Run full release gate**
- [ ] **Step 7: Do not update screenshots until manual visual review approves the redesign**
- [ ] **Step 8: Commit `test: enforce Pure Speed Dial release gate`**

### Task 11: Final visual polish and dead-code removal

**Files:**
- Remove obsolete Dock/section-only modules and unreachable code.
- Refine `src/styles/tokens.css`, Sidebar/Workspace/Tile CSS.
- Update README/project docs if present.

**Interfaces:**
- No user-visible dead controls or placeholder Settings cards.
- Clear layer hierarchy with restrained glass treatment.

- [ ] **Step 1: Run code search for old terms: `AppSection`, `WorkspaceTab`, `Dock`, `Загрузки`, top-level `Заметки`, `Проводник`, duplicate bookmark search/filter**
- [ ] **Step 2: Remove unreachable legacy UI while preserving legacy Notes storage/backup data**
- [ ] **Step 3: Perform manual desktop/mobile visual QA**
- [ ] **Step 4: Fix spacing, depth, typography and contrast regressions only after real render inspection**
- [ ] **Step 5: Run full release gate again**
- [ ] **Step 6: Commit `refactor: finish Pure Speed Dial architecture`**

## Self-review

- Spec coverage: all sections 1–19 map to Tasks 1–11.
- Data safety: Projects→Spaces, positions, Notes preservation and v1 backup compatibility are explicit.
- Architecture safety: duplicate navigation/search/category/settings regressions are enforced in Task 10.
- Mobile parity: same mental model, no separate product hierarchy.
- No new dependencies are required.
- No visual baseline update occurs before manual review.
