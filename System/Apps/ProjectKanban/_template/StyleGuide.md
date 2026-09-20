# ProjectKanban — Style Guide

The visual contract for the Dashboard app (`ProjectKanban` is the retained internal folder/project
name — see the README's opening line). `!HouseStyle` is **UNCLASSIFIED** here: this app has no
outer chassis to be subordinate to, so house style governs the whole surface directly. This guide
is the app-local record of how that governance actually lands in `app/tokens.css` and the CSS
files that consume it — read it before touching any colour, space, radius, duration, or type value
anywhere in `app/`.

## The one rule

**Every visual value is a token, and `tokens.css` is the only file that defines one (CSS-2).**
Every other CSS file in `app/` — `board.css`, `card.css`, `controls.css`, `project.css`,
`note-box.css`, `task-row.css`, `print.css` — states in its own header comment exactly which
tokens it needs; none of them write a literal colour, size, or duration. If a value doesn't exist
yet, add it to `tokens.css` and cite it in the consuming file's header list — never inline it.

The corollary: a file stays under ~150 lines and does one job (CSS-1). `board.css`/`card.css` and
`project.css`/`note-box.css`/`task-row.css`/`print.css` are already split this way; a file
approaching the cap is a signal to split again, not to compress.

## Palettes

Three palettes, cycled by `controls` via `body.dataset.palette`. `:root` (bare, no attribute) is
**default** and is always light (FR-10) — dark is reached only by explicit override or an
unset-preference system default, never by `:root` itself.

| Token | default (`:root`) | dark | paper |
|---|---|---|---|
| `--bg` | `#ffffff` | `#14171c` | `#f7f3e8` |
| `--ink` | `#1f2430` | `#e7e9ee` | `#2b2013` |
| `--ink-muted` | `#5b6472` | `#98a1b0` | `#5f5340` |
| `--panel-bg` | `#f3f4f6` | `#1d2129` | `#efe8d6` |
| `--panel-bg-alt` | `#e5e7eb` | `#262b35` | `#e6dcc2` |
| `--border` | `#d3d7dd` | `#333944` | `#d9cca4` |
| `--accent` | `#2f5fdb` | `#6ea8fe` | `#8a4b12` |
| `--focus-ring` | `#c2410c` | `#ffb454` | `#1f6f5c` |

**Dark is reachable two ways** — automatically under `prefers-color-scheme: dark` while the viewer
has never chosen a palette, or explicitly via `body[data-palette="dark"]`. Both blocks in
`tokens.css` carry identical values by construction; a change to one without the other is a defect
(`check_contrast.py` only checks the explicit block — see that file's own comment — so this guide
and a visual check are what catch the media-query twin drifting).

**Print reuses paper, not a fourth palette** (D-13/FR-10): the `@media print` block in `tokens.css`
ships paper's own values verbatim. Changing paper changes print for free; never give print its own
numbers.

**Every new palette or palette edit must pass `check_contrast.py` before it ships.**

## Focus vs. accent

`--focus-ring` never shares a hue with `--accent` in any palette (`!HouseStyle` Step 5.5): a focus
outline and an "active/selected" cue must stay visually distinct even when both are on screen at
once. Check the table above before adding or editing a palette — a new palette that gives focus
and accent the same hue is a defect, not a stylistic choice.

## Type

One system stack, no web font (FR-13, SR-2):

```
--font-body: ui-serif, "New York", Georgia, "Times New Roman", serif;
```

`"New York"` is Apple's system serif (San Francisco's serif sibling); Georgia/Times New Roman carry
the same feel on Windows/Linux. `--font-size-sm` (0.8125rem), `--font-size-base` (0.875rem, the body
default), `--font-size-lg` (1.125rem) — plus one `--line-height-base` (1.45). Never introduce a
second stack.

**A fourth size, `--font-size-xl` (1.75rem), was added 2026-09-14** for exactly one element: the
app's own `<h1>` in `.app-header` (controls.css), which had no styling at all until Luke asked for
it to look designed rather than sit at the raw browser default. Nothing else may read this token —
it exists for the page's one title, not as a new general-purpose step. Widening the type scale
again for a second element is Luke's call, the same as the lane-hue and button-recipe reopenings
above.

