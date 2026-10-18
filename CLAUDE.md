# Nexus Speed Dial — rules for integrating Figma designs

Written for an agent translating a Figma node into this codebase via the Figma
MCP server. Figma output is a **reference to adapt**, never code to paste: this
project has a closed design system and three guards that will reject a literal
translation.

Read `docs/design-system.md` for the reasoning behind the rules; this file is
the operational summary.

---

## 0. Before writing any markup — the three guards

These run in CI (`Fast · unit / build / guards`) and locally. A design handed
over from Figma almost always violates the first two on the first attempt.

```bash
npm run scale     # scripts/check-scale.mjs   — type / weight / radius scale
npm run classes   # scripts/check-classes.mjs — class names and spec selectors
npm run test      # vitest, 311 tests
```

| Guard | Rejects |
|---|---|
| `scale` | any `font-size` that is not a `--nx-fs-*` token; any `font-weight` outside 400/600/700; any radius outside the five steps |
| `classes` | a class in markup with no CSS rule; any new name outside the `nx-` namespace; a spec selector pointing at a node that does not exist |

`check-classes.mjs` reads the **whole** `className` expression (brace-matched),
so you cannot slip a name past it by concatenating:

```tsx
// both names are seen by the guard
<div className={'nx-panel' + (open ? '' : ' collapsed')}>
```

`OUTSIDE_NAMESPACE` in that script is **empty and is a ratchet** — it may only
shrink. Do not add to it. Every block and element is `nx-*`; only modifiers from
the closed `STATES` set are written bare.

---

## 1. Token definitions

**One file, one `:root` block:** `src/app/theme.css` (lines 10–67). There is no
JSON token source, no Style Dictionary, no transformation step. The CSS custom
property *is* the token.

```css
:root{
 --nx-canvas:#f5f6f8;  --nx-surface:#ffffff;  --nx-sunken:#eef0f4;
 --nx-line:#e4e7ee;    --nx-text:#1c2026;     --nx-muted:#5f6773;
 --nx-accent:#1a5ed0;  --nx-accent-soft:#e7effc;
 --nx-shadow-sm: …;    --nx-shadow: …;        --nx-shadow-lg: …;
 --nx-fs-1:11px; --nx-fs-2:12px; --nx-fs-3:13px;
 --nx-fs-4:14px; --nx-fs-5:16px; --nx-fs-6:21px;
 --nx-fs-hero:34px; --nx-fs-clock:46px; --nx-fs-clock-lg:54px;
 --nx-r-xs:4px; --nx-r-sm:10px; --nx-r-md:14px; --nx-r-lg:20px; --nx-r-xl:24px;
}
:root[data-theme="dark"]{ /* same names, re-bound */ }
```

**Mapping a Figma value:** snap to the nearest token; never introduce a new step.
A Figma text layer at 15px becomes `--nx-fs-4` (14px) or `--nx-fs-5` (16px) — pick
one and move on. The scale is deliberately six steps because the file once held
nineteen, some 0.5px apart.

**Weights:** 400, 600, 700 only. **Radii:** the five `--nx-r-*` steps, plus the two
shapes `50%` and `999px`.

### Trap: there are two accent variables and they are not the same

| Variable | Set where | Follows the user's accent? | Uses |
|---|---|---|---|
| `--nx-accent` | `theme.css` `:root` | **no** — only light/dark | 109 |
| `--accent` | `src/app/App.tsx:297`, `setProperty` from `appearance.accent` | **yes** | 9 |

Use **`--nx-accent`**. The nine `var(--accent, …)` uses are confined to the
browser-import block and are the one inconsistency in the file; do not copy the
pattern into new work.

---

## 2. Component library

Plain React function components. **No Storybook, no component docs site, no
CVA/variant library, no `components/ui` primitives directory.**

| Path | Holds |
|---|---|
| `src/app/` | shell and screen-level pieces — `App.tsx`, `SettingsPanel.tsx`, `Tile.tsx`, `TileGrid.tsx`, `CommandPalette.tsx`, `ActionDialog.tsx`, `Breadcrumbs.tsx`, `NodeMark.tsx`, `SiteIcon.tsx` |
| `src/app/SettingControls.tsx` | the settings control kit — `Card`, `Cell`, `Group`, `Pick`, `Switch`. **Reuse these before inventing a control.** |
| `src/components/` | self-contained panels — `AddSiteModal`, `BrowserImportPanel`, `CalendarPopover`, `MobileSections`, `NotesWorkspace` |
| `src/domain/` | pure logic, no JSX (44 files) — put anything computable here, with a unit test |
| `src/hooks/` | `useFocusTrap` (the only hook) |

