# Nexus Speed Dial — Glass UI Design Specification

Date: 2026-08-31

## Goal
Build Nexus Speed Dial as a production-ready visual bookmarks application with a restrained, realistic glass design inspired by macOS Liquid Glass, GNOME simplicity, and KDE precision. The application must remain fast, compact, and practical: users should be able to open a saved site in one or two actions.

## Product principles
- Russian-language UI with high-quality Cyrillic typography.
- Glass design is used for the application shell and controls; site tiles preserve recognizable service branding and colors.
- No sci-fi, neon, excessive 3D, or physically unrealistic glass effects.
- Calendar is never a permanent column; it opens only as a popover from the date.
- Desktop-first layout with responsive tablet/mobile behavior.
- Every visual change must be achievable with standard HTML/CSS/React techniques: rgba backgrounds, backdrop-filter, borders, shadows, transforms, and transitions.
- A release is not considered complete until visual QA and regression checks pass.

## Primary information architecture
Six top-level user sections:
1. Быстрый доступ
2. Избранное
3. Недавние
4. Загрузки
5. Заметки
6. Настройки

Secondary/contextual UI is implemented as popovers, drawers, modals, or panels rather than additional global sections: calendar, weather details, add/edit site, category/project editing, import/export, profile, confirmation dialogs, and toasts.

## Desktop application shell
### Left sidebar
Persistent frosted-glass sidebar, approximately 300–320 px wide, containing:
- Nexus / Speed Dial brand block.
- Clock and clickable date.
- Compact weather card and short forecast.
- Projects: Дом, Работа, Проект, plus add control.
- Categories as compact chips.
- Hierarchical explorer with two levels maximum.
- Add-category action.

### Top omnibox
- Back and forward controls.
- Large search/address field: «Введите запрос или адрес».
- Search icon on the left.
- Favorite and security actions on the right.
- Compact profile control at far right.

### Main workspace
- Tabs: Быстрый доступ / Недавние / Избранное.
- Grid/list mode controls.
- Local bookmark search and filter.
- Main Speed Dial grid.

### Bottom dock
Floating frosted-glass dock with icon-only desktop controls:
- Главная
- Избранное
- Недавние
- Загрузки
- Заметки
- Настройки

## Glass design tokens
Initial design-system defaults:
- Background: #F3F7FC to #EDF3FA.
- Accent: #2F7CF6.
- Main text: #101828.
- Secondary text: #667085.
- Muted text: #98A2B3.
- Panel background: rgba(255,255,255,0.58–0.78).
- Backdrop blur: 14–22 px depending on surface role.
- Saturation: 115–130%.
- Border: 1 px rgba(255,255,255,0.55–0.65).
- Secondary border: rgba(120,145,180,0.10).
- Large panel radius: 24–28 px.
- Tile radius: 18–22 px.
- Control radius: 14–18 px.
- Shadows: soft, broad, low-contrast; no hard black shadows.
- Typography: Onest / Inter / Manrope-class Cyrillic sans-serif.

These values are implemented as CSS variables/design tokens so that live settings can update the UI without reload.

## Speed Dial tile engine
### Display modes
The tile system supports at least:
- Минимальный
- Стандартный
- Расширенный
- Крупный
- Список

### Tile data
A site tile can display, depending on preset and settings:
- favicon/service icon
- site title
- short subtitle/description
- domain
- category
- optional badge/counter
- favorite state
- context menu

### Visual states
All tiles share a consistent state machine:
- normal
- hover
- pressed
- selected
- focus-visible
- dragging
- drop-target

Suggested default motion:
- hover translateY: -2 to -3 px
- hover scale: 1.01–1.02
- pressed scale: about 0.97
- transitions: 180–220 ms
- reduced-motion mode disables or minimizes non-essential movement

### Original branding
Website/service icons remain recognizable and colorful. The app must not force every site icon into a single color or artificial 3D style.

## Live tile appearance settings
The tile settings section must update the visible preview immediately. Settings are grouped into Basic and Advanced modes so novice users are not overwhelmed.

