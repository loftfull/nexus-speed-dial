# Nexus Pure Speed Dial — Architecture Design

**Status:** Approved for implementation

**Date:** 2026-09-07

**Supersedes for product architecture:** `docs/superpowers/specs/2026-08-31-nexus-speed-dial-design.md` where the older document conflicts with this specification. The older document remains useful for visual tokens, glass treatment, responsive breakpoints, persistence and QA constraints.

## 1. Product definition

Nexus is a **Pure Speed Dial**. Its primary job is to let a user reach a saved site with the least possible cognitive and interaction cost.

Primary user journeys:

1. Open Nexus → click a site.
2. Open Nexus → choose space → choose category → click a site.
3. Open Nexus → type a few characters or an address in Omnibox → open the result.

Nexus is not a browser shell, download manager, knowledge base, note application, analytics dashboard or system monitor.

### Product rule

Every primary operation must have exactly one obvious entry point. If the same operation is exposed through two independent navigation mechanisms, the change is considered an architecture regression.

## 2. Information architecture

There is one main application screen.

Desktop hierarchy:

```text
Nexus
├─ Sidebar
│  ├─ Spaces
│  ├─ Category tree for active space
│  └─ Compact utility status: time / weather / date
└─ Workspace
   ├─ Omnibox + Grid/List + Settings
   ├─ Content mode: All / Favorites / Recent
   └─ Site grid or list
```

Mobile hierarchy:

```text
Top bar: menu / Nexus / time / weather
Omnibox + Grid/List + Settings
All / Favorites / Recent
Site grid

Menu drawer/bottom sheet
├─ Spaces
└─ Category tree for active space
```

There is no bottom Dock.

## 3. Navigation model

### 3.1 Spaces

The old user-facing term `Проекты` becomes **`Пространства`**.

Each site belongs to exactly one space. Each category belongs to exactly one space.

A site never exists simultaneously in multiple spaces. Moving it changes its `spaceId` and optionally its destination category.

### 3.2 Categories

Categories are scoped to the active space.

Supported hierarchy:

- virtual root: `Все сайты`;
- level 1 category;
- optional level 2 child category;
- deeper nesting is forbidden.

The UI must show one category tree only. Remove the old duplicate concepts `Категории`, `Проводник` and the separate category filter popover.

### 3.3 Content modes

Workspace contains exactly three modes:

- `all` — all sites in the active space/category;
- `favorites` — favorites in the active space/category;
- `recent` — recently opened sites in the active space/category.

Favorites and Recent are not separate application sections.

### 3.4 Layout mode

`grid | list` is a presentation choice, not navigation.

## 4. Search and Omnibox

Omnibox is the only search field in the product.

It supports:

1. global search across saved sites in all spaces;
2. direct safe HTTP/HTTPS URL opening;
3. web search for plain text using the configured search engine.

Saved-site suggestions from another space show context:

```text
GitHub
github.com
Работа / Разработка
```

Selecting an Omnibox result opens the site without silently switching the active space/category.

Remove from the top bar:

- browser Back/Forward controls;
- permanent security Shield;
- decorative profile chip;
- duplicate bookmark search;
- category Filter control.

Top-right controls are only:

- Grid/List;
- Settings.

## 5. Site tile interaction model

A tile has one primary action: open the site.

Secondary actions live in one `⋯` contextual menu:

- Open;
- Add to / remove from Favorites;
- Edit;
- Move to space/category;
- Delete.

A favorite marker may be visible as passive state, but must not create a second permanent action button.

`+ Добавить сайт` is represented as a dedicated add tile at the end of the current grid/list.

### Drag and drop

Drag and drop is only for canonical ordering inside the active space/category view.

It is disabled in `recent` because Recent is ordered by visit time.

No drag-to-sidebar cross-space move in Milestone Pure Speed Dial; cross-space movement uses the context menu.

## 6. Canonical ordering

Each site has one manual `position` within its space.

Ordering rules:

