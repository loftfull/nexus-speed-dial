# Nexus Speed Dial — Design Constitution 2.0

Date: 2026-09-17
Status: Approved
Branch: `arena/01a0a900-nexus-speed-dial`

## Purpose

This constitution defines the visual character and implementation constraints for Nexus Speed Dial. It extends the approved Glass UI specification and the Design-led Stabilization specification. The product must feel light, spatial, refined, expensive, calm, and technically precise. It must create a controlled sensation of floating layers and three-dimensional depth without becoming theatrical, glossy, neon, toy-like, or visually noisy.

The intended emotional result is: **premium spatial software** — calm like high-end desktop software, light like a physical glass object, and responsive like a carefully engineered native application.

## Core visual hierarchy

Every screen follows this order of importance:

1. content and task
2. information hierarchy
3. geometry and spacing
4. typography
5. material and depth
6. motion
7. decoration

Decoration may never compensate for weak hierarchy or spacing.

## Premium depth model

Nexus uses a restrained z-axis system. Depth is communicated using consistent shadow direction, blur, border highlights, material opacity, relative contrast, and small vertical movement. Perspective transforms, large tilt effects, rotateX/rotateY, fake holograms, and neon glows are prohibited in the production visual language.

### Elevation levels

- `z0 — canvas`: wallpaper/background only; no local shadow.
- `z1 — content`: site tiles, list rows, settings cards; subtle contact shadow.
- `z2 — chrome`: sidebar, toolbar clusters, dock, omnibox; floating material.
- `z3 — overlay`: calendar, contextual menus, sheets, command palette; stronger separation.
- `z4 — modal`: settings modal, destructive confirmation, high-priority dialog.

Higher elevation means a larger and softer distant shadow, not a darker shadow.

### Fixed light source

All elevations behave as if soft daylight comes from the upper-left/front of the interface.

Surfaces use:
- a very subtle bright top/left border highlight;
- a faint darker lower/right border or contact shadow;
- a broad low-opacity ambient shadow beneath the surface;
- an optional inner highlight on glass.

The direction must not change between components.

## Material system

### Air canvas

The page background is not flat white and not visually busy. It uses:
- cool near-white base;
- large low-contrast radial light fields;
- optional muted blue/cyan/violet atmospheric tint;
- no visible dot-grid pattern in the premium default;
- no decorative pattern that competes with tiles.

The background should make floating surfaces visible even when the user does not consciously notice the background itself.

### Glass chrome

Glass is reserved for navigation and interaction chrome:
- sidebar
- top controls
- dock
- calendar
- command palette
- modal/sheet surfaces
- contextual popovers

Default glass behavior:
- translucent near-white material;
- blur in the 18–28 px family depending on elevation;
- mild saturation boost;
- top-edge highlight;
- hairline cool border;
- layered soft shadow.

Glass must never reduce text contrast below a comfortable reading level.

### Content surfaces

Primary content should be more opaque than chrome. Site tiles retain brand identity and can use neutral soft glass, soft solid, or the selected user preset. Default site tiles should feel like individual physical cards resting above the canvas, not like windows cut out of the sidebar.

### Dark theme

Dark mode uses dark blue/graphite translucent material rather than pure black. Depth is created through subtle edge light, local contrast, and shadow rather than heavy black drop shadows.

## Token architecture

The visual system uses three layers of tokens.

### Primitive tokens

Raw values only:
- color
- alpha
- spacing
- radius
- blur
- shadow
- font size
- font weight
- timing
- easing

### Semantic tokens

Examples:
- `--surface-canvas`
- `--surface-glass-chrome`
- `--surface-content`
- `--surface-overlay`
- `--text-primary`
- `--text-secondary`
- `--border-glass`
- `--focus-ring`
- `--elevation-1`
- `--elevation-2`
- `--elevation-3`
- `--motion-fast`
- `--motion-standard`
- `--motion-spatial`

### Component tokens

Examples:
- `--sidebar-surface`
- `--site-card-shadow`
- `--dock-shadow`
- `--omnibox-height`
- `--site-card-radius`
- `--modal-radius`

Components consume semantic/component tokens rather than raw hex or arbitrary shadows whenever the touched code is part of the stabilization work.

## Spacing and geometry

Nexus uses a hybrid spacing system:

- 4 px micro-grid for icons, labels, chips, compact control internals, and optical alignment;
- 8 px macro-grid for component relationships and page structure;
- 2/6/10 px optical values are allowed only when icon or text alignment requires them.

Recommended spacing ramp:
`2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48`.

### Radius hierarchy

- small control: 10–12 px
- compact card: 14–16 px
- site tile: 18–22 px
- floating chrome: 20–24 px
- modal/sheet: 24–28 px

Radius communicates containment level. Random radii are not allowed.

## Typography

Primary stack remains Cyrillic-safe: Manrope/Inter-class sans-serif.

Use semantic roles instead of one-off sizes:
- display/workspace title
- section title
- body/control
- metadata
- helper/caption

Rules:
- avoid thin/light weights for small text;
- headings use controlled negative tracking only where visually justified;
- metadata must not be so pale that it becomes decorative noise;
- important labels never rely on color alone;
- mobile text does not shrink simply to fit more controls.

## Motion system

Motion creates physical continuity and perceived quality.

### Timing families

