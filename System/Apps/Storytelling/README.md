# Storytelling

An offline, in-browser reference app showing the elements of story on one large interactive
diagram — Luke's revised edition of TV Tropes's "Periodic Table of Storytelling," re-arranged to
follow the shape of the chemistry periodic table and extended with 36 new elements — and lets Luke
build his own story outlines from them as a **story map**: elements joined by ribbons, straight or
branching. Ships with a library of twelve ready-made story maps (one per narrative type) to learn
from and start from, print/copy for both the table and a story, and a hidden lever set an AI agent
can drive when Luke asks. See [app-decisions.md](app-decisions.md) for approvals and granted rule
exceptions; see [StyleGuide.md](StyleGuide.md) before touching any colour, space, radius, duration
or type value.

## How to run it

**Double-click launcher** (opens a browser tab):
```
Double-click: System/Apps/Storytelling/Start Storytelling.command
```

**By hand**:
```
cd System/Apps/Storytelling
python3 server.py
```
Binds `127.0.0.1:8793` only — nothing is exposed beyond the machine.

**The shareable copy** — one self-contained file for family and friends, no Python, no install:
```
System/Apps/Storytelling/dist/Storytelling.html
```
Built from the same source by `share/build_share.py` (a granted JS-7 exception — see
app-decisions.md → Rule exceptions). A saved story lives only in the browser that made it; the
shared copy opened elsewhere starts empty.

**To stop:** close the browser tab, or Ctrl-C the terminal running `server.py`.

## Navigation map

```
Storytelling/
├── Start Storytelling.command   double-click launcher: starts server.py, opens the browser
├── server.py                    static server, 127.0.0.1 only, no writes
├── reference/                   the source PNG — provenance, and the verification baseline
├── app/
│   ├── index.html               one page, semantic landmarks
│   ├── main.js                  wires modules together; the only file that imports several
│   ├── data/                    elements.js, furniture.js, layout.js, library.js, version.js — the only place content lives
│   ├── diagram/                 diagram-svg.js · viewport.js · selection.js
│   ├── detail/                  detail-panel.js · about-panel.js
│   ├── lists/                   list-text.js · list-panel.js
│   ├── agent/                   agent-api.js
│   ├── story/                   story-model.js · story-layout.js · story-canvas.js · drag-drop.js · story-store.js · story-text.js · library-panel.js · story-highlight.js
│   ├── shared/                  output.js (print + copy) · events.js (event names)
│   └── css/                     variables.css · layout.css · tiles.css · story-map.css · library.css · panels.css · motion.css · print.css
├── share/                       build_share.py · SMOKE.md · smoke-results.md — builds dist/Storytelling.html
├── dist/                        Storytelling-<version>.html, Storytelling.html (generated; not edited by hand)
├── verify/                      verify.html/.js (overlay + colour + checklist) · check_contrast.py · results.md
└── tests/                       *.test.js (node:test, fake page) · test_server.py, test_build_share.py, test_check_contrast.py (unittest)
```

Why split this way: `data/` is separate so content edits never touch code; `diagram/` owns
everything drawn on the poster and `story/` everything Luke builds, so a story change never
touches the table.

## Cross-boundary behaviour

Modules talk through three things only: data shapes, DOM contracts, and events on `document`. No
module imports another module's internals, and none reaches into another's DOM.

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `data/elements.js`, `data/furniture.js` | `diagram-svg.js`, `story-canvas.js`, `detail-panel.js`, `story-text.js` | `GROUPS` (key → label) and `ELEMENTS` (id, name, popularity, group, col+row **or** x+y, description, example, sourceUrl) | A renamed field blanks every reader at once — `GROUPS` keys are also the CSS class suffixes |
| `diagram-svg.js` | `selection.js`, `drag-drop.js`, `viewport.js` | Each tile is `<g class="tile tile-<group>" data-element-id="<id>" tabindex="0">` inside one `<svg>` | Selection and drag find tiles by `data-element-id`; a change makes tiles unclickable |
| `diagram-svg.js` | CSS | Colour comes only from the class `tile-<group>` and CSS variables — never an inline `fill` | An inline fill silently escapes the palette and the contrast check |
| `viewport.js` | everything else | Owns the SVG `viewBox`; nobody else writes it | A second writer makes zoom jump when the story map area grows |
| `selection.js` | `detail-panel.js`, `story-canvas.js` | `storytelling:select` / `storytelling:open` events, `{ elementId }` | Detail panel and "Add selected" stop responding |
| `drag-drop.js` | `story-model.js` | `addBead(elementId, target)`, `moveBead`, `removeBead`, `linkBeads`, `cutRibbon` only | DOM-touching drag code inside the model breaks its tests |
| `story-model.js` | `story-canvas.js`, `story-store.js` | `storytelling:story-changed` event, `{ beads, ribbons }` | Beads and the saved draft go out of step with the model |
| `story-layout.js` | `story-canvas.js`, `story-text.js` | Pure `layout(beads, ribbons)` → positions, loop ribbons, step numbers, size | A second layout in the canvas makes print and screen disagree |
| `storytelling.prefs.v1` (localStorage) | `viewport.js` only | `{ popularity: boolean }` | Anything else reading or writing it |
| `data/library.js` | `library-panel.js`, `story-model.js` | `LIBRARY` entries in the same bead/ribbon shape as a saved story; deep-frozen, read-only | A different shape forks the loader; a writable library lets edits leak into the originals |
| `story-store.js` | browser `localStorage` | Keys `storytelling.stories.v1`, `storytelling.draft.v1`, both `{ version, … }` | Changing shape without bumping the version orphans Luke's saved stories |
| `detail-panel.js`, `story-canvas.js`, toolbar | `output.js` | `setPrintTarget(target, tone)` then `window.print()`; `copyText(string)` | Print would render the whole page, or nothing |
| `agent-api.js` | `story-model.js`, `story-store.js`, `list-text.js`, `story-layout.js` (read only) | `window.storytellingAgent`: plain-JSON levers, `{ ok, … }` or `{ ok:false, error }`, calling the same functions the gestures call | An agent path that bypasses the model can build stories a hand cannot |
| `list-panel.js`, `list-text.js` | `output.js`, toolbar | `listText(categoryKey \| "all", { examples })` → one plain string | A second place formatting list text makes preview/copy/print disagree |
| `share/build_share.py` | `dist/Storytelling-<version>.html` | Reads `app/`, writes one file; refuses unsupported import forms, cycles, duplicate top-level names | A module using a default/namespace import silently drops out of the shared copy |
| `server.py` | browser | Static files from `app/` on `127.0.0.1` only, no routes, no writes | Binding beyond localhost exposes the app; a write path breaks the read-only stance |