### Basic settings
- preset: minimal / standard / expanded / large / list
- tile size: S / M / L / XL
- grid columns: auto or explicit count
- tile width and height
- grid gap
- corner radius
- icon size
- title visibility
- subtitle visibility
- domain visibility
- category visibility
- counter/badge visibility
- label placement/alignment

### Advanced appearance
- glass opacity
- blur intensity
- glass saturation
- border visibility and intensity
- border highlight
- shadow enabled
- shadow depth/softness/opacity
- hover glow enabled/intensity
- selected-state glow
- tile background mode: transparent / neutral glass / soft tinted glass
- icon treatment: original / soft background / transparent

### Motion and interaction
- hover animation on/off
- hover lift
- hover scale
- pressed compression
- transition duration
- easing preset
- load appearance animation
- focus ring style
- reduced motion
- drag-and-drop visual feedback

### Preview behavior
The settings screen contains a live preview showing at least normal, hover, pressed, and selected states. Changes apply immediately through CSS variables. Reset-to-default is available.

## Calendar behavior
- Clicking the date opens a compact glass popover.
- The popover contains month navigation, selected day, and optional day note.
- It never reserves a permanent layout column.
- Escape, outside click, or second date click closes it.

## Weather behavior
- Sidebar shows current conditions and a compact forecast.
- Expanded details open in a popover/bottom sheet rather than a full dashboard.
- Geolocation permission must never trap the user in a repeated permission dialog. Manual city selection is always available.

## Responsive behavior
### Tablet
- Narrower sidebar or collapsible rail.
- Reduced tile columns.
- Dock remains floating.

### Mobile
- Persistent sidebar disappears.
- Projects/categories open in drawer or bottom sheet.
- Section/subsection navigation is icon-forward to save space.
- Speed Dial uses 2–3 columns depending on width.
- Add/edit forms and calendar/weather details use bottom sheets.

## Component architecture
Core UI units:
- AppShell
- GlassSurface
- Sidebar
- ClockWeatherCard
- ProjectsNav
- CategoriesExplorer
- Omnibox
- WorkspaceTabs
- BookmarkSearch
- SpeedDialGrid
- SiteTile
- TileStyleEngine
- TileSettingsPanel
- CalendarPopover
- WeatherPopover
- Dock
- Toast
- ConfirmDialog

Each component has a narrow responsibility and communicates through explicit props/state interfaces.

## State and persistence
Initial implementation should avoid unnecessary backend complexity. Local state/persistence is enough for the first usable build:
- local bookmarks
- projects/categories
- tile appearance settings
- active project/category
- notes
- history

A storage abstraction should isolate persistence so sync/cloud storage can be added later without rewriting UI components.

## Error handling
- Broken favicon: fallback to generated letter/domain icon; never show broken image placeholders.
- Offline: local bookmarks, structure, notes, and settings remain usable.
- Failed network metadata lookup: site creation still succeeds with user-entered title and URL.
- Invalid destructive actions require confirmation; routine setting changes do not.

## Testing strategy and release gate
A version is not complete until all applicable checks pass:
1. Type/lint checks.
2. Unit tests for state, tile presets, persistence adapters, and utility logic.
3. Component interaction tests for search, tabs, tile actions, project/category navigation, calendar popover, and settings changes.
4. Responsive checks at desktop, tablet, and mobile breakpoints.
5. Screenshot-based visual regression for the main screen and tile settings screen.
6. Explicit visual QA against the approved Glass Design reference: spacing, radii, typography, glass intensity, icon fidelity, dock placement, sidebar hierarchy, and absence of a permanent calendar column.

No completion report should be issued while a release-gate item is failing.

## First implementation milestone
The first implementation cycle should deliver:
- project scaffold
- design tokens
- AppShell
- desktop sidebar
- omnibox
- main Speed Dial grid
- SiteTile states
- floating dock
- calendar popover behavior
- first live tile settings panel
- local persistence for appearance settings
- baseline interaction and visual tests

## Explicit non-goals for first milestone
- cloud account sync
- collaboration
- complex AI features
- analytics dashboards
- system monitoring widgets
- custom ray-traced/refraction glass shaders
- deep nested category trees

These are intentionally excluded to protect usability and implementation quality.
