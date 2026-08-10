# 3. Component Catalogue

Every reusable chrome piece in the shell, in the order it appears on the
page. Selectors are exactly what's in `_shell/src/shell.css` /
`shell.html` / `ui.js` today. Live renders of most of these:
[`css/preview.html`](css/preview.html).

## Header

```html
<header>
  <div class="brand">
    <span class="badge">P</span>
    <span id="hdrname">__ASSET_NAME__</span>
  </div>
  <div class="meta" id="hdrmeta">Tier A · offline</div>
</header>
```

- `.badge` — 30×30px rounded-square, `--ink` fill, white serif letter
  (Georgia). The glyph is a hardcoded `P` in `shell.html` for every
  cartridge — it is not templated, and no cartridge currently overrides it.
  A cartridge's `icon` data-URI in `config.yaml` sets the browser-tab
  favicon (`__ICON_HREF__`) only; it has no effect on this in-page badge.
- `header` is `display:flex; justify-content:space-between` — brand left,
  meta (tier + offline status) right.

## Buttons

```css
button { font-size:14px; padding:6px 14px; border:1px solid var(--line2);
  border-radius:var(--radius); background:#fff; color:var(--ink); }
button:hover { background:#f4f3ee; }
button.primary { background:var(--ink); color:#fff; border-color:var(--ink); }
button:disabled { opacity:.45; cursor:not-allowed; }
```

Three states, no more:

| Variant | When |
| :--- | :--- |
| Default | Secondary actions — "Display all", "Explain", export buttons |
| `.primary` | Exactly one per screen — "Parse" |
| `:disabled` | Tier B check — always disabled in the current offline-only build; has a `title` tooltip explaining why, not just a greyed-out button with no explanation |

**Focus-level toggle** is a distinct button family, not a new component:

```css
button.fv.on { border:2px solid var(--acc); color:var(--acc); padding:5px 13px; }
```

`.fv` buttons are generated one per `CONFIG.levels` entry (see
[02](02-colour-model.md)); exactly one carries `.on` at a time, and the
`padding` is intentionally 1px tighter than default to absorb the border
going from 1px to 2px without the button changing size.

## Input area

```css
#input { border:1px solid var(--line2); border-radius:var(--radius);
  padding:12px 14px; min-height:64px; font-size:15px; background:#fff; }
#input:focus { border-color:var(--acc); box-shadow:0 0 0 3px var(--accbg); }
```

`contenteditable`, not a `<textarea>` — supports the semi-plain formatting
(italics/bold/dot-points) the input contract calls for.

**Known gap:** `shell.html` sets `data-placeholder="Paste or type
__INPUT_UNIT__…"` on `#input`, but `shell.css` has no rule that consumes it
(no `:empty::before { content: attr(data-placeholder) }` or equivalent
exists anywhere in the sheet). As shipped, the placeholder attribute is
inert — the empty input area shows no placeholder text. If you're touching
`#input` CSS for any reason, that's the gap to close, not a pattern to
copy.

## Over-cap warning

```css
.warn { background:#FCEBEB; color:#791F1F; border:1px solid #F7C1C1;
  border-radius:var(--radius); padding:8px 12px; font-size:13px;
  display:none; margin:8px 0; }
```

Hidden by default (`display:none`); the harness toggles it visible when
word count exceeds `CONFIG.cap`. Per the input-contract convention
(`Parser_guide.md` §2), going over cap **warns, it never silently
truncates** — this banner is that warning's only UI.

## Toolbar (`.bar`)

`display:flex; gap:8px; align-items:center; flex-wrap:wrap` — used for both
the action-button row and the focus-level row (`#focusbar`). Anything you
add to a toolbar should be a `<button>`, a `<label class="muted">`, or a
`<span class="muted">` — those are the three element types the existing
bars mix.

## Colour key (`#key`) and chips (`.chip`)

```css
#key { font-size:12px; color:var(--ink2); background:#f4f3ee;
  border-radius:var(--radius); padding:6px 10px; margin:10px 0; }
.chip { border-radius:4px; padding:1px 7px; display:inline-block; margin:1px 2px; }
```

