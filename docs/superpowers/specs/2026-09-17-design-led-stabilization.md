# Nexus Speed Dial — Design-led Stabilization Specification

Date: 2026-09-17
Status: Approved direction (Variant A)
Branch: `arena/01a0a900-nexus-speed-dial`
Baseline at approval: `0ebcaa77879739cbbedd9908b06b517827f1f578`

## Purpose

Bring Nexus Speed Dial to a state where every visible product function is real, testable, coherent across desktop/tablet/mobile, and visually consistent with the approved Glass UI direction. Functional correctness and design quality are co-equal release requirements, with visual quality taking precedence over adding low-value features.

This specification extends, rather than replaces, `docs/superpowers/specs/2026-08-31-nexus-speed-dial-design.md`. Where the two documents overlap, the August visual specification remains the visual baseline; this document defines the stabilization architecture, functionality contract, QA gates, and execution order.

## Product outcome

A user must be able to use Nexus as a polished daily browser workspace rather than a demonstration UI. Every visible control must have an implemented action or be removed from the production navigation. Every state-changing action must persist predictably. The same conceptual action must behave consistently no matter where it is triggered.

## Non-negotiable design principles

### 1. Visual hierarchy before decoration

- Primary actions have one clear visual emphasis level.
- Secondary and tertiary actions use progressively quieter surfaces.
- Decorative effects must never compete with titles, content, or primary actions.
- Each screen has one obvious first focal point and one obvious next action.

### 2. Restrained glass and neumorphism

- Glass is reserved for application shell, overlays, navigation, toolbars, and control surfaces.
- Site tiles preserve recognizable branding and do not receive a forced monochrome treatment.
- Neumorphic depth may be used on tiles and compact controls only when contrast remains clear.
- No neon, fantasy 3D, excessive refraction, or hard black shadows.
- Blur, opacity, border, shadow, and highlight values remain tokenized.

### 3. Consistent geometry

- Use an 8 px spacing rhythm with 4 px half-steps only where optical adjustment requires it.
- Control heights, radii, gaps, icon sizes, and panel padding come from shared tokens rather than local one-off values.
- Related controls align on common baselines and edges.
- Dense information is grouped by proximity rather than separated by decorative containers.

### 4. Typography

- Russian Cyrillic rendering must remain first-class.
- Typography uses a compact scale with clearly separated title, section, control, metadata, and helper-text roles.
- Body/helper text must remain readable at mobile widths without shrinking below practical interaction size.
- Truncation is used only where the complete value remains discoverable through context, title, or detail view.

### 5. Interaction quality

Every interactive element supports the applicable states:
- default
- hover
- pressed
- selected/active
- focus-visible
- disabled
- loading
- error

Motion is short, purposeful, and reduced when `prefers-reduced-motion` is enabled.

### 6. Responsive parity

Mobile and tablet are not separate reduced products. They must expose the same core capabilities through responsive composition: sheets, drawers, compact toolbars, and stacked layouts rather than removed functionality.

## Functional invariants

### Unified site opening

All routes that open a saved site must use one shared application action instead of direct `window.open()` calls scattered through UI components.

The action must:
1. Resolve the final URL from the saved site record.
2. Open with `_blank` and `noopener,noreferrer`.
3. Update `lastOpened`.
4. Update history when history persistence is enabled.
5. Deduplicate the history entry.
6. Preserve existing behavior for legacy history records.
7. Be callable from SiteTile, Library, History, Favorites Dock, Command Center, Projects/Sessions, and any future surface.

### History

- New history stores stable site IDs when a matching saved site exists.
- Legacy title/domain/URL records continue to resolve safely.
- Opening a site from any surface produces the same history semantics.
- Disabling history clears stored history and prevents new records.

### Projects, categories, groups, sessions

- Project/category/group navigation is data-driven, not hard-coded display data.
- Site assignment is reflected consistently in Speed Dial, Library, Projects, and import flows.
- Session restore reuses the unified site-opening action.
- Session persistence has an explicit data model and deterministic restore order.
- Current model limitations around exact browser windows/tabs/paths must be represented honestly in UI copy until exact-tab persistence exists.