Architecture in practice: props in, markup out, state lifted to `App.tsx`, which
holds a reducer store (`src/domain/appStore.ts`) over ten `localStorage` keys.

A representative component — note the element-class pattern and the `off` state:

```tsx
// src/app/SettingControls.tsx
export function Cell({ icon: Icon, label, why, hint, disabled, children, as = 'div' }) {
  const Tag = as;
  const note = disabled === true ? (why ?? hint) : hint;
  return (
    <Tag className={'nx-cell' + (disabled ? ' off' : '')} title={disabled && why ? why : label}>
      <span className="nx-cell-top"><Icon size={14} /></span>
      <span className="nx-cell-control">{children}</span>
      <span className="nx-cell-text">
        <span className="nx-cell-label">{label}</span>
        {note && <span className="nx-cell-why">{note}</span>}
      </span>
    </Tag>
  );
}
```

---

## 3. Frameworks, build, tests

| | |
|---|---|
| UI | React **19.3** (`react`, `react-dom`) |
| Language | TypeScript **7.0**, strict; `npx tsc --noEmit` must be clean |
| Bundler | Vite **8.3** + `@vitejs/plugin-react` — `vite.config.ts` |
| Styling | **plain CSS**, one file. No Tailwind, CSS Modules, styled-components, Sass, or PostCSS plugins |
| Unit tests | Vitest + Testing Library + jsdom |
| Browser tests | Playwright — `e2e/`, three projects: `desktop` 1536×1024, `tablet` 1024×900, `mobile` iPhone 13 (**WebKit in CI**) |

`base` is environment-dependent and this matters for assets:

```ts
// vite.config.ts
base: process.env.GITHUB_ACTIONS ? '/nexus-speed-dial/' : '/',
```

---

## 4. Asset management

No CDN. Everything is served from the app's own origin — a new-tab page must not
announce itself to a third party when it opens.

**Fonts** — self-hosted, generated. `scripts/build-fonts.mjs` copies subsets from
`@fontsource/*` into `src/assets/fonts/` (26 files) and writes `src/app/fonts.css`.
Inter and Manrope, weights 400/600/700, latin + cyrillic, `font-display:swap`.
Both files are **generated — edit the script, not the output.**

**Brand marks** — `public/brands/`, **3443 SVGs** plus `index.txt`, generated by
`scripts/build-brand-marks.mjs` from `simple-icons`.

All three run automatically via `prebuild` / `predev` / `prepreview`.

**Always build asset URLs from `BASE_URL`**, never from `/`:

```ts
// src/domain/brandMark.ts
const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/*$/, '/');
export const brandMarkUrl = (slug: string) => `${BASE}brands/${slug}.svg`;
```

An absolute `/brands/…` 404s under GitHub Pages and the marks silently fall back
to monograms. An e2e test guards this.

---

## 5. Icon system

**Do not add `@phosphor-icons/react` or any icon package to the bundle.**

Icons come from one generated module, `src/app/icons.generated.tsx`, built by
`scripts/build-icons.mjs` from `@phosphor-icons/core`. Only two weights ship
(`duotone`, `regular`; `fill` for `Star` alone) and only the names listed in
`scripts/icon-map.json` — the ready-made package added ~47 KB gzip.

```tsx
import { Plus, StickyNote, ChevronRight } from '../app/icons.generated';

<Plus size={15} />                    // default weight: regular
<Folder size={22} weight="duotone" /> // duotone only on large marks
```

**Naming:** the export name is a stable local alias, mapped to a Phosphor name in
`icon-map.json` (`"ChevronRight": "CaretRight"`, `"Clock3": "Clock"`). To add an
icon: add the pair to `icon-map.json`, run `npm run icons`, and **commit the
regenerated file** — build, tests and editor must not depend on step order.

Every icon renders `fill="currentColor"` and `aria-hidden="true"`, so colour it
through the parent's `color`.

---

## 6. Styling approach

**One stylesheet:** `src/app/theme.css`, 1869 lines. It is the only CSS in the
app — the last separate sheet (`browser-import.css`) was folded in. Keep it that
way; `check-classes.mjs` and `check-scale.mjs` read this one file.

**Cascade layers** keep the reset from fighting the UI:

```css
@layer nx-reset, nx-ui;
```