`.chip` is deliberately unstyled for colour — `ui.js` sets
`background`/`color` inline per-clause from the hue's `h50`/`h800` (see
[02](02-colour-model.md)). The class only provides shape (radius, padding,
inline-block spacing); never give `.chip` a fixed background in CSS, that
would break every hue that uses it.

## Icon bar (`#iconbar`) and tooltips (`.tt`)

```html
<span class="ic">
  <span style="color:...">●</span> finding label
  <span class="tt"><strong>How this was calculated</strong><br>explanation…</span>
</span>
```

```css
#iconbar .ic { cursor:help; border-bottom:1px dotted var(--line2); position:relative; }
.tt { visibility:hidden; position:absolute; bottom:135%; left:0;
  background:#fff; border:1px solid var(--line2); border-radius:var(--radius);
  padding:8px 11px; font-size:12px; width:280px; box-shadow:0 4px 14px rgba(0,0,0,.1); }
.ic:hover .tt { visibility:visible; }
```

Pure-CSS hover reveal, no JS needed once the markup exists — `.tt` sits
inside `.ic` and toggles via `:hover`. This is the only tooltip style that
doesn't need JS positioning; the other two overlays below (`#tip`, `#ctx`)
are JS-positioned because they follow the cursor/selection rather than a
fixed parent.

## Summary line (`#sline`)

One line, `13px`, `var(--ink3)` — the classification summary shown above
the parsed text (`R.summary.classifications` joined with `" · "`). No
special markup; plain text content only.

## The stage — where structural-kinship colour lives

```css
#stage { font-size:17.5px; line-height:2.4; }
#stage .cl { border-radius:4px; padding:2px 3px; transition:background .25s,color .25s; }
#stage .ph { border-radius:4px; padding:1px 2px; transition:background .25s,color .25s; }
#stage .w  { transition:all .2s; }
#stage .pos { display:none; }
#stage .lbl { display:none; font-size:11px; font-weight:600; border-radius:4px; padding:0 5px; }
#stage .noclause { color:var(--ink2); }
```

- `.cl` / `.ph` / `.w` are the three render-kinds from
  [02-colour-model.md](02-colour-model.md) — their colours come entirely
  from the generated `.v-<level>` rules plus inline `--h50`/`--h100`/`--h600`/
  `--h800`/`--hf` custom properties `ui.js` sets per clause span.
- `.lbl` (clause label) and `.pos` (word-class label) are `display:none`
  by default and only revealed by the generated focus CSS at the level
  where they're relevant.
- `.noclause` — tokens outside any clause (punctuation, connective glue
  text) render in `--ink2`, not the structural palette.
- `.tentC` / `.tentP` / `.tentW` — the dashed "tentative" confidence
  underline, one per render-kind, added by the generated CSS (see
  [02](02-colour-model.md)).
- All three transition `background`/`color` on toggle — focus-level
  switches animate rather than snap.

## Hover pop-up (`#tip`)

```css
#tip { position:absolute; display:none; background:#fff; border:1px solid var(--line2);
  border-radius:var(--radius); padding:8px 11px; font-size:12.5px; max-width:300px;
  box-shadow:0 4px 14px rgba(0,0,0,.09); z-index:50; pointer-events:none; }
#tip b { display:block; font-size:11px; color:var(--ink3); text-transform:uppercase;
  letter-spacing:.4px; margin-bottom:2px; }
```

JS-positioned near the hovered word (`ui.js` sets `left`/`top` inline,
toggles `display`). `pointer-events:none` so it never intercepts the mouse
event that's tracking the word underneath it. `<b>` inside it is a small
uppercase eyebrow label, not literal bold text.

## Right-click context menu (`#ctx`)

```css
#ctx { position:absolute; display:none; background:#fff; border:1px solid var(--line2);
  border-radius:var(--radius); padding:6px 0; font-size:13px;
  box-shadow:0 4px 14px rgba(0,0,0,.12); z-index:60; min-width:200px; }
#ctx div { padding:5px 14px; }
#ctx div.h { font-weight:600; border-bottom:1px solid var(--line); margin-bottom:4px; }
```

