# Storytelling — Style Guide

This app is a deliberate, scoped exception to `!HouseStyle`'s default token **palette** — colours
are sampled from the source poster (*The Periodic Table of Storytelling*, ComputerSherpa/TV
Tropes) rather than drawn from the house palette, because the whole point is that the app looks
like the poster came alive. Registered 2026-09-29 in `!HouseStyle`'s surface register
(`.Claude/skills/!HouseStyle/reference/sources.md`, row 14) as **EXEMPT (palette only)**.
Everything *other* than the palette — spacing scale, elevation levels, the counted motion/glyph
budget, the reduced-motion floor — still follows the house default in full.

## The one rule

Every colour, spacing step, radius, motion duration and easing curve lives in one file,
[`app/css/variables.css`](app/css/variables.css), as a CSS custom property. Every other stylesheet
in `app/css/` reads a `var(--…)`, never a literal. `verify/check_contrast.py` (run via
`tests/test_check_contrast.py`) parses this file directly and asserts every text/background pairing
clears WCAG contrast and every pair of touching group colours differs by ≥10 L* in grayscale — the
enforcement mechanism for this rule.

## Palette

**Ground and ink**

| Token | Value | Use |
|---|---|---|
| `--color-ground` | `#d3e1d2` | Page background — the poster's soft sage green |
| `--color-ink` | `#1a1a1c` | Primary text — darkened from the source for 4.5:1 contrast on every group colour |
| `--color-ink-soft` | `#505050` | Secondary text (popularity numbers) — ≥3:1 contrast |
| `--color-edge` | `#404040` | UI outlines — ≥3:1 contrast |

**Group colours** (each tile's fill, by category)

| Token | Value | Group |
|---|---|---|
| `--g-structure` | `#bdbec0` | Structure |
| `--g-setting` | `#e4d1ba` | Setting / laws |
| `--g-storymod` | `#f0e7d9` | Story modifiers |
| `--g-plotdev` | `#e7e8e9` | Plot devices |
| `--g-genre` | `#d9cfe8` | Genre — added block, new lavender (the poster has no purple) |
| `--g-heroes` | `#c6e9f2` | Heroes |
| `--g-charmod` | `#cae4b7` | Character modifiers |
| `--g-archetypes` | `#83c76f` | Archetypes |
| `--g-villains` | `#fabba3` | Villains (main tiles) |
| `--g-villains2` | `#fcd7c8` | Villains — four paler tiles |
| `--g-metatropes` | `#faf8c1` | Metatropes |
| `--g-production` | `#fdbf68` | Production |
| `--g-fandom` | `#f6adcd` | Fandom & audience reactions |
| `--g-highlight` / `--color-highlight` | `#fff200` | The poster's own highlight yellow (Cal, 5ma, 4wl) — its cross-file behavioural meaning (drop-target/save cue vs. the selection cue) is README D-8/D-21 |
| `--g-rogue` | `#ffffff` | The Rogue card — plain white, dotted outline |

**Grayscale print tokens** — one per group, each ≥10 L* apart from every touching neighbour
(enforced by `check_contrast.py`), so the printed table never collapses two adjacent groups into
one gray: `--gray-fandom` `#d8d8d8` · `--gray-production` `#b0b0b0` · `--gray-metatropes` `#f0f0f0`
· `--gray-charmod` `#d0d0d0` · `--gray-villains` `#a0a0a0` · `--gray-villains2` `#c8c8c8` ·
`--gray-archetypes` `#989898` · `--gray-heroes` `#e8e8e8` · `--gray-genre` `#c8c8c8` ·
`--gray-plotdev` `#f0f0f0` · `--gray-storymod` `#d0d0d0` · `--gray-setting` `#b0b0b0` ·
`--gray-structure` `#888888` · `--gray-highlight` `#f8f8f8` · `--gray-rogue` `#ffffff`.

Text on every group colour must stay readable — if a source colour ever fails contrast, darken the
text, not the tile.

## Type

Two families only, both system fonts (no web fonts — the app is fully offline):

- `--font-title`: `Georgia, serif` — the title/heading treatment, echoing the poster's heavy serif
- `--font-ui`: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — everything else

Never add a third stack. Symbols on tiles are large and bold; names are small and plain.

## Spacing, radii, motion

- **Spacing** (4px grid): `--space-xs` 4px · `--space-sm` 8px · `--space-md` 16px · `--space-lg` 24px · `--space-xl` 32px. No fifth step.
- **Radii**: `--radius-none` 0 · `--radius-sm` 2px · `--radius-md` 4px · `--radius-lg` 8px.
- **Motion** — three durations, three easings, the house ceiling: `--m-fast` 90ms · `--m-base` 180ms · `--m-slow` 320ms; `--ease-out` / `--ease-in` / `--ease-mid` (cubic-bezier). Reduced-motion behaviour and the counted concurrent-animation budget are cross-file — README D-19/D-20.
- **Elevation** — three levels only, via `--shadow-raised` and `--shadow-floating`: table ground (none), raised card/panel (`--shadow-raised`), dragged card (`--shadow-floating`).

For which CSS file owns which visual concern, and the app's cross-file UI behaviour (motion
budget, reduced motion, what the highlight yellow means, the selection cue) — see README's Key
decisions and its CSS ownership table. This file stops at values; anything about what happens
across files lives there.

## Before shipping a visual change

- Every new value is a `var(--…)` from `variables.css` — no literal colour, size, radius or duration anywhere else in `app/css/`.
- Run `python3 -m unittest tests.test_check_contrast` — every text/background pairing and every touching grayscale pair must still pass.
- Check the change against README's D-8, D-19, D-20 and D-21 — the selection cue, reduced motion, the motion budget, and the highlight yellow's meaning are all decided there, not here.
- If a new colour is genuinely needed, it must be sampled from the source poster image, not invented — this app's whole palette exception rests on replicating that image faithfully.
