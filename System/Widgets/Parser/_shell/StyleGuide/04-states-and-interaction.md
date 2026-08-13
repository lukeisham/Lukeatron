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
| `footer a` (attribution links, see [03](03-components.md#footer)) | default (`--ink3`, dotted underline) → `:hover`/`:focus-visible` (`--acc`, solid underline + outline ring) | pure CSS |

Nothing else in the sheet uses `:active` or `:focus-visible` distinctly
from `:focus`/`:hover` — keyboard-focus styling piggybacks on the same
rules as mouse-hover/focus everywhere but the footer's attribution links.

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

## MiniWiki states and interaction

MiniWiki (see [03-components.md](03-components.md#miniwiki-opens-in-a-new-browser-tab-not-this-pages-chrome))
runs in its own document, so its states are independent of everything
above — nothing here shares a stacking context, print mode, or `<body>`
class with the parser page.

| Element | States | Mechanism |
| :--- | :--- | :--- |
| `.mw-tree-toggle` | collapsed (▶) → expanded (▼), per node, independently | JS re-renders that node's `<ul>` in place on click; `aria-label` flips between "Expand `<title>`"/"Collapse `<title>`" |
| `.mw-menu-link` / `.mw-tree-link` | default → `:hover` (`var(--accbg)` bg, `var(--acc)` text) → `.mw-active` (bold, same accent tint) | CSS `:hover`; `.mw-active` is applied by `src/nav-active.js`'s `setActiveNavLink()` on every navigation, matched via each link's `data-nav-id` attribute — only lights up a link that's actually rendered (a still-collapsed tree branch has none to mark) |
| `.mw-search-box` | idle → typing (live-filtered results below) → cleared (menu restored) | `input` event → `search-ui.js`'s `applySearchQuery()`; hides `.mw-menu-body` while `.mw-search-results` is populated, shows a single "No matches." row for a query with no hits |
| `.wikilink` / `.mw-see-also-link` (hover-preview targets) | default → `:hover`/`:focus` (after ~150ms, or immediately on focus) → `.mw-preview-popover` shown → `mouseout`/`blur` hides it | `popover.js`'s delegated `mouseover`/`mouseout`/`focusin`/`focusout` handlers on the article pane; position flips from above to below the link when there's no room above |
| `.mw-term-chip` / `.mw-copy-all` (copy affordances) | idle (label = the term text, or "Copy all") → clicked → **"Copied!"** for 1200ms → reverts to idle label; or clicked → **"Copy failed"** for 1200ms → reverts, if the clipboard write is denied | `clipboard.js`'s `copyToClipboard` (Clipboard API, `document.execCommand` fallback) resolves a boolean; `ui.js`'s `flashCopied` sets `textContent` to one of the two literal strings above on a `setTimeout` — there is no third state (e.g. no in-flight/"Copying…" state) |
| `#btnMiniWiki` (parser page, launch button) | plain shell `button` — default/`:hover`/`:disabled` per [03-components.md](03-components.md#buttons) — `display:none` until the cartridge's `miniwiki.enabled` build produces a working seam | pure CSS + one JS check (`MiniWikiSeam.isAvailable()`) at page load |
| `#miniwikiwarn` (popup-blocked warning, parser page) | hidden → shown | `.warn` banner, same component as the over-cap warning (parser page's own `shell.css`, not MiniWiki's own CSS) — shown when `MiniWikiSeam.open()` returns `false` (Blob path *and* the `document.write` fallback both failed, almost always because the browser blocked the pop-up), so a blocked launch is reported inline rather than failing silently |
| `.mw-side-menu` (mobile drawer) | wide layout (in-flow column) → narrow layout (`max-width:719px`): off-canvas, closed (`translateX(-100%)`) → `.mw-drawer-open` (`translateX(0)`, `.mw-nav-scrim` shows) → closed again | `drawer.js`'s `createDrawerController()`: `.mw-nav-toggle` click toggles; scrim click, Escape (while open), or selecting an article (`navigate()`'s `closeOnNavigate()`) all close it |

Compare [01-foundations.md](01-foundations.md)'s "known gaps" habit
(`#input`'s inert placeholder, the invalid `wavy` border fallback) — that
pattern still holds elsewhere in this file, but the three MiniWiki rows it
used to flag here (`.mw-active` no-op, no hover-preview, no mobile drawer)
were closed in the 2026-08-10 audit-gap pass and are now working features,
verified by reading `src/nav-active.js`, `src/popover.js`, and
`src/drawer.js` directly, not carried forward as a stale gap list.
