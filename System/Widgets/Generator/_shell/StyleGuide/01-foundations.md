# 1. Foundations

Tokens, type, spacing, and the overall design philosophy, as they actually
exist in `_shell/src/shell.css` today (not an aspirational rewrite).

## Design philosophy

- **Flat, warm, print-friendly.** No shadows anywhere except the three
  floating overlays (tooltip, context menu, spelling popover) — those get a
  soft `box-shadow` because they need to read as "above" the page. Cards,
  buttons, and inline elements are flat: a 1px border does the separation
  work, not elevation.
- **One accent colour.** `--acc` (blue) is the only "interactive/selected"
  colour in the chrome — used for the input focus ring, the active
  focus-level toggle, and selected suggestion states. Structural colour
  (the clause/phrase/word hues) is a separate system — see
  [02-colour-model.md](02-colour-model.md) — and never competes with `--acc`
  for the same meaning.
- **Offline, single-file, no dependencies.** Every widget is one `.html`
  file with CSS inlined at build time (`__SHELL_CSS__` in `shell.html`). No
  CDN fonts, no external stylesheets — the system font stack only.
- **Print is a first-class output**, not an afterthought — see the
  `@media print` block and [04](04-states-and-interaction.md).

## Colour tokens (`:root`)

| Token | Value | Used for |
| :--- | :--- | :--- |
| `--bg` | `#faf9f5` | Page background — warm off-white, not pure white |
| `--card` | `#fff` | The single content card sitting on `--bg` |
| `--ink` | `#1a1a17` | Primary text, header badge fill, primary-button fill |
| `--ink2` | `#5f5e5a` | Secondary text — meta labels, table headers, muted-but-legible copy |
| `--ink3` | `#9a9891` | Tertiary/faint text — placeholders, footer, word counts |
| `--line` | `#e3e1d9` | Default 1px borders and dividers |
| `--line2` | `#c9c7bd` | Slightly stronger borders — inputs, buttons, popovers |
| `--acc` | `#185FA5` | The one accent colour — focus ring, active states, selected chip. (Not a coincidence: this is the same value as the "blue" hue's `h600` in Grammar's palette — see [02](02-colour-model.md).) |
| `--accbg` | `#E6F1FB` | Accent tint — focus-ring glow, selected-suggestion background |
| `--red` | `#E24B4A` | The one semantic colour — spelling-error underline only |
| `--radius` | `8px` | Default corner radius for buttons, inputs, popovers |

`--red`'s only job is spell-check. Don't reuse it for anything else (parse
errors, warnings, etc.) — those have their own hardcoded warning colours
today (see "Known gaps" below).

## Typography

System font stack only, no webfonts:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

Root `font-size: 16px`; everything else is sized in `px` relative to that
(no `rem` in the current sheet). Observed type scale, largest to smallest:

| Size | Where |
| :--- | :--- |
| 17.5px | `#stage` — the parsed text itself; line-height 2.4 to leave room for inline labels/underlines |
| 17px | `header .brand` (the widget name) |
| 15px | `#input` (the raw text-entry area) |
| 14px | `button` |
| 13.5px | `#rules ul` (explainer rule lists) |
| 13px | `#sline` (the one-line summary under the toolbar), `#ctx`, `#spelling-suggestions` |
| 12.5px | `#iconbar`, `.xt th/td` (explainer tables) |
| 12px | `.muted`, `#key`, `footer`, `.tt` (tooltips) |
| 11px | `#stage .lbl`, `#stage .pos` |

Body `line-height: 1.55`; `#stage` overrides to `2.4` for the same reason —
inline word-level chrome (POS labels, tentative underlines) needs vertical
room the prose line-height doesn't give it.

## Spacing

No formal spacing scale — values are chosen per-component, but they cluster
around a small set of increments. When adding new chrome, reuse one of
these rather than inventing a new number:

**Common values:** `2px 3px 4px 6px 7px 8px 10px 12px 14px 16px 18px 20px 24px 40px`

| Context | Padding/gap |
| :--- | :--- |
| Page margin | `.wrap` — `24px 20px 40px` |
| Card interior | `.card` — `20px` |
| Button | `6px 14px` |
| Input area | `12px 14px` |
| Warning banner | `8px 12px` |
| Colour key / tooltip | `6px 10px` to `8px 11px` |
| Chip | `1px 7px` |
| Toolbar row gap (`.bar`) | `8px` |

## Radius

- `--radius: 8px` — buttons, inputs, `#key`, tooltip, context menu, spelling
  popover, explainer table cells' container.
- `12px` — the outer `.card` only (slightly more generous than the interior
  chrome, matches its role as the outermost frame).
- `4px` — small inline pieces: `.chip`, focus-level colour rules (`.cl`,
  `.lbl`, `.ph`).
- `999px` (fully round) is **not** currently used anywhere in shell.css —
  if you want a pill shape, that's a deliberate departure, not a shared
  convention.

## Layout shell

```
body
└── .wrap            max-width: 880px, centred, page padding
    └── .card        the one visual container — border + radius, no shadow
        ├── header   brand (badge + name) ←→ meta, space-between
        ├── #input + toolbar + focus bar + colour key + icon bar + #stage
        ├── #explainer   (hidden until "Explain" is clicked)
        └── footer
```

Everything lives inside one `.card`; there is no multi-column or sidebar
layout anywhere in the chassis. `max-width: 880px` is the only layout
breakpoint-like value in the sheet — there is no `@media` width query for
narrow screens today (see [04](04-states-and-interaction.md) for what that
means in practice).

## Known gaps

Documented as-is, not prescriptive — a future editor should know these
before assuming every colour is tokenized:

- The warning banner (`.warn`) uses hardcoded colours (`#FCEBEB` /
  `#791F1F` / `#F7C1C1`) rather than CSS custom properties.
- `#f4f3ee` (a slightly darker card-tint) appears three times
  (`button:hover`, `#key`, `.xt th`) without its own token.
- `.spelling-mark`'s fallback border uses `2px wavy` — `wavy` is not a valid
  `border-style` value in the CSS spec (it's valid for
  `text-decoration-style`, which is what the primary `::highlight` rule
  correctly uses two lines above it). This isn't a cosmetic downgrade —
  confirmed live in `css/preview.html`, an invalid value inside the
  `border-bottom` shorthand invalidates the whole declaration, so browsers
  that reach this fallback path render **no border at all**
  (`border-bottom-style` computes to `none`), not a solid line. Any
  browser without the Highlight API currently shows no spelling-error
  indicator whatsoever via this fallback.