### Library

Library must support:
- title/domain/description/notes/tag search
- favorite toggle
- project assignment
- safe opening through the unified site-opening action
- edit and delete operations where available elsewhere
- useful empty states

### Tags and notes

- Tags remain attached to real SiteRecords and are editable.
- Notes are searchable and editable.
- Navigation from a tag/notes context to the corresponding site or library result is real and tested.

### Downloads

A top-level `Загрузки` item may remain visible only if it provides implemented functionality. The stabilization milestone will implement a local download/inbox workspace using browser-visible user-managed records, or remove the item from primary navigation until that workspace is implemented. Production UI must never advertise a non-working section as if it were ready.

The preferred implementation is a local Inbox/Downloads workspace that can register imported local-file metadata and user-added download/link records without pretending the web app can silently inspect the operating system Downloads folder.

### Settings

Settings must:
- persist appearance and tile configuration
- expose safe data import/export/backup behavior
- expose Browser Bridge status and fallback import
- avoid controls that have no observable effect
- maintain usable navigation on desktop/tablet/mobile
- show live visual preview where appearance controls warrant it

### Command Center

Command Center must use application actions rather than bypassing application state. Search results for sites, categories, sessions, history, and quick actions must all execute the same domain behavior as their primary UI equivalents.

### Browser Bridge

Production requirements:
- Manifest V3
- explicit `tabs` permission only for installed extension behavior
- strict `externally_connectable` origins
- runtime sender validation
- localhost-only development manifest
- manual URL import fallback when extension is absent
- deduplication and unsupported-scheme handling
- browser-extension protocol test coverage

A release may claim the extension bridge is end-to-end verified only after a real extension-loaded Chromium test or equivalent manual evidence exists.

## Architecture

### Domain action layer

Introduce focused domain/application actions rather than keeping cross-cutting behavior inside `main.tsx` and child components.

Initial boundaries:

- `src/domain/siteOpen.ts`
  - URL resolution
  - history resolution/deduplication
  - last-opened update contract
  - safe browser-open options

- `src/domain/navigation.ts`
  - stable section identifiers
  - production-visible section registry
  - rules for hiding unavailable sections

- `src/domain/sessionActions.ts`
  - deterministic session-to-site resolution
  - ordered restore plans

- existing `appStore.ts`
  - remains persistence/state reducer boundary
  - receives domain results rather than duplicating business rules in UI

UI components consume callbacks or application actions; they do not independently reimplement state semantics.

### Shell decomposition

`src/main.tsx` is currently responsible for too many concerns. Stabilization will extract only the parts actively touched by this milestone, avoiding a rewrite for its own sake.

Targeted units:
- `AppShell` / shell composition
- `useSiteActions` or equivalent application hook for open/favorite/edit/delete flows
- production navigation registry
- workspace router/rendering helper

Extraction is accepted only when it reduces duplicated behavior or test complexity.

## Design system hardening

### Token groups

Consolidate existing CSS variables into semantic groups:
- color/background
- text
- accent/status
- spacing
- radius
- shadow/elevation
- blur/glass
- control heights
- typography
- motion

### Component consistency audit

Audit and normalize:
- top navigation
- side navigation/project tree
- mobile sections sheet
- segmented controls
- buttons and icon buttons
- selects/inputs/search fields
- site tiles/list rows
- empty states
- modals/popovers/sheets
- settings navigation
- command palette
- Browser Import panel
- Projects/Library/Tags/Notes/Downloads workspaces
- toast and confirmation feedback

### Accessibility baseline

- semantic button/input controls
- visible focus state
- keyboard-operable overlays
- focus trap where modal
- Escape/outside close where appropriate
- sufficient contrast for interactive states
- no interaction dependent only on hover
- reduced motion support
- useful ARIA labels where icon-only controls are used

## Testing architecture

### Unit/domain

Every cross-cutting business rule must be independently tested, including:
- URL normalization and safe open plan
- history migration/deduplication
- session restore planning
- production navigation visibility
- storage/backup/import
- Browser Bridge origin policy

### Component tests