Replaces the browser's native context menu inside `#stage` (deliberate, per
`Parser_guide.md` §3 Layer 3 — declared behaviour, not an accident). `div.h`
is the menu's header row (the word + its short POS); plain `div`s below it
are the menu items.

## Spelling suggestion popover (`#spelling-suggestions`)

```css
#spelling-suggestions { position:absolute; display:none; background:#fff;
  border:1px solid var(--line2); border-radius:var(--radius); padding:6px;
  font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,.12); z-index:60; max-width:260px; }
#spelling-suggestions [role="option"] { border-radius:4px; padding:2px 9px;
  cursor:pointer; display:inline-block; margin:2px; background:#f4f3ee; color:var(--ink2); }
#spelling-suggestions [role="option"]:first-child { background:var(--accbg); color:var(--acc); font-weight:600; }
#spelling-suggestions [role="option"][aria-selected="true"] { outline:2px solid var(--acc); outline-offset:-2px; }
#spelling-suggestions [role="option"][data-action] { border:1px solid var(--line); background:#fff; }
```

**This `id` is load-bearing, not a free choice** — the Spelling module
(`_modules/Spelling/src/ui.js`) looks up `#spelling-suggestions` by exact id
and reuses it if present, rather than creating its own unstyled div. Don't
rename it in a cartridge override. First suggestion is visually promoted
(accent background) as the presumed best match; keyboard-selected option
gets an accent outline; action items (ignore/learn, not a text
replacement) get a plain bordered variant to distinguish them from actual
word suggestions.

## Explainer panel

```css
#explainer { display:none; border-top:1px solid var(--line); margin-top:18px; padding-top:16px; }
#explainer h3 { font-size:15px; margin:0 0 10px; }
.xt { width:100%; border-collapse:collapse; margin-bottom:10px; }
.xt th, .xt td { border:1px solid var(--line); padding:4px 7px; font-size:12.5px; text-align:center; }
.xt th { background:#f4f3ee; color:var(--ink2); font-weight:600; text-align:left; white-space:nowrap; }
#rules .cat { font-size:12px; font-weight:600; color:var(--ink2); margin:10px 0 2px;
  text-transform:uppercase; letter-spacing:.4px; }
#rules ul { margin:0; padding-left:20px; font-size:13.5px; }
#rules .ex { color:var(--ink2); font-style:italic; }
```

Hidden until "Explain" is clicked. `.xt` is the generic explainer-table
class every cartridge's `EXPLAINER.toMarkdown`/`toText`/table rendering
should target — cell text is centred by default, header cells left-aligned
and no-wrap. `#rules .cat` is a section label (e.g. "SYNTAX", "STYLE") above
a plain rule list; `.ex` marks an inline worked example inside a rule
`<li>`, always italic + muted.

## Footer

`display:flex; gap:8px; border-top:1px solid var(--line); margin-top:18px;
padding-top:12px; font-size:12px; color:var(--ink3)`. Holds the export
buttons on the left and the version/build/attribution string
(`__ASSET_NAME__ v__ASSET_VERSION__ · built __BUILD_DATE__ …` plus lexicon
and spelling attribution spans) pushed right via `margin-left:auto` on that
span.

## Spelling underline

```css
::highlight(spelling-misspelled) { text-decoration:underline wavy var(--red) 2px;
  text-underline-offset:3px; }
.spelling-mark { border-bottom:2px wavy var(--red); }
```

Primary path is the CSS Custom Highlight API (`::highlight`, set via
`CSS.highlights` in JS) — no DOM mutation. `.spelling-mark` is the
non-mutating absolute-position overlay fallback for browsers without the
Highlight API — but see the known-gap note in
[01-foundations.md](01-foundations.md): its invalid `wavy` border-style
value currently invalidates the whole `border-bottom` declaration, so this
fallback renders **no visible underline at all**, confirmed live in
[`css/preview.html`](css/preview.html).
