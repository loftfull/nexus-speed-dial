# Nexus Power — architecture and UX specification

Date: 2026-09-08  
Branch: `codex/m1-glass-ui`  
Supersedes only the product/UX scope of the Pure Speed Dial spec where explicitly stated. The Pure Speed Dial data model and one-workspace architecture remain the foundation.

## 1. Product goal

Nexus Power is a high-speed visual launcher and bookmark workspace. Its primary job is still to find, open and organize sites faster than a conventional bookmark manager, but it must feel significantly more capable than a simple grid of links.

The product must combine two qualities that must not be traded against each other:

1. **Grid-first speed:** sites remain the main visual object; the user reaches a site in one click or a few keystrokes.
2. **Contextual power:** advanced actions appear only when invoked by search, keyboard, long press, selection mode or a contextual menu. Power features must not create permanent navigation clutter.

## 2. Non-negotiable product invariants

The following Pure Speed Dial decisions remain locked:

- one permanent workspace; no section-based app navigation;
- no bottom Dock;
- no top-level Downloads or Notes screens;
- one Omnibox only;
- no fake browser Back/Forward/Security/Profile chrome as product features;
- spaces and categories are the only structural scope model;
- `All / Favorites / Recent` are modes of the same site collection, not separate screens;
- settings are an overlay side-sheet, not a separate route;
- calendar and weather are utilities, not dashboard modules;
- user site icons keep their native visual identity;
- desktop and mobile share one mental model.

A future change that introduces a second independent entry point for the same primary function is considered an architecture regression.

## 3. Visual direction

### 3.1 Default appearance

- light theme is the primary reference theme;
- soft white/blue glass surfaces, restrained neumorphic depth, blue accent;
- no neon, ray tracing or permanent dark-dashboard aesthetic;
- Cyrillic-first typography with high legibility;
- native site logos/favicons remain visually dominant.

### 3.2 Density principle

The workspace above the first row of site tiles must contain only service controls.

Target desktop geometry:

- service rail: approximately 48–54 px;
- service rail → grid gap: 8–12 px;
- no large greeting hero;
- no full-width weather card;
- no permanent Quick Peek column;
- no second search row.

At 1536 px wide, the default grid should target roughly seven standard tiles per row while preserving readable labels. Grid density must be adaptive rather than hard-coded to one viewport.

## 4. Desktop shell

The primary desktop layout is:

```text
┌─────────────── Sidebar ───────────────┬──────────────── Workspace ────────────────┐
│ Spaces                               │ [All][Favorites][Recent] [Omnibox] [▦][☷][⚙] │
│ Categories                           ├──────────────────────────────────────────────┤
│                                      │ site tiles / category groups                 │
│                                      │                                              │
│ compact utility status              │                                              │
└──────────────────────────────────────┴──────────────────────────────────────────────┘
```

### 4.1 Sidebar

Expanded desktop width target: 240–255 px.  
Collapsed width target: 54–60 px.

Expanded state contains only:

- Spaces;
- one two-level category tree for the active space;
- compact utility status at the bottom;
- `+` actions in section headings;
- `…` structure actions on hover/focus only.

Collapsed state keeps only structural icons and the active-state indicator. Labels appear on hover/focus tooltip. `Ctrl+B` toggles Sidebar collapse on desktop.

The Sidebar must not contain duplicate All/Favorites/Recent navigation.

## 5. Unified service rail

The current large Omnibox row and separate mode row are replaced by one compact service rail.

Order on wide desktop:

```text
[All] [Favorites] [Recent]    [collapsed Omnibox]    [Grid/List] [Settings]
```

The rail is sticky inside the workspace.

### 5.1 Collapsible Omnibox

Idle state:

- compact capsule, approximately 160–220 px;
- visible label/icon communicates Search;
- does not dominate the workspace.

Expanded state:

- opens on click, `Ctrl/Cmd+K`, `/`, or typed input when the workspace owns keyboard focus;
- expands in the same rail to approximately 520–640 px where space permits;
- must not create an additional row on normal desktop widths;
- empty Omnibox collapses again on `Esc` or blur;
- on mobile it may use the available full row width because the desktop rail cannot be preserved literally.

The Omnibox handles saved sites, URLs, web search and commands through one surface.

## 6. Command Omnibox

The Power command language extends the existing resolver without creating a second command palette screen.

Supported interaction families:

- plain text → saved-site suggestions, then configured web search;
- URL/domain → open URL;
- `@name` → spaces;
- `#name` → categories in their owning space;
- `> command` → actions.

Initial commands:

- `> add` / `> добавить` — open Add Site;
- `> settings` / `> настройки` — open Settings;
- `> import` / `> импорт` — open import flow;
- `> organize` / `> проверить` — open Smart Organizer summary when implemented;
- `> focus` — toggle Focus Mode when implemented.