**Naming:** `nx-block`, `nx-block-element`; modifiers are bare words from the
closed `STATES` set in `check-classes.mjs`:

```
on off active picked open ready primary danger error success
missing checking connected unsupported collapsed compact still
swapping menu-open is-hover is-press bare drop panel-collapsed brand add filled
```

```css
.nx-tile{…}            /* block   */
.nx-tile-name{…}       /* element */
.nx-tile.picked{…}     /* state   */
```

**Theming** is attribute-driven on `<html>`: `data-theme="light|dark"` and
`data-wallpaper="…"`, both set in `App.tsx`. Write dark rules as
`:root[data-theme="dark"] .nx-x{…}` next to the light rule — never a separate
section.

**Responsive** — plain media queries, mobile adjustments written as overrides
after the desktop rule. Established breakpoints, reuse them rather than adding:

| Query | Count | Meaning |
|---|---|---|
| `max-width:900px` | 6 | phone / narrow shell |
| `max-width:760px` | 3 | dense panels stack |
| `max-width:1180px` | 1 | rail hidden |
| `min-width:1280px` | 1 | wide settings window |
| `max-width:680px` / `min-width:681px` | 2 | mobile shell switch |

Also honour `prefers-reduced-motion`, `prefers-reduced-transparency` and
`pointer:coarse` — all three already have rules.

---

## 7. Project structure

```
src/app/         shell, screens, SettingControls kit, theme.css, fonts.css,
                 icons.generated.tsx          (generated: last two)
src/components/  self-contained panels
src/domain/      pure logic + unit tests (44 files)
src/hooks/       useFocusTrap
src/assets/fonts generated woff2 subsets
public/brands/   3443 generated brand SVGs + index.txt
scripts/         generators (brands, fonts, icons) and guards (scale, classes)
e2e/             app-shell.spec.ts, visual.spec.ts, hierarchy-…, extension-bridge
docs/            design-system.md, home-layout.md, settings-shape.md, …
extension/       browser bridge (separate manifest)
```

Feature organisation is **by layer, not by feature folder.** A new surface means:
markup in `src/app/` or `src/components/`, its logic + test in `src/domain/`, its
rules appended to `theme.css` near related blocks, its behaviour covered in
`e2e/app-shell.spec.ts`.

---

## 8. Translating a Figma node — checklist

1. **Read the node**, then map every value to an existing token. New token = stop
   and ask; the scale is closed on purpose.
2. **Reuse a component** before writing one: `Card`/`Cell`/`Group`/`Pick`/`Switch`
   cover most settings surfaces; `TileGrid`/`Tile` cover grids.
3. **Name in `nx-`**, states from `STATES` only.
4. **Icons** from `icons.generated`; if the design uses an icon that is not there,
   extend `icon-map.json` and regenerate — do not inline an SVG.
5. **Append CSS to `theme.css`**, with the dark-theme rule beside it.
6. **Run `npm run scale && npm run classes && npx tsc --noEmit && npm run test`.**
7. **Add an e2e assertion** for anything a user can see or click, then prove it
   fails without your change — a test that cannot redden proves nothing.
8. **Visual baselines are shot only in CI** (`e2e/visual.spec.ts`). Locally they
   always differ: the container has Chromium 141, CI has 153. Do not re-shoot them
   locally and do not treat local pixel failures as regressions. Accepting a new
   baseline goes through `.github/visual-review-request` (`mode=candidate` →
   review → `mode=accept`).

### Comparator tolerance, so you can read a visual failure correctly

`e2e/visual.spec.ts` uses `{ maxDiffPixels: 250, threshold: 0.1 }`. Playwright
counts a pixel as different only when its YIQ delta exceeds `35215 · threshold²`;
at the old default of `0.2` a flat grey shift of up to **52.8 of 255** counted as
a match, which once let a removed control pass review. At `0.1` the limit is 26.4.
A soft, large-area change can therefore be real and still nearly invisible to the
gate — check the structural e2e assertions too.

---

## 9. Known exceptions — do not imitate

- `var(--accent, #2f7cf6)` and a handful of hardcoded colours survive inside the
  `.nx-browser-*` block. `theme.css` overrides most of them via
  `.nx-settings .nx-browser-*` at higher specificity, so edits to those literals
  have no visible effect. New work uses `--nx-accent` and the tokens.
- `icons.generated.tsx`, `fonts.css`, `src/assets/fonts/`, `public/brands/` are
  **generated and committed**. Edit the generator in `scripts/`, run it, commit
  the output.
