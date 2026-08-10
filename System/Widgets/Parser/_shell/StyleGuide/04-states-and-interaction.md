# 4. States, Interaction, Print, and Gaps

## Interactive states

| Element | States | Mechanism |
| :--- | :--- | :--- |
| `button` | default → `:hover` (bg `#f4f3ee`) → `:disabled` (opacity `.45`, `cursor:not-allowed`) | pure CSS |
| `button.fv` (focus-level toggle) | one carries `.on` at a time (accent border+text) | JS toggles `.on`, CSS styles it |
| `#input` | default → `:focus` (accent border + `0 0 0 3px var(--accbg)` glow ring) | pure CSS |
| `.ic` (icon-bar item) | reveals its `.tt` tooltip on `:hover` | pure CSS |
| `[role="option"]` (spelling suggestions) | default → first-child promoted (accent bg) → `[aria-selected="true"]` (accent outline, keyboard nav) → `[data-action]` (bordered, distinguishes ignore/learn from a text replacement) | CSS attribute selectors, JS sets `aria-selected` |
| `#tip`, `#ctx`, `#spelling-suggestions` | hidden (`display:none`) → shown + positioned | JS toggles `display` and sets inline `left`/`top` |
| `#stage .cl/.ph/.w` | fade in/out across focus-level switches | CSS `transition`, JS toggles the `#stage` element's `v-<level>` class |
| `#spellTog` checkbox | on/off, only visible when the cartridge's `spelling.enabled: true` | `#spellLabel` starts `display:none` in the shell skeleton, shown when the spelling module confirms it's wired in |

Nothing in the sheet uses `:active` or `:focus-visible` distinctly from
`:focus`/`:hover` — keyboard-focus styling piggybacks on the same rules as
mouse-hover/focus throughout.

## Print

Two body-level print modes, chosen by which class is present on `<body>`
at print time (set via JS before calling `window.print()`):

```css
@media print {
  body { background:#fff; }
  body.print-bare .no-print, body.print-bare header, body.print-bare footer { display:none!important; }
  body.print-chrome .no-print { display:none!important; }
  #explainer { display:block!important; border:none; }
  .card { border:none; padding:0; }
}
```

| Mode | What survives |
| :--- | :--- |
| `.print-bare` | Only the explainer content — no header, no footer, no input/toolbar chrome. "Print the explainer without the app header/footer" (the "PDF (bare)" export button). |
| `.print-chrome` | Everything except elements explicitly marked `.no-print` (buttons, the input area's editing affordances) — keeps header/footer/branding. |

`#explainer` is forced `display:block!important` in *both* modes — export
always shows the explainer even if it was never opened on screen. `.card`
loses its border and padding in print (the printed page's own margins do
that job instead).

**Anything you add that should never print** (a new button, a debug
overlay, etc.) needs the `.no-print` class explicitly — it's opt-in, not
inferred from element type.

## Responsiveness — a known gap, not a hidden feature

There is exactly one width constraint in the whole sheet:
`.wrap { max-width:880px; }`. There is **no `@media (max-width: …)` query
anywhere in `shell.css`** — no mobile toolbar reflow, no stacked layout, no
font-size reduction for narrow viewports. Below ~500–600px the toolbar
(`.bar`, `flex-wrap:wrap`) will wrap onto multiple lines reasonably
gracefully because of the `flex-wrap`, but nothing else adapts. Treat the
shell as **desktop/tablet-first by default** unless a specific cartridge's
`files.styles` adds narrow-viewport rules — that would be a genuine
override, not duplication, since nothing in the base sheet does this job
today.

## Accessibility — also a known gap

- The only ARIA usage anywhere in the shell is `role="option"` /
  `aria-selected` on the spelling-suggestion popover (see
  [03-components.md](03-components.md)).
- Buttons, the focus-level toggles, the colour key, and the stage's
  clause/phrase/word spans carry no `aria-*` attributes, no `role`, and no
  `aria-live` region for dynamically-updated content (`#sline`, `#stage`,
  `.warn`).
- The custom right-click context menu (`#ctx`) and hover tooltips (`#tip`,
  `.tt`) are mouse-only — there's no keyboard-triggered equivalent path to
  the same information.
- Colour is not purely decorative here — it's load-bearing (the structural-
  kinship model *is* the primary way clause/phrase/word relationships are
  communicated), which makes the lack of any non-colour redundant signal
  (beyond the tentative dashed underline) worth knowing about, not just a
  cosmetic nice-to-have.

None of this is prescriptive — it's a factual inventory so a future pass
(cartridge-level or shell-level) knows what's actually there versus assumed.
