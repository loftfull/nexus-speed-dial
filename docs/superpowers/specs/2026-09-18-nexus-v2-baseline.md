# Nexus Speed Dial v2 — Canonical Architecture Baseline

**Date:** 2026-09-18
**Status:** Approved product baseline
**Canonical branch:** `arena/01a0a900-nexus-speed-dial-v2`

## Purpose

This document freezes the architectural and visual direction introduced by the v2 branch. It supersedes the old implementation structure while preserving the previously approved product principles: honest functionality, local-first behavior, restrained premium depth, Russian-first UI, responsive capability parity, and visual QA as a release gate.

Older specs remain useful as design rationale, but they are not instructions to restore removed modules, workspaces, or CSS layers.

## Canonical application structure

### Shell and orchestration

- `src/app/App.tsx` is the product shell and orchestration boundary.
- It owns current workspace navigation, project/category/group selection, quick-access panel, dock, weather/calendar surfaces, top-level action dialogs, and composition of settings/add-site/mobile surfaces.
- Do not split the shell back into the removed legacy workspace architecture merely to match older files.
- Extract code only when a coherent behavior becomes independently testable or the shell becomes materially harder to reason about.

### Tiles

- `src/app/Tile.tsx` is the canonical site tile.
- Stable identity is `SiteRecord.id`; domain is display/dedup data, never object identity.
- The monogram is the local, immediate fallback.
- Remote favicon is progressive enhancement and must never paint a broken-image placeholder over the monogram.
- Tiles remain content surfaces rather than glass showcase objects.

### Settings

- `src/app/SettingsPanel.tsx` is the canonical settings experience.
- Settings is a compact, non-fullscreen panel that keeps the workspace visually present.
- Settings sections remain deliberately small: appearance, tiles, search, weather, privacy, and data.
- A visible control must produce observable behavior. Do not add speculative toggles.
- Destructive operations use the shared Nexus action dialog, never native `confirm`.

### Action dialogs

- `src/app/ActionDialog.tsx` is the canonical small action/confirmation surface.
- Creation/rename/destructive flows must use a Nexus dialog or an inline editor, not `prompt`, `confirm`, or `alert`.
- Keyboard focus, Escape, Enter submission, validation, and focus restoration are part of the component contract.
- Destructive actions require explicit danger styling and explicit confirmation.

### Responsive navigation

- Desktop uses the persistent project tree.
- Mobile uses the sections/projects sheet.
- Mobile is not a reduced-feature version: projects must be selectable and creatable there as well.
- Responsive work should recompose controls instead of merely shrinking them.

## Canonical information architecture

- **Project** — primary working context.
- **Category** — top-level filter inside a project.
- **Group** — optional visual subdivision inside a category.
- **Site** — saved resource.
- **Favorite** — cross-cutting saved state.
- **Recent** — derived open history.
- **Note** — annotation attached to a resource/workflow.
- **Trash** — recoverable deleted resources.
- **Quick Access** — navigation/action surface.
- **Dock** — separate pinned-resource surface; it is not the same bar as Quick Access.

Do not reintroduce old top-level Library/Tags/Projects workspace screens unless a new product requirement cannot be expressed cleanly through the v2 information model.

## Visual constitution for v2

The target feeling is light, floating, dimensional, calm, expensive, and precise.

Depth is produced by:
- surface separation;
- restrained translucency for shell/control layers;
- consistent light direction;
- contact shadow + softer distant shadow;
- subtle borders/highlights;
- small vertical motion where it communicates interaction.

Depth is **not** produced by:
- perspective tricks;
- `rotateX` / `rotateY`;
- strong card tilt;
- neon glows;
- excessive refraction;
- heavy glass on content tiles.

### Canonical styling boundary

- `src/app/theme.css` is the canonical `nx-*` shell/design-system stylesheet.
- Extend semantic v2 tokens before introducing one-off values.
- Keep old `src/styles.css` only for surviving legacy components that have not yet migrated; do not build new shell UI there.
- Remove old styling dependencies incrementally when the surviving component is migrated.

### Geometry and density

- 4px micro / 8px macro rhythm.
- Desktop remains compact and productive.
- Touch targets expand for mobile without visually bloating desktop.
- One screen has one dominant focal point.
- Accent color is reserved for state/action emphasis, not decorative saturation.

## Product trust rules

1. No fake live data.
2. No decorative or no-op controls.
3. No hidden third-party request described as “no data sent”.
4. Remote preview is opt-in.
5. Seed content may demonstrate organization, never fabricate live unread counts or account state.
6. Native browser prompts are not a production interaction.
7. Browser limitations must be stated accurately.
8. Local-first means stored workspace data remains local unless the user explicitly invokes or enables an external operation.

## Data and identity rules

- Every persisted site receives a stable ID at creation/import time.
- Projects, dock pins, selection, drag payloads, history resolution, delete/edit/favorite operations use IDs wherever possible.
- Same-domain records are valid distinct objects when their IDs differ.
- Import must preserve IDs when valid and generate missing IDs before apply.
- Backup evolution should move toward parse → validate → normalize → preview → atomic apply.

## External services

### Weather

- Open-Meteo is an external network request.
- The UI must say so plainly.
- No geolocation is required by the current implementation.
- Error/offline behavior must degrade without blocking the workspace.

### Favicons / previews

- A favicon request discloses a network request to the site/provider.
- Local monograms are the zero-network fallback.
- Remote screenshots remain explicit opt-in and must have a visible fallback.

## QA and release invariants

For every production increment:

1. unit/component tests;
2. TypeScript + Vite production build;
3. reference guard;
4. whitespace/diff check;
5. browser E2E on desktop/tablet/mobile;
6. real MV3 bridge E2E where relevant;
7. visual regression against reviewed baselines;
8. no unresolved P0/P1 introduced by the increment.

Visual baselines are approval artifacts, not disposable snapshots. Intentional visual changes require candidate capture and human review before acceptance.

## Current visual invariants

- Calendar is an overlay only, never a permanent column.
- Quick Access and Dock are distinct surfaces and never merged into a single bar.
- Settings is compact and keeps the workspace visible.
- Site tiles use restrained elevation and brand/monogram color; shell controls may use more material treatment.
- Mobile home keeps time/weather/navigation compact and preserves the core product actions.
- The approved v2 screenshots in `e2e/visual.spec.ts-snapshots` are the visual source of truth.

## Explicitly historical implementation

The following old concepts/files were removed as part of v2 and must not be recreated just to satisfy older specs:

- the former top-level Command Palette architecture;
- separate Library/Projects/Tags workspace screens;
- the former monolithic SettingsPanel;
- the old SiteTile implementation;
- legacy navigation/session/tile-style bridge modules removed by v2;
- multi-layer visual override CSS used by the pre-v2 shell.

Their useful behaviors may be reimplemented inside v2 boundaries when required, but their old structure is not canonical.

## Next product priorities

1. finish trust cleanup (fake/stale controls and data);
2. transactional backup/import;
3. storage corruption/quota recovery UX;
4. dark/light/zoom/forced-colors accessibility pass;
5. visual coverage for ActionDialog and mobile projects sheet;
6. progressively migrate remaining legacy component styling into v2 tokens;
7. maintain a live browser preview of the exact reviewed v2 state.
