# Storytelling

An offline, in-browser reference app showing the elements of story on one large interactive diagram — Luke's revised edition of TV Tropes's "Periodic Table of Storytelling," re-arranged to follow the shape of the chemistry periodic table and extended with 36 new elements — and lets Luke build his own story outlines from them as a **story map**: elements joined by ribbons, straight or branching. It ships with a library of twelve ready-made story maps (one per narrative type), print/copy for both the table and a story, and a hidden lever set an AI agent can drive when Luke asks.

## Launch / restart
- Double-click `Start Storytelling.command` in this folder. A browser tab opens.
- Or by hand: `cd System/Apps/Storytelling`, then `python3 server.py`. It serves `127.0.0.1:8793` only — nothing leaves the machine.
- To stop: close the tab, or press Ctrl-C in the terminal running `server.py`.
- Tests: `node --test` (JavaScript) and `python3 -m unittest discover -s tests` (server, share-bundler, contrast checker), both from this folder.

### Sharing the app with someone else (for Luke)
- Build the bundle: `python3 share/build_bundle.py`. It writes **`dist/Storytelling-1.1.0-bundle.zip`** (about 330 KB) — the one thing to send. It rebuilds the single-file app first, so it is never stale.
- The zip holds: the one-file app (`Storytelling.html`), a runnable source copy with its launcher, the content as plain JSON (`data/`), the favicons, and a `READ ME FIRST.txt` written for the recipient. It leaves out your tests, working images and decision notes.
- Send it however suits you — AirDrop, a Dropbox link, a USB stick, or email (a zip passes email filters that block a bare `.html`).
- Tell them: **unzip it, then double-click `Storytelling.html`.** It opens in their normal browser (Safari and Chrome both work). No Python, no install, no internet.
- Their saved stories stay in *their* browser on *that* machine. They are not sent back to you, and opening the file in a different browser starts empty. To pass a story to you, they use **Copy** and paste the text into a message.
- The content is adapted from TV Tropes (CC BY-NC-SA 3.0): share it for personal, non-commercial use only, and keep the credit (it is in the About panel and in `READ ME FIRST.txt`). Do not sell it or post it on a commercial site.
- Before sending, run the checklist in `share/SMOKE.md` once on the `Storytelling.html` inside the zip.
- Only want the single file? `python3 share/build_share.py` writes just `dist/Storytelling.html`.

## Navigation
```
Storytelling/
├── Start Storytelling.command
├── server.py
├── README.md
├── app-decisions.md
├── wishlist.md
├── app/
│   ├── index.html
│   ├── favicon.svg · favicon-32.png · apple-touch-icon.png
│   ├── main.js
│   ├── data/
│   ├── diagram/
│   ├── detail/
│   ├── lists/
│   ├── agent/
│   ├── story/
│   ├── shared/
│   └── css/
├── dist/
├── share/
├── verify/
├── reference/
└── tests/
```

## Cross-app behaviour

Modules talk through three things only: data shapes, DOM contracts, and events on `document`. No
module imports another module's internals, and none reaches into another's DOM.

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `data/elements.js`, `data/furniture.js` | `diagram-svg.js`, `story-canvas.js`, `detail-panel.js`, `story-text.js` | `GROUPS` (key → label) and `ELEMENTS` (id, name, group, col+row **or** x+y, description, example; `popularity`/`popText`/`sourceUrl` — see the next row) | A renamed field blanks every reader at once — `GROUPS` keys are also the CSS class suffixes |
| `reference/work/added-sources.json` | `data/elements.js` (via `reference/work/apply_added_sources.py`) | For the 36 added elements only: a TV Tropes slug + wick count gives `popularity`/`popText` (wicks ÷ 1000) and a TV Tropes `sourceUrl`; no TV Tropes page gives a Wikipedia `sourceUrl` and **no number**; neither gives no `sourceUrl`. Poster elements always carry all three | A number on a non-TV-Tropes card, or a poster element without one; `detail-panel.js` shows a number only when `popText` exists and a link only when `sourceUrl` is a web URL. `assemble_elements.py` can no longer run (its `desc-out-*.json` inputs are gone), so edit the JSON and rerun the apply script |
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
| `share/build_bundle.py` | `dist/Storytelling-<version>-bundle.zip` | Runs `build_share` first, exports `data/elements.js` and `data/library.js` to JSON via node, then zips a fixed file list: single file, `server.py`, launcher, `app/`, `data/`, `favicons/`, generated `READ ME FIRST.txt`. Favicons must be `data:` URIs in `app/index.html` (the single-file build refuses file links); the files in `app/` are copies for reuse | A new top-level file the recipient needs but the list does not name is silently left out; a favicon linked by path breaks the single-file build |
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

## Decisions and exceptions
See [app-decisions.md](app-decisions.md) for what Luke has approved, any decision he explicitly flagged, and any granted Vibe-Coding rule exceptions. Not copied here.