Required coverage for visible workspaces and actions:
- SiteTile
- Library
- Projects
- Tags
- Notes
- Downloads/Inbox if present
- Settings
- Command Center
- Browser Import
- mobile navigation
- calendar

### Browser E2E

The CI browser suite must cover representative real flows on desktop, tablet, and mobile:
- open/add/edit/delete/favorite site
- search/Command Center
- project/category navigation
- Library action
- notes/tags navigation
- settings persistence
- backup/import smoke path
- Browser Bridge fallback
- Downloads/Inbox if production-visible
- calendar and mobile navigation

Project-specific scenarios may skip non-applicable device variants, but every production capability needs at least one browser-level verification.

### Visual regression

Required screenshot baselines:
- desktop home
- desktop settings
- desktop calendar
- desktop Library
- desktop Projects
- desktop Command Center
- desktop Browser Import/Data settings
- mobile home
- mobile settings
- mobile Library or navigation sheet
- mobile Command Center

Additional baselines are added when a high-value workspace receives major visual treatment.

Visual tolerances must remain narrow enough to catch layout regressions. Baseline acceptance is manual/reviewed and never self-approved by ordinary feature pushes.

### Reference guard

`npm run qa:reference` becomes an obligatory CI step. It protects explicit design invariants such as no permanent calendar column and prohibited visual regressions.

### Release gate

A stabilization increment is green only when all applicable checks pass on the exact HEAD:
1. `npm ci` with zero known npm vulnerabilities reported by the install audit.
2. Unit/component tests.
3. TypeScript production build.
4. `git diff --check` against the project baseline.
5. Reference guard.
6. Browser E2E.
7. Visual regression.
8. No unresolved P0/P1 defect discovered during the increment's audit.

No completion claim is allowed based on an earlier SHA.

## Execution order

### Phase 1 — Functional action core

- centralize site opening/history/lastOpened/safe window options
- route SiteTile, Library, History, Favorites Dock, Command Center, and Session restore through that core
- add unit/component regression tests

### Phase 2 — Navigation and incomplete functionality

- introduce a production section registry
- remove fake/dead navigation states
- implement the Downloads/Inbox workspace if it can meet product quality within the local-first model; otherwise hide it until implemented
- verify data-driven Projects/categories/groups navigation

### Phase 3 — Workspace completeness

Audit and complete real actions in:
- Library
- Projects/Sessions
- Tags
- Notes
- Settings/Data
- Browser Import
- Command Center

Every newly found defect receives a regression test before the fix when practical.

### Phase 4 — Design system consolidation

- normalize spacing, typography, radii, shadows, surfaces, and interaction states
- eliminate one-off styling that violates the token system
- preserve approved reference fidelity
- keep branded site tiles visually distinct
- optimize responsive density without hiding capabilities

### Phase 5 — Expanded visual and browser QA

- expand E2E to all production workspaces
- expand screenshot baselines to all high-value screens
- make `qa:reference` mandatory in CI
- maintain reviewed baseline acceptance workflow

### Phase 6 — Real Browser Bridge verification

- add an extension-loaded Chromium integration test if supported reliably by the CI browser runtime
- otherwise document and execute a reproducible manual verification procedure with exact evidence
- do not claim exact browser-window/tab restoration until the data model actually supports it

## Explicit non-goals

The stabilization project does not add:
- cloud accounts/sync
- collaboration
- analytics dashboards
- AI features unrelated to bookmark/workspace management
- automatic unrestricted access to OS folders
- browser permission bypasses
- decorative features that do not improve the core workflow

## Acceptance criteria

The Design-led Stabilization milestone is complete only when:

- every production-visible top-level section provides implemented behavior
- no visible control is intentionally decorative or a no-op
- all site-opening entry points have identical state semantics
- project/category/session flows are data-driven and tested
- Browser Bridge has secure production and development boundaries plus fallback
- desktop/tablet/mobile expose the same core product capabilities
- visual design follows the approved Glass UI specification and consolidated tokens
- key workspaces have visual baselines
- `qa:reference` is part of the normal CI gate
- the exact final HEAD passes unit/component, build, reference, E2E, visual, and whitespace checks
- known limitations are described explicitly rather than represented as completed features