## Spacing and radii

One 4px-rooted spacing scale, five steps, no others:

`--space-2xs` 4px · `--space-xs` 8px · `--space-sm` 12px · `--space-md` 16px · `--space-lg` 24px

Three radii, no more: `--radius-sm` 4px · `--radius-md` 8px · `--radius-lg` 14px.

**Gutter hierarchy (2026-09-14).** The scale gives five sizes; which one a gutter uses should
follow what it separates, not habit — the pre-existing bug this fixed was the board's *outer*
seams (between columns, between lanes) sitting at `--space-2xs` while the *inner* gap between two
cards in the same column sat at `--space-sm`, so the big structural joins read tighter than the
small ones inside them. The standing rule now:

- **A structural seam — between board columns, between lanes, between cards in the same column,
  toolbar groups, the rail's own padding — is `--space-sm` (12px).** These are the joins a reader's
  eye uses to tell one region from its neighbour; they should all read the same width.
- **An edge buffer — a cell's padding against its own column boundary, the gap between buttons
  inside one toolbar group — is `--space-xs` (8px).** Visibly smaller than a structural seam, so a
  card never looks glued to the column edge, but still distinct from the tight internal spacing
  below.
- **Internal/typographic gaps — the lines inside one card, one chip row, one note field — use
  `--space-2xs` or whatever the existing rule already sets.** These aren't gutters between regions;
  leave them as they are.

A new gutter should be sized by which of these three roles it plays, not by copying whatever
value happens to be nearby in the file.

## Motion

Exactly three durations in the whole app (FR-12) — `--motion-fast` 120ms, `--motion-medium` 220ms,
`--motion-slow` 360ms, all eased with `--motion-ease: ease`. No CSS file outside `tokens.css` may
write a literal duration; every `transition`/`animation` reads one of the three. That discipline is
what lets `@media (prefers-reduced-motion: reduce)` zero all three at once and turn off every
animation in the app for free, with no `!important` anywhere (CSS-5).

## Lane colours — one hue per lane

`board.css` needs five named colours to key its lanes off (`--l-mine`, `--l-delegate`,
`--l-waiting`, `--l-incoming`, `--l-unshaped`). Luke's 2026-09-12 house two-accent cap (all five
sharing one token) held for two days and was reopened at his own request on 2026-09-14: **each
lane now carries its own hue**, and — because `card.css`'s `.board-card` already inherits
`--lane-color` for its own left border (it was wired for this from the start, just fed one shared
value until now) — every card in a lane picks up that lane's colour automatically, no card.css
change needed.

| Lane | Token | default | dark | paper |
|---|---|---|---|---|
| Mine | `--l-mine` | `#2f5fdb` | `#6ea8fe` | `#8a4b12` |
| Delegate | `--l-delegate` | `#1a8f6b` | `#4fd1a5` | `#4f7a4a` |
| Waiting | `--l-waiting` | `#b8860b` | `#f0b93d` | `#a67c1f` |
| Incoming | `--l-incoming` | `#a3266b` | `#e08fc7` | `#8f3a5c` |
| Unshaped | `--l-unshaped` | `#7a6f9e` | `#a8a0c9` | `#7a6f5f` |

All five are literal hex, repeated across `tokens.css`'s dark-media, dark-explicit and paper
blocks — including `--l-mine`, even though it always carries the same value as `--accent` in every
palette. The tempting shortcut, `--l-mine: var(--accent)` declared once on `:root`, was tried and
caught in verification: a custom property's `var()` reference resolves against the element it's
*declared* on, not lazily at each point of use, so that reference stayed pinned to `:root`'s
default-palette accent even under a `body[data-palette="paper"]` override further down the
cascade. A fifth palette-block edit that forgets one of these five lane tokens is the failure mode
to watch for now — the same shape as the accent/focus-ring duplication this file's header comment
already warns about, just one token wider.

The `body[data-lane-hues="mono"]` toggle in `board.css`/`board.js` still collapses all five back to
one shared `--ink-muted` rail — kept as the escape hatch for whenever the colour reads as noise
rather than signal, not because the five-hue default is provisional.

