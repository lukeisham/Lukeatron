# LukeatronWiki — Style Guide

The visual contract for `static/app.css`, the chrome stylesheet. `!HouseStyle` classifies this
surface as **SUBORDINATE** (`reference/sources.md` row 9d): `Templates/wiki-page.css` — the same
stylesheet `!GenerateWiki` knowledge pages use — supplies the shared token layer and the
provenance-ink system; `app.css` is the chassis that draws the shell (topbar, rail, margin, slot
states, capture form) on top of it. Read this before touching any colour, spacing, or duration
value in `app.css`.

## The one rule

Two layers, never merged into one file. `Templates/wiki-page.css` loads first and defines the
shared tokens (`--paper`, `--ink-*`, `--rule*`, `--focus`, the provenance-ink set). `app.css`
never redefines a token `wiki-page.css` already sets — it cites it (`var(--paper)`,
`var(--ink-gen)`, …) — and adds its own UI-only chrome tokens (`--ui-*`) for what the chrome
needs and the shared layer doesn't carry (rail background, section wash, hover states, …), each
declared once in `app.css`'s own `:root` block.

**Known exception:** `a.redlink` (lines 648–656) writes two literal colours (`#B85450`,
`#D66B6F`) instead of tokens — the one spot in this file that breaks the rule as it stands. Not
fixed here; flagged so a future change doesn't compound it into a new pattern.

## Palettes

Shared tokens, from `Templates/wiki-page.css` (`app.css` reads these, never redefines them):

| Token | light (default) | dark |
|---|---|---|
| `--paper` | `#F7F6F1` | `#15171B` |
| `--paper-sunk` | `#EFEEE7` | `#1C1F25` |
| `--rule` | `#D8D6CB` | `#2E333B` |
| `--rule-faint` | `#E5E3DA` | `#23272E` |
| `--ink-verbatim` | `#16130D` | `#F3EFE4` |
| `--ink-gen` | `#3F4753` | `#A9B2BF` |
| `--ink-seam` | `#4A6B5E` | `#7FB6A1` |
| `--ink-quiet` | `#7C8189` | `#79818D` |
| `--focus` | `#A8843C` | `#C6A768` |
| `--edge-luke` / `--wash-luke` | `#A8843C` / `rgba(168,132,60,.10)` | `#C6A768` / `rgba(198,167,104,.11)` |
| `--edge-source` / `--wash-source` | `#7E4F63` / `rgba(126,79,99,.055)` | `#C08FA3` / `rgba(192,143,163,.07)` |
| `--edge-gen` | `#98A0AC` | `#5A6472` |

`app.css` never writes rules against the provenance set (`--edge-luke`/`--wash-luke`/
`--edge-source`/`--wash-source`/`--edge-gen`) directly — swatches reuse `wiki-page.css`'s own
`.key-swatch` classes unmodified. That boundary is enforced by convention, not by a lint check.

`app.css`'s own UI-chrome tokens:

| Token | light (default) | dark |
|---|---|---|
| `--ui-bg-rail` | `#EFEEE7` | `#1C1F25` |
| `--ui-bg-section` | `rgba(212,209,196,.35)` | `rgba(46,51,59,.6)` |
| `--ui-border-divider` | `#D8D6CB` | `#2E333B` |
| `--ui-text-label` | `#7C8189` | `#79818D` |
| `--ui-hover-bg` | `rgba(212,209,196,.5)` | `rgba(46,51,59,.8)` |
| `--ui-focus-ring` | `#A8843C` | `#C6A768` |
| `--ui-empty-button` | `#D8D6CB` | `#3E4450` |
| `--ui-state-glyph` | `#3F4753` | `#A9B2BF` |
| `--ui-draft-border` | `#9B9C9A` | `#6B6F73` |

**Known gap:** `--ui-focus-ring` duplicates `--focus` exactly in both modes and is never actually
consumed anywhere in `app.css` — every real `:focus-visible` rule reads `var(--focus)` directly.
Dead token; harmless as-is, but don't build on it assuming it does something `--focus` doesn't.

**Dark is reachable two ways** — automatically under `prefers-color-scheme: dark` while no theme
is chosen, or explicitly via `[data-theme="dark"]` — mirrored in both `wiki-page.css` and
`app.css`. Both files carry the block twice (media query + explicit attribute) with identical
values by construction; there is no automated check here (unlike ProjectKanban's
`check_contrast.py`) — a visual check in both modes is what currently catches the two blocks
drifting apart. No `paper`/third palette and no dedicated print token set exist for this app —
print (`@media print` at the bottom of `app.css`) only hides chrome and forces a white
background; it does not redefine ink colours.

## Type

`"IBM Plex Sans", system-ui, sans-serif` for chrome labels (topbar, rail, margin, slot headers,
capture-form title); a bare `system-ui, sans-serif` for inputs, buttons and body-adjacent text.
Sizes in use range `0.7rem`–`1.2rem` as literal `rem` values scattered through the rules below —
**there is no fixed size-scale token set** in `app.css` (unlike ProjectKanban's three
`--font-size-*` tokens). Document new sizes here if you add one; don't invent a token scale that
doesn't exist yet without deciding to build it.

## Spacing, radii, motion

Spacing is literal `rem` values per rule (no spacing-scale tokens). Border radii in use: `2px`,
`3px`. Two motion durations are defined, both local to this file (not shared with
`wiki-page.css`):

```
--motion-quick:  0.15s ease-in-out
--motion-smooth: 0.3s ease-in-out
```

Every `transition`/`animation` in the file should read one of these two — the blanket
`@media (prefers-reduced-motion: reduce)` rule at the bottom zeroes `transition`/`animation`
globally (`* { transition: none !important; animation: none !important; }`), so any new motion
added here is covered automatically as long as it's a real `transition`/`animation` property, not
a hand-rolled JS animation.

Single stylesheet — no layout-scope-by-file table; `app.css` is the whole of this app's chrome.

## Before shipping a visual change

1. Does the value already exist as a token in `wiki-page.css` or `app.css`'s own `--ui-*` block?
   Cite it — don't redefine or duplicate (see `--ui-focus-ring`'s dead-token gap above for what
   that looks like when it happens).
2. If it's a genuinely new UI-only token, add it once to `app.css`'s bare `:root` block, then
   mirror the same value into both the `prefers-color-scheme: dark` block and the
   `[data-theme="dark"]` block — check both, there is no script that catches a drift here.
3. Never write a rule against `--edge-*`/`--wash-*` or redefine a `.key-swatch` class — those stay
   `wiki-page.css`'s / `!GenerateWiki`'s (EXEMPT surface, `reference/sources.md` row 8).
4. New motion: does it read `--motion-quick` or `--motion-smooth`? A third duration is rare — if
   one is genuinely needed, add it here rather than inlining a literal.
5. Don't add a `.redlink`-style literal colour without a reason better than convenience — the
   existing one is a known exception, not a precedent.