Command result rows must show type and context, e.g. `GitHub · Работа / Разработка`.

Selecting a saved site from another space opens that site without silently changing the active navigation scope.

## 7. Site tiles

A standard tile contains only:

- original favicon/logo;
- title;
- optional secondary domain/subtitle according to display preference;
- passive favorite indicator when applicable;
- `…` action button on hover/focus/touch affordance.

### 7.1 Visual enrichment

Nexus may derive a soft accent from the site logo/domain branding for hover/focus treatment, but it must not recolor the original icon or make all tiles visually uniform.

Allowed visual differentiation:

- soft site accent;
- stronger hover elevation;
- clear focus-visible state;
- subtle favorite marker;
- selected state only when the user actually selects a tile.

### 7.2 Tile actions

Primary click = open site.

`…` contains:

- Open;
- Favorite / Remove from favorites;
- Quick Peek;
- Edit;
- Move;
- Delete.

No permanent row of edit/favorite/delete controls is allowed.

## 8. Quick Peek

Quick Peek is an on-demand overlay, never a permanent workspace column.

Open via:

- `Space` on a focused tile;
- long press on touch;
- `… → Quick Peek`.

Quick Peek may display:

- site logo/title/domain;
- space/category location;
- last-opened time and visit frequency;
- favorite status;
- optional lightweight page preview if it can be produced safely and cheaply;
- Open, Edit, Move and Favorite actions.

Closing Quick Peek restores the full grid width immediately.

## 9. Keyboard-first navigation

Desktop keyboard behavior is a core product feature, not an accessibility afterthought.

Required shortcuts:

- `Ctrl/Cmd+K` or `/` — focus/expand Omnibox;
- arrow keys — move tile focus spatially within the visible grid;
- `Enter` — open focused tile;
- `Space` — Quick Peek;
- `F` — toggle favorite for focused tile when no text field owns focus;
- `E` — edit focused tile;
- `Delete` — request deletion with confirmation;
- `Esc` — close the topmost overlay/menu/expanded Omnibox;
- `Ctrl+B` — collapse/expand Sidebar on desktop.

Keyboard actions must never fire while the user is typing in an input/editor except for explicitly scoped shortcuts such as `Ctrl+K`.

## 10. Selection Mode

Selection Mode is temporary state over the same grid.

Entry:

- Ctrl/Cmd-click on desktop;
- long press followed by selection on touch;
- future command entry may be added.

When active, the service rail temporarily becomes a batch-action rail:

```text
[✓ N selected]    [Move] [Category] [Favorite] [Delete] [×]
```

No permanent checkboxes appear in normal mode.

Batch destructive actions require confirmation. Batch operations should be reversible through Undo where practical.

## 11. Undo

Nexus maintains a short-lived in-memory undo transaction for user actions such as:

- delete site(s);
- move site(s);
- batch category assignment;
- favorite changes where practical.

Presentation: compact toast near the lower workspace edge with a single `Undo` action. Undo is contextual state, not a separate history screen.

The first implementation may support one most-recent reversible transaction. Multi-level undo is deferred unless real use demonstrates need.

## 12. Focus Mode

Focus Mode is part of the Nexus Power direction but is not required in the first coding package.

When enabled:

- Sidebar collapses;
- service rail reduces to search trigger + essential layout control;
- grid receives nearly full window area;
- no content state is lost.

Focus Mode is a presentation state, not a route.

## 13. Smart Organizer

Smart Organizer is a secondary Power capability and must remain suggestion-driven.

It may detect:

- duplicates;
- near-duplicate URLs;
- sites without category;
- rarely used sites;
- likely dead/unreachable URLs;
- repeated clusters that could become a category.

Organizer never silently deletes or moves content. It presents findings and proposed operations for user review.

Initial implementation can be deterministic and local. AI classification is optional and deferred.

## 14. Import

Import is a utility flow, not a top-level permanent navigation section.

First supported source:

- standard HTML bookmark export from Chrome/Edge/Firefox-compatible browsers.

Flow:

1. choose HTML file;
2. parse locally;
3. show count, duplicates and folder structure;
4. map folders to spaces/categories where possible;
5. user confirms;
6. import through the same normalization/migration pipeline as existing data.

No network upload is required for local HTML parsing.

## 15. Optional AI

AI must enhance organization, never become a dependency for opening or managing sites.

Potential later uses:

- suggest title from URL/page metadata;
- suggest category/space for imported sites;
- detect semantically related duplicate collections;
- summarize a large organizer report.

If no AI provider is configured, all core Nexus Power features continue to work.