- All → manual canonical order;
- Category → same canonical order filtered by category;
- Favorites → same canonical order filtered by favorite;
- Recent → descending latest visit time.

There are no separate saved orders for categories or Favorites.

## 7. Sidebar architecture

Desktop Sidebar contains only:

1. brand;
2. Spaces list;
3. category tree for active space;
4. compact utility status at bottom.

### Space/category controls

Normal click selects.

Management actions are hidden behind `⋯` on hover/focus:

- Rename;
- Move/reorder where applicable;
- Delete.

There is one `+` in the Spaces heading and one `+` in the Categories heading.

Remove:

- permanent pencil buttons;
- duplicate category chips;
- `Проводник` label and second tree;
- duplicate bottom `Добавить категорию` button.

### Destructive actions

Deleting a non-empty space/category requires explicit confirmation and must never silently delete saved sites.

## 8. Utility status: clock, weather, calendar

Desktop Sidebar bottom:

```text
10:37   15°
7 сентября
```

Mobile top bar carries the same compact information.

- click date/time → CalendarPopover;
- click temperature → WeatherPopover;
- no separate weather/calendar buttons;
- no four-day forecast in Sidebar;
- if weather is unavailable, omit temperature rather than showing misleading placeholder content.

## 9. Settings architecture

There is one Settings entry point in the top bar and one right side-sheet.

Settings has four user-facing groups.

### Appearance

- system / light / dark theme;
- interface density;
- background;
- glass strength: Minimal / Standard / Strong.

### Tiles

- visual preset: Minimal / Standard / Large / List;
- size;
- columns: Auto or explicit;
- show title;
- show domain;
- text alignment.

### Search

- default search engine;
- global saved-site search toggle;
- Omnibox suggestions toggle.

### Data

- export backup;
- import backup;
- clear history;
- reset settings.

Settings apply immediately.

Remove from user-facing UI:

- separate Settings screen;
- Advanced/Motion tabs;
- low-level blur/shadow/glow/easing/pressed-scale/load-animation sliders;
- non-functional `Позже` settings cards.

Low-level design tokens may remain internally in the design engine but are not normal end-user controls.

## 10. Notes and Downloads

### Downloads

Remove the Downloads product section and related navigation. No download manager exists in Pure Speed Dial.

### Notes

Remove Notes from primary navigation.

Existing stored notes must not be silently lost. During migration they remain preserved in storage/backup as legacy data until a later explicit migration to optional space notes is implemented.

The Pure Speed Dial UI does not expose a standalone Notes application.

## 11. Application state model

The canonical navigation state is reduced to:

```ts
type ContentMode = 'all' | 'favorites' | 'recent';
type LayoutMode = 'grid' | 'list';

interface NavigationState {
  activeSpaceId: string;
  activeCategoryId: string | null;
  contentMode: ContentMode;
  layoutMode: LayoutMode;
  query: string;
}
```

Overlay/transient UI state is separate:

```ts
interface OverlayState {
  settingsOpen: boolean;
  siteEditorOpen: string | 'new' | null;
  structureEditorOpen: StructureEditorTarget | null;
  calendarOpen: boolean;
  weatherOpen: boolean;
  mobileNavOpen: boolean;
}
```

Remove the competing navigation concepts `AppSection` and `WorkspaceTab`.

For migration compatibility, persisted old keys may be read once and normalized to the new model, but new writes use the new canonical state.

## 12. Data model

Target domain model:

```ts
interface Space {
  id: string;
  name: string;
  icon: string;
  position: number;
}

interface Category {
  id: string;
  name: string;
  spaceId: string;
  parentId?: string;
  icon: string;
  position: number;
}

interface Site {
  id: string;
  title: string;
  url: string;
  domain: string;
  spaceId: string;
  categoryId?: string;
  iconUrl?: string;
  subtitle?: string;
  favorite: boolean;
  position: number;
}
```

Migration may retain the internal legacy storage field `projectId` temporarily if needed for backward compatibility, but public domain APIs and new UI terminology use Space/`spaceId`.