**Colour is informational here, not decorative** (Tufte): a lane hue exists to answer "whose move
is this card" at a glance across the whole board, not to brighten the page. Keep new lane hues in
the same register as the table above — medium-saturated, not neon, not pastel — and distinct from
`--accent`/`--focus-ring` and from each other in every palette. Widening this set again (a sixth
lane, or splitting one further) is Luke's call, the same as the 09-12 → 09-14 reversal was.

## Buttons

There is one button recipe, used verbatim by `.app-toolbar button` (controls.css) and
`.project-header button` (project.css) — the two places `app/` currently puts a `<button>`. Both
blocks are literal copies of each other rather than a shared class; that duplication is tolerated
only because there are exactly two call sites. A third button gets this same recipe copied in
again; a fourth is the signal to factor it into a shared class instead of copying it a third time.

The recipe, every value a token, 2026-09-14 revision (raised from a flatter, text-like original —
Luke's call that the toolbar buttons didn't read as clickable):

```css
font: inherit;
font-size: var(--font-size-sm);
color: var(--ink);
background: var(--panel-bg);
border: var(--border-width) solid var(--ink-muted);
border-radius: var(--radius-md);
padding: var(--space-xs) var(--space-md);
cursor: pointer;
box-shadow: 0 1px 0 0 var(--border);   /* a resting "lift", no new token */
```

States, identical at both call sites:

- **hover** — `border-color: var(--accent)`, nothing else moves.
- **active/press** — `box-shadow: none` plus `transform: translateY(1px)`, eased over
  `--motion-fast`: the shadow flattens and the button nudges down a pixel, the give a real key has.
- **focus-visible** — the standard focus ring (`--focus-ring-width` solid `--focus-ring`,
  `--focus-ring-offset`), never the browser default outline.
