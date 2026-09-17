# Nexus Speed Dial Design-led Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every production-visible Nexus capability real and consistent while upgrading the shell to the approved premium spatial design without functional regressions.

**Architecture:** Cross-cutting behavior moves into focused domain actions first, then UI surfaces consume those actions. Visual work is token-first: canvas/content/chrome/overlay/modal elevation tokens, then component adoption, then reviewed screenshot baselines. Each behavior change follows RED → GREEN → refactor; every increment must pass exact-HEAD unit/build/reference/E2E/visual gates before it is called complete.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 5, Testing Library, Playwright 1.63, CSS custom properties, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-17-design-led-stabilization.md` and `docs/superpowers/specs/2026-09-17-design-constitution-2.md`

## Global Constraints

- Work only on `arena/01a0a900-nexus-speed-dial`.
- Preserve calendar as popover; never restore a permanent calendar column.
- Preserve recognizable site branding.
- No visible production control may be a deliberate no-op.
- No production shell perspective/rotateX/rotateY/neon gimmicks.
- Desktop, tablet, and mobile retain the same core capabilities.
- Browser Bridge origin security must not be weakened.
- Visual baseline acceptance remains an explicit reviewed action.
- Never claim completion from an older SHA.

---

### Task 1: Unified site-open domain action

**Files:**
- Create: `src/domain/siteOpen.ts`
- Create: `src/domain/siteOpen.test.ts`
- Modify later: `src/main.tsx`
- Modify later: `src/components/CommandPalette.tsx`
- Modify later: `src/components/CommandPalette.test.tsx`

**Interfaces:**
- Produces `resolveSiteUrl(site)`, `recordSiteOpen(sites, history, site, now, saveHistory)`, and `resolveHistoryTarget(historyItem, sites)`.
- The UI performs the actual browser call with `_blank` and `noopener,noreferrer`, then commits the returned site/history state.

- [ ] Write failing domain tests for protocol-safe URL resolution, `lastOpened`, stable-ID history, dedupe, history-disabled behavior, and legacy history resolution.
- [ ] Verify the new tests fail because `siteOpen.ts` does not exist.
- [ ] Implement the smallest pure functions needed to make the domain tests pass.
- [ ] Route Command Center site/history results through a supplied application callback instead of direct `window.open`.
- [ ] Route SiteTile, Library, History, Favorites Dock, and session restore through the same application action in `main.tsx`.
- [ ] Verify all existing and new tests pass.

### Task 2: Honest production navigation

**Files:**
- Create: `src/domain/navigation.ts`
- Create: `src/domain/navigation.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/components/MobileSections.tsx` if it owns a duplicated registry.

**Interfaces:**
- Produces a stable production section registry and a single `isProductionSection`/section metadata lookup.

- [ ] Write failing tests proving unavailable sections are absent from production navigation.
- [ ] Implement the registry.
- [ ] Remove `Загрузки` from primary navigation while it is still a placeholder, unless a real local Inbox/Downloads workspace has already landed by the time this task executes.
- [ ] Remove placeholder copy/state unreachable from production navigation.
- [ ] Verify desktop/mobile navigation parity.

### Task 3: Make reference QA mandatory

**Files:**
- Modify: `.github/workflows/qa.yml`
- Modify: `package.json` only if script semantics need consolidation.

- [ ] Add an explicit `npm run qa:reference` step after unit/build and before browser installation.
- [ ] Keep visual regression as a hard gate.
- [ ] Verify the exact HEAD workflow runs the reference step successfully.

### Task 4: Complete visible workspaces

**Files:**
- Modify focused workspace components/tests under `src/components/` only as defects are found.

- [ ] Audit Library actions: search, favorite, project assignment, edit/delete/open, empty states.
- [ ] Audit Projects/Sessions: data-driven hierarchy and deterministic restore order.
- [ ] Audit Tags/Notes: editing/search/navigation back to real site records.
- [ ] Audit Settings/Data and Browser Import: no no-op controls, working fallback import/export/backup paths.
- [ ] Add regression tests before each defect fix.

### Task 5: Premium spatial token layer

**Files:**
- Modify: `src/styles.css`
- Modify: `src/visual-overrides.css`
- Modify: `src/actions.css`
- Modify: `src/settings.css`
- Modify: `src/presets.css` only where default-shell semantics leak into presets.

**Interfaces:**
- Adds primitive/semantic/component CSS variables for surfaces, elevation, border highlight, focus, spacing/radius, typography, and motion.

- [ ] Introduce z0–z4 semantic elevation/material tokens with one consistent upper-left light model.
- [ ] Remove the visible dot-grid from the premium default canvas; keep atmospheric light fields subtle.
- [ ] Concentrate glass in navigation/interaction chrome and make primary content more opaque.
- [ ] Replace repeated shell shadows/radii/timings in touched paths with tokens.
- [ ] Ensure dark mode uses edge light/local contrast rather than heavy black shadows.

### Task 6: Premium interaction and accessibility states

**Files:**
- Modify component CSS plus focused component tests where interaction behavior changes.

- [ ] Normalize hover lift to 2–4 px normally and at most 5 px for premium desktop tile hover.
- [ ] Restrain dock magnification so it feels elastic rather than cartoonish.
- [ ] Add explicit focus-visible treatment for primary interactive controls.
- [ ] Confirm reduced-motion removes non-essential transform/magnification.
- [ ] Confirm mobile touch alternatives exist for pointer-only affordances.

### Task 7: Expanded browser and visual QA

**Files:**
- Modify: `e2e/app-shell.spec.ts`
- Modify: `e2e/visual.spec.ts`
- Candidate snapshots only after review.

- [ ] Add browser flows for a real add/edit/favorite/delete cycle and persistence.
- [ ] Add Command Center and Library smoke paths.
- [ ] Add Browser Import fallback smoke path.
- [ ] Add visual cases for Library, Projects, Command Center, Browser Import/Data settings, and mobile navigation/Library.
- [ ] Capture candidate baselines and inspect them before switching `.github/visual-review-request` to accept.

### Task 8: Browser Bridge real integration verification

**Files:**
- Modify/add extension integration tests only after validating current Playwright/Chromium extension-loading constraints.
- Update `extension/README.md` with reproducible evidence path if automated CI is not reliable.

- [ ] Verify the extension in a real extension-loaded Chromium context or document a reproducible manual test with exact evidence.
- [ ] Keep production/dev manifests strict and separate.
- [ ] Do not claim exact browser window/tab restoration beyond the actual data model.

### Task 9: Exact-head release gate

- [ ] Re-fetch branch HEAD and verify no concurrent agent moved it unexpectedly before final claims.
- [ ] Confirm `npm ci` reports zero known audit vulnerabilities in CI output.
- [ ] Confirm unit/component tests, TypeScript/Vite build, whitespace, reference, E2E, and visual regression all pass on that exact SHA.
- [ ] Review remaining P0/P1 defects and continue rather than issuing a completion claim if any remain.