## 16. State architecture

Existing persisted domain state remains canonical:

- `spaces`;
- `categories`;
- `sites`;
- `history`;
- `preferences`;
- legacy notes retained only for migration/export compatibility.

New Power UI/session state should be ephemeral unless noted otherwise:

```ts
omniboxExpanded: boolean
quickPeekSiteId: string | null
focusedSiteId: string | null
selectionMode: boolean
selectedSiteIds: Set<string> // or serializable array in store implementation
sidebarCollapsed: boolean // may persist as preference
focusMode: boolean // may persist as preference
undoTransaction: UndoTransaction | null
```

Command suggestions and visible-site lists are derived selectors, not duplicated persisted arrays.

## 17. Feature boundaries

Recommended feature-first structure:

```text
src/features/
  command-omnibox/
  quick-peek/
  keyboard-nav/
  selection/
  undo/
  smart-organizer/      # phase 2
  bookmark-import/      # phase 2
```

Existing `tiles`, `sidebar`, `settings` and data-domain modules remain reused rather than cloned.

No feature module may add its own top-level app navigation entry without a new architecture review.

## 18. Mobile behavior

Mobile retains the current one-drawer model for spaces/categories.

Power adaptations:

- Omnibox uses the available row width when expanded;
- Quick Peek becomes a bottom sheet/full-height sheet depending content;
- long press is the main entry for Quick Peek/Selection Mode;
- Selection Mode batch rail sticks to the viewport;
- no persistent desktop Sidebar;
- no bottom Dock.

The user journey remains:

`Space → Category → Mode → Site`, with Power actions layered on top.

## 19. First implementation package

The first coding package is intentionally bounded to the capabilities that immediately make Nexus feel more powerful while preserving the clean architecture:

1. compact unified service rail;
2. collapsible Command Omnibox;
3. keyboard tile navigation;
4. Quick Peek overlay;
5. Selection Mode;
6. one-step Undo;
7. collapsible desktop Sidebar;
8. updated tests and visual baselines.

Not in the first package:

- Smart Organizer implementation;
- bookmark HTML import implementation;
- AI integration;
- rich live widgets;
- finance/news/tasks dashboards;
- permanent weather/greeting hero blocks;
- multi-level undo.

These exclusions are deliberate to prevent the product from returning to dashboard sprawl.

## 20. Testing and QA gates

### Unit/domain

- command parser and result ranking;
- keyboard navigation index/spatial movement;
- selection reducer/actions;
- undo transaction apply/revert;
- Quick Peek selector data;
- persisted Sidebar-collapse preference if implemented.

### Playwright interaction

Required flows:

1. `Ctrl+K` expands/focuses Omnibox and `Esc` collapses it;
2. command `> add` opens Site Editor;
3. `@space` and `#category` results are discoverable;
4. arrow keys move tile focus and Enter opens selected target path safely in test harness;
5. Space opens/closes Quick Peek;
6. selection mode selects several tiles and performs a batch move/category action;
7. delete + Undo restores site(s);
8. Sidebar collapse preserves active scope;
9. mobile long-press path exposes Quick Peek/selection affordance.

### Architecture QA

Static guard must continue to reject:

- Dock imports;
- top-level Notes/Downloads sections;
- duplicate bookmark search;
- `AppSection` / `WorkspaceTab` reintroduction;
- permanent Quick Peek column;
- second command/search component outside Omnibox;
- browser Back/Forward chrome as navigation feature.

### Visual regression

Required surfaces:

- desktop main, Sidebar expanded;
- desktop main, Sidebar collapsed;
- desktop Omnibox expanded with command results;
- desktop Quick Peek;
- desktop Selection Mode;
- mobile main;
- mobile navigation drawer;
- mobile Quick Peek/Selection surface.

Light theme is the primary visual baseline.

## 21. Success criteria

The Nexus Power first package is successful when:

- the first site row starts materially closer to the top than in the current Pure Speed Dial build;
- no second search bar or second navigation model appears;
- an experienced user can reach core actions without opening Settings or context menus by using keyboard commands;
- advanced functions are discoverable but visually absent when not used;
- the grid keeps more screen area than any secondary feature;
- all old user site/space/category/history data migrates without destructive reset;
- full CI passes including interaction and visual regression;
- final iteration report includes actual desktop/mobile screenshots with numbered change markers.

## 22. Deferred roadmap

After the first package is stable:

**Phase 2:** Smart Organizer + HTML bookmark import.  
**Phase 3:** richer tile presentation, optional pinned/large tiles and Focus Mode polish.  
**Phase 4:** optional AI Organizer/provider adapters.

Every later phase must preserve the grid-first and contextual-power invariants above.