### CSS ownership, by file

Styling is split across eight files; each owns one visual concern and must never reach into
another's.

| File | Owns | Never touches |
|---|---|---|
| `variables.css` | Every token — colour, spacing, radius, motion, type | Any selector or layout rule |
| `layout.css` | Page shell, toolbar, panel positioning | Tile fill, story-map visuals |
| `tiles.css` | The periodic-table tile anatomy (symbol, name, popularity number, group fill via `tile-<group>` class) | Story-map beads/ribbons |
| `story-map.css` | Beads, ribbons, the tray, drop-target highlighting (the "Ribbon" look) | The table's own tiles |
| `library.css` | The library panel and its list of narrative types | The story map itself |
| `panels.css` | Detail panel, About panel, saved-stories list furniture | Toolbar, table |
| `motion.css` | Named animation keyframes/transitions only, each referencing a `--m-*` token | Any colour or spacing literal |
| `print.css` | `@media print` rules for table/story/list print targets, grayscale token swap | Screen-only layout |

## Key decisions

| # | Decision | Reason |
|---|---|---|
| D-1 | The SVG is generated from data at load, not hand-authored | One source of truth for ~180 tiles; position/name/group are checkable as data |
| D-2 | Opened by a launcher + tiny stdlib server | ES modules are blocked on `file://`; localhost gives `localStorage` one stable origin |
| D-3 | System fonts only | Bundled fonts are a dependency not granted |
| D-4 | Pointer events for drag, not HTML5 drag-and-drop | Full control of the ghost, drop highlight and settle animation; works with touch |
| D-5 | A drag starts on `pointerdown` after a 5px move; a plain press/release is a click | Gives "select → drag → release" one gesture, keeps double-click working |
| D-6 | Drag on empty background pans | Only sensible meaning of a background drag on a zoomable canvas |
| D-7 | Modules talk by events on `document` | No module holds a reference to another; each is testable with a fake page |
| D-8 | Selected-tile cue is a darker edge in the tile's own hue, plus lift | The source already uses bright yellow on three tiles; a yellow selection could be confused with those |
| D-9 | A draft story saves to `localStorage` on every change | A refresh or crash must not lose work in progress |
| D-10 | Colour verification uses canvas sampling in the browser | Python's stdlib cannot decode PNG; the browser can |
| D-11 | Text via `textContent` / `createElementNS`, never `innerHTML` | JS-6 |
| D-12 | A story is a free graph of beads/ribbons, auto-arranged; each drop joins the active bead by default | Matches the poster's own branching outline examples; a straight chain stays effortless |
| D-13 | Layout is a pure function of the story, separate from drawing | The riskiest logic, provable without a page; print and screen agree by construction |
| D-14 | Grayscale table print uses designed gray tokens, not `filter: grayscale` | Several pastel groups share one lightness and would collapse into the same gray |
| D-15 | The library ships as frozen data in the saved-story shape, always opens as a copy | One loader; Luke's edits can never damage a reference |
| D-16 | Luke's own copy runs from source; only the shared copy is bundled | Family/friends cannot be expected to have Python; keeping Luke's copy unbundled means what he runs is what he edits |
| D-17 | Source modules use only named static imports/exports | The bundler is a strict, checked subset; refuses anything else |
| D-18 | The agent gets in-page levers, not a server route | The server has no write path by design and the shared copy has no server |
| D-19 | Setting `prefers-reduced-motion: reduce` zeroes all three motion durations app-wide | Every animation becomes an instant change; every cue that would have animated is still shown as a static state, so no information is lost, only the movement |
| D-20 | At most 2 things animate at once, with one declared exception at release: a dropped bead's flight-and-settle, the story map's re-arrange, and the table's re-size run together (under 320ms) as a single response to one action | Enforced by review, not code — a bounded, deliberate overlap rather than scope creep |
| D-21 | The poster's highlight yellow (`--g-highlight` / `--color-highlight`) marks the drag drop-target and the save cue — never the selection cue (that's D-8's darker-edge-in-hue) | The source poster already uses this exact yellow on three fixed tiles (Cal, 5ma, 4wl); a yellow selection cue would read as one of those tiles |

## Tests

```
cd System/Apps/Storytelling
node --test                              # 534 tests — JS, node:test + fake-DOM helpers
python3 -m unittest discover -s tests    # 77 tests — server, share-bundler, contrast checker
```
Last run 2026-09-29: both suites pass in full (611/611).

See [app-decisions.md](app-decisions.md) for Luke's approvals and granted rule exceptions —
not copied here.