- micro feedback: 110–140 ms
- control/state change: 160–220 ms
- floating surface entry/exit: 220–300 ms
- spatial reflow: 260–340 ms

### Movement rules

- standard hover lift: 2–4 px
- premium tile hover may reach 5 px only on desktop pointer devices;
- press compression: approximately 0.985–0.97 depending on component size;
- do not combine large lift with large scale;
- dock magnification must be restrained; it should feel elastic, not cartoonish;
- large top-level screen changes prefer fade/reflow over dramatic slide animation;
- reduced-motion disables or minimizes nonessential transforms.

### Easing

Use a small named family of easing tokens. Avoid component-specific random cubic-bezier values unless there is an interaction-specific reason.

## Interaction state contract

Every interactive component implements applicable states:
- default
- hover
- active/pressed
- selected/current
- focus-visible
- disabled
- loading
- error

A visible focus indicator is mandatory. Focus may be elegant but must remain unmistakable. Modals/popovers restore focus to their trigger where practical.

## Adaptive density

Nexus is desktop-first but not desktop-only.

### Desktop

- information-dense but visually breathable;
- compact controls are allowed;
- pointer hover states are available;
- side navigation can remain persistent.

### Tablet

- controls retain hierarchy but reduce chrome width;
- secondary controls may move into overflow or a compact toolbar;
- content spacing remains deliberate, not simply compressed.

### Mobile

- core capabilities remain available;
- persistent sidebar becomes a sheet/drawer;
- modal surfaces may become bottom sheets;
- pointer-only affordances receive visible touch alternatives;
- touch targets are generous even when visual icons are compact.

## Accessibility as premium quality

Accessibility is part of perceived product quality, not a compliance layer.

- visible keyboard focus;
- focus not obscured by floating dock or overlays;
- destructive actions remain explicit;
- drag-and-drop functions must have a non-drag alternative when the interaction is user-facing;
- icon-only controls have accessible labels;
- text and state contrast remain readable over glass;
- reduced motion is supported;
- touch targets are not made impractically small for aesthetic reasons.

## Premium component recipes

### Sidebar

Feels like a thin suspended glass sheet separated from the atmospheric canvas. The shadow is broad and soft. Internal sections are separated mainly by spacing and typography, with borders only when needed.

### Omnibox

Feels like a recessed-but-floating control embedded in the top interaction layer. Its focus state gains a controlled bright ring and slight material clarity increase rather than a large blue glow.

### Site tile

The site tile is a content object. Default appearance:
- neutral soft glass/solid hybrid;
- one directional highlight;
- low contact shadow plus broad ambient shadow;
- recognizable site icon/brand color;
- subtle hover lift;
- clearer selected state without neon glow.

The tile must not imitate a glossy plastic button.

### Dock

The dock should appear slightly closer to the viewer than the main chrome. It receives the strongest regular non-modal elevation but keeps restrained item scaling. Current exaggerated magnification is reduced.

### Command palette

This is a high-value premium surface. It may use stronger blur, higher material opacity, larger radius, and deeper elevation than the dock. Search field and results remain visually quiet so the content dominates.

### Settings

Settings should feel like a precision instrument panel, not a collection of unrelated cards. Use fewer containers, stronger grouping by spacing, stable alignment, and a consistent live preview surface.

## Anti-patterns prohibited in the premium default

- visible neon glow as a main interaction language
- large perspective tilt
- rotateX/rotateY interaction gimmicks
- excessive scale on hover
- unrelated shadow directions
- pure black hard shadows
- every component using glass simultaneously
- excessive inner borders
- decorative gradients on every card
- ultra-light helper text
- floating controls that cover focus targets
- fake functionality included only to make a screen look full

User-selectable experimental tile presets may remain available, but the application's own shell and default preset must follow this constitution.

## Design QA matrix

Every high-value screen is reviewed on these axes:

1. task hierarchy
2. first focal point
3. next obvious action
4. spacing rhythm
5. baseline and edge alignment
6. typography role consistency
7. material hierarchy
8. depth consistency
9. shadow/light direction
10. control state completeness
11. focus visibility
12. responsive/adaptive integrity
13. empty/loading/error quality
14. motion restraint
15. brand/icon fidelity
16. absence of decorative no-op UI

A screenshot baseline is necessary but not sufficient: visual QA must also judge these invariants.

## Implementation constraints

- Preserve the existing approved calendar-as-popover behavior.
- Preserve recognizable site branding.
- Preserve local-first behavior and current functional contracts while styling is changed.
- Prefer CSS tokens and focused component styles over JavaScript-driven animation.
- Do not introduce a heavy animation framework solely for premium effects.
- Do not add WebGL or shader-based glass.
- Do not weaken Browser Bridge security to support styling or preview behavior.

## Acceptance criteria

Design Constitution 2.0 is considered implemented when:

- the default shell visibly separates canvas, content, chrome, overlay, and modal elevations;
- glass is concentrated in chrome rather than applied indiscriminately;
- the default background is atmospheric and pattern-free;
- site tiles feel elevated but restrained;
- the dock no longer uses exaggerated magnification;
- focus-visible states are explicit across primary controls;
- premium token groups replace repeated raw values in the touched design-system paths;
- desktop, tablet, and mobile preserve coherent depth and density;
- reduced motion removes nonessential lift/magnification;
- visual regression baselines are reviewed before acceptance;
- no functional regression is introduced while the visual system is upgraded.
