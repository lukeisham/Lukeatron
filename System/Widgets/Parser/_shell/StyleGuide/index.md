# Parser Shell — Style Guide

The design system behind the parser shell chassis (`_shell/src/`) — the chrome
every one of Luke's thirteen parser widgets inherits (Grammar, Rhetoric,
Logic, Style, Greek and Hebrew, …). This guide documents what already ships
in `shell.css` / `shell.html` / `ui.js` / `assemble.py`; it does not invent a
new design language.

## Source of truth

**`_shell/src/shell.css` and `_shell/src/shell.html` remain canonical.** They
are what `_shell/build/assemble.py` actually embeds into every shipped
`<Store>_parser.html`. Nothing in this guide is a build input — the
`css/` folder here is a **readable reference and starting point**, not a
second copy the assembler reads. If shell.css changes, this guide should be
updated to match (by hand — there is no automated sync), not the other way
round.

Per `ParserShell.spec.md` D-3: nothing in `_shell/src/` may reference a
cartridge by name, and no cartridge may edit `_shell/src/` for its own needs.
This guide respects the same boundary — it documents the **shared chassis**
plus the **one legitimate per-cartridge extension point** (`files.styles`,
see [05](05-building-a-cartridge.md)).

## Who this is for

- **Luke**, eyeballing whether a new cartridge's colours/patterns stay
  consistent with the eleven others.
- **A future build agent**, writing a new cartridge's `config.yaml` palette
  or an optional `files.styles` override, who needs the vocabulary and the
  actual selectors without reverse-engineering the minified shell.css.

## Contents

| # | File | Covers |
| :-- | :--- | :--- |
| 1 | [01-foundations.md](01-foundations.md) | Design tokens (colour, radius, font), typography scale, spacing, layout shell, the flat/offline design philosophy |
| 2 | [02-colour-model.md](02-colour-model.md) | The structural-kinship hue model (AD-7), the six-hue palette shape, how focus-level CSS is generated (AD-2), how to pick a new cartridge's palette, and confirmation that the MiniWiki module reuses the shell's tokens (no new palette) |
| 3 | [03-components.md](03-components.md) | Every reusable UI piece — header, buttons, input, banner, chips, icon bar, stage renderer, tooltip, context menu, spelling popover, explainer, footer — plus the MiniWiki module's own components: side menu, outline tree, breadcrumb, article/section pages, MLA references, and the key-search-terms "special box" |
| 4 | [04-states-and-interaction.md](04-states-and-interaction.md) | Hover/disabled/active states, print modes, responsiveness, accessibility — including the known gaps — plus MiniWiki's own states: tree expand/collapse, copy-button feedback, the pop-up-blocked warning, and its mobile reflow (no drawer) |
| 5 | [05-building-a-cartridge.md](05-building-a-cartridge.md) | Practical checklist: `colours.palette` in `config.yaml`, when (rarely) to use `files.styles`, what never to touch, and how to opt into the MiniWiki module (`miniwiki` block, the two build steps, default-off byte-identical assembly) |

## `css/` — reference stylesheets

| File | Purpose |
| :--- | :--- |
| [`css/tokens.css`](css/tokens.css) | Every design token from `shell.css`'s `:root`, expanded and commented, plus the six-hue reference palette as CSS custom properties |
| [`css/patterns.css`](css/patterns.css) | Readable, generalised versions of the reusable component rules (buttons, chips, tooltip, banner, table) — copy/adapt into a cartridge's `files.styles`, never a build input |
| [`css/preview.html`](css/preview.html) | Open directly in a browser (no server needed). Links the **real** `shell.css` so it never drifts, and renders every token and component live, including a worked structural-kinship colour example |

## What's out of scope

This guide covers the **shell chassis** only — the chrome shared by every
widget. It does not cover:

- A cartridge's own `ENGINE`/`EXPLAINER` logic or content schema.
- Content-file conventions (`<Aide>_content.md`) — see `Parser_guide.md`
  §5a in `System/Suggestions/`.
- The unrelated report-design system in `System/Widgets/setup/` — that CSS
  styles the one-off status *report* about the parsers, not the parser
  widgets themselves, and is bound for `Trash/` once setup work completes.