- **pressed/selected** (`[aria-pressed="true"]`, the toolbar's view buttons only) —
  `border-color: var(--ink)` plus `font-weight: 600`, layered on top of the active/press state
  above. Never colour alone: an accent-only "selected" cue is exactly what `!HouseStyle` Step 5.5
  rules out, since colour on this surface is reserved for lane identity, not toolbar state.

Icon buttons (the copy button on a board card, a Next Actions row, a project row) are a different
animal — no border or background chrome, just an SVG that swaps face via the front/back icon
classes rather than a colour literal (see card.css's wishlist #9 comment). Don't reach for the
bordered recipe above for an icon-only control; match the copy button's own pattern instead.

## Row borders — a documented literal, not a token

Every Next Actions row is borderless by default (`.project-task-row`'s own background wash already
separates it from its neighbours). The one exception is `.project-task-row--recurring`
(`task-row.css`) — model.py's `recurring_if_done` field, set on a row that reopens itself on a
cadence once marked Done (`recur.py`): `border: var(--border-width) dashed var(--ink-muted)`, a
plain `dashed` literal alongside the sizing/colour tokens. Dashed is not a colour, size, or duration
value, so it doesn't fit any of the three token categories above (Palettes / Spacing and radii /
Motion) — the same reasoning that already lets `.project-task-due`/`.project-task-owner`/
`.project-task-lane` (line 76) write `solid` as a bare literal inside their own `border:` shorthand.
Minting a fourth token category for a single dashed rule would be adding structure nothing else
needs yet; if a second dash/dot/double-border use case shows up, that's the point to reconsider —
not before.

## Layout

`app/` renders exactly two routes into one `index.html`, chosen by `body[data-route]` — `board.js`
skips its own fetch/render when the attribute says `project`, and vice versa. Each route owns a
different layout shape; neither reuses the other's.

**Board** is a CSS grid, not flexed rows: `.board` sets
`grid-template-columns: var(--board-rail-width) repeat(5, 1fr)` — one rail column plus five date
columns. Each `.board-lane-row` is `display: contents`: it isn't a grid row itself, its children
(the rail cell and five column cells) are, so every lane's cells line up under the same five
column tracks without a nested grid per lane. The rail carries lane identity via a
`border-inline-start` spine plus a `color-mix()` wash, both keyed off `--lane-color` (one hue per
lane — see Lane colours below) — and the title sits at the rail's own top
(`justify-content: flex-start`, not centred), so it's visible as soon as its lane's row comes into
view rather than only once the reader has scrolled to the row's midpoint.

**Project** is a single flex column, not a grid: `.project-page` is
`flex-direction: column; gap: var(--space-lg)`, capped at `--project-page-max-width` and centred
with `margin: 0 auto`. Sections stack the same way one level down, each its own flex column with
`gap: var(--space-sm)`. There is no second column and no sidebar on this route — everything reads
top-to-bottom, which is what lets `print.css` hide chrome without re-flowing anything.

## Interaction & UX conventions

The visual contract above exists to serve a small set of interaction decisions made in the
README's `Key decisions` table — this section is a pointer from style to behaviour, not a second
copy of the reasoning:

- **No drag and drop (D-6).** A card's lane/column is never changed by dragging it; both layouts
  above are read-only in their own route. That's why `board.css` never imports the edit client
  (see the file-ownership table below) — there's nothing on the board route for a button to attach
  a write to.
- **The board is read-only; all edits live in the project view (D-5).** Buttons on the board route
  (the toolbar's view filter, the wiki link) only ever change what is *shown*, never what is
  *stored*. Anything that writes uses the project-header/project-row button recipe instead.
- **Every toggle is a CSS class flip (D-11).** Palette, density, lane-hue mode — none re-render the
  board; they flip an attribute and let the stylesheet do the rest. A new toggle that would need a
  JS re-render instead of a class flip is a design smell worth raising before building it.
- **A linked row fails closed (D-7).** `.project-task-row--linked` carries no inputs, only a
  label, a plain-English reason, and a copy button — visually inert (`--panel-bg-alt` +
  `--ink-muted`) rather than merely disabled-looking, so a reader never wonders whether a click
  might do something.
- **Screen text serves the reader, not the build (D-14).** The server sends codes; the browser
  writes the sentence. A button label or an empty-state message is written for whoever's looking
  at the screen, not as a debugging trace.

## Layout scope, by file

| File | Owns | Never touches |
|---|---|---|
| `board.css` | the lane × column grid, `#board-root`'s own padding, board-level states (empty/error banners) | card internals (→ `card.css`) |
| `card.css` | one project card, both densities, the copy button | the grid itself |
| `controls.css` | `.app-header`/`<h1>` chrome, toolbar chrome, the six-view filter | anything under `#board-root` beyond the filter's `data-view` rule |
| `project.css` | the project page shell, header, read-only sections, shared row/copy-button styling | Next Actions rows (→ `task-row.css`), the note box (→ `note-box.css`), print (→ `print.css`) |
| `note-box.css` | the note box: section choice, the always-visible Agent-guidance hint, submit flow | project page shell |
| `task-row.css` | Next Actions: stem groups, chips, the four per-row edit controls | note box, page shell |
| `print.css` | the `@media print` layout only — hiding chrome, avoiding break-inside orphans | any colour (paper's `@media print` block in `tokens.css` already handles colour — D-13) |

`app/` splits three ways for the same reason this table exists: `board` draws, `controls` holds
state, `project` is the only place anything changes (see README's Navigation map). A style rule
that crosses one of these boundaries belongs in the file that owns the thing being styled, not the
file that happens to trigger it.

## Before shipping a visual change

1. Is the new value a token in `tokens.css`, or a literal snuck into a consumer file? — only the
   former is allowed (CSS-2).
2. If it's a new or edited palette value, does it pass `check_contrast.py`?
3. Does `--focus-ring` still differ in hue from `--accent` in every palette?
4. If it's a duration, is it one of the existing three, or does it belong as a fourth (rare — ask
   whether the reduced-motion block still zeroes it for free)?
5. Does the file you're editing still own the thing you're styling, per the table above?
6. If it's a new button, does it reuse the existing recipe (Buttons, above) rather than inventing
   new chrome — and if this is a third copy becoming a fourth, is this the point to factor a shared
   class instead?
7. If it changes layout, does it stay inside the route's existing shape (board's grid, project's
   flex column) rather than introducing a new layout primitive?