## 13. Data migration and safety

Existing user data must survive the architecture refactor.

Migration rules:

1. old Project → Space with stable id;
2. old Category.projectId → Category.spaceId;
3. old Site.projectId → Site.spaceId;
4. missing positions are assigned deterministically in previous array order;
5. invalid category references are cleared, not fatal;
6. category nesting deeper than two levels is flattened deterministically;
7. Notes remain in legacy backup/storage data;
8. Downloads have no user data to migrate;
9. old `section/workspaceTab` map to the closest new `contentMode`, defaulting to `all`;
10. active Project maps to active Space;
11. backups stay versioned and old version-1 backups remain importable.

No migration may silently delete sites.

## 14. Mobile behavior

At `<=760px`:

- no persistent desktop Sidebar;
- no Dock;
- one compact top bar;
- one navigation drawer/bottom-sheet opened by menu button;
- drawer contains Spaces and category tree only;
- choosing Space/category closes the drawer;
- Omnibox remains primary;
- All/Favorites/Recent remains a compact segmented control;
- 2–3 tile columns according to viewport and preset;
- Site/context/settings overlays remain scroll-safe under virtual keyboard conditions.

## 15. Visual design constraints

Keep the approved glass language, but improve hierarchy rather than adding decoration.

- accent: `#2F7CF6`;
- preserve original colorful service favicons/icons;
- Sidebar/panels may use glassmorphism;
- site tiles use restrained glass/neumorphic depth;
- no neon, sci-fi or ray tracing;
- reduce white-on-white flattening by using clearer layer contrast, borders and depth;
- Russian UI and high-quality Cyrillic typography;
- calendar remains an overlay, never a layout column.

## 16. Architecture guardrails

Release/reference QA must fail if any of these return:

- Dock navigation;
- separate Favorites/Recent application sections;
- separate Downloads/Notes top-level navigation;
- duplicate bookmark search field;
- category filter popover duplicating Sidebar;
- permanent edit pencils for every structure item;
- four-day Sidebar forecast;
- multiple independent Settings entry points;
- user-facing Advanced/Motion tuning panels;
- first tile forced selected without user action.

## 17. Testing and release gate

Required local gate:

```text
npm run lint
npm test
npm run build
npm run test:node
npm run qa:reference
npm run test:e2e
npm run test:visual
```

Reference QA must test architecture invariants rather than fragile formatting strings.

Interaction E2E must cover at minimum:

- choose space;
- choose root category and child category;
- All/Favorites/Recent filtering within active space;
- Omnibox global saved-site suggestion context;
- add/edit/favorite/move/delete site;
- canonical ordering and Recent ordering;
- open/close Settings;
- calendar/weather triggers;
- mobile drawer behavior;
- backup import compatibility.

Visual surfaces:

- desktop main;
- desktop settings;
- desktop structure/context interaction if stable;
- tablet main;
- mobile main;
- mobile navigation drawer.

Do not update visual baselines until the redesigned interface has passed manual visual review.

## 18. Explicit non-goals

Not part of Pure Speed Dial milestone:

- cloud synchronization;
- authentication/profile system;
- AI features;
- analytics dashboards;
- download manager;
- standalone notes application;
- browser tabs/history navigation controls;
- system monitoring;
- cross-space drag-to-sidebar;
- arbitrary-depth category trees;
- team collaboration.

## 19. Definition of done

Pure Speed Dial is ready when:

1. the application presents one coherent main screen;
2. a primary action has one obvious entry point;
3. Dock and duplicate navigation are gone;
4. Spaces + two-level categories are the only structural navigation;
5. All/Favorites/Recent are modes of the same workspace;
6. Omnibox is the only search field;
7. Settings is one compact side-sheet;
8. mobile uses the same mental model as desktop;
9. existing sites/categories/spaces/backups survive migration;
10. the full release gate passes;
11. visual QA confirms no regression toward a cluttered dashboard architecture.
