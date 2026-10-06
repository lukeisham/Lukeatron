# Storytelling — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-20 | PRD approved (renamed Storytelling; Style guide section added); five-spec set, launcher + stdlib server, system fonts | v0.5 |
| 2026-09-21 | PRD frozen; design closed; mockups deleted | v1.3 |
| 2026-09-28 | Moved from Sandbox to `System/Apps/Storytelling/`; build docs retired, Sandbox copy archived to `Archive/appdevelopment-restructure-2026-09-28/` | — |
| 2026-09-29 | Build-board row 13 (whole-app review) closed by Luke: **OQ-X1** — poster/diagram sharing OK with attribution, non-commercial use only. **OQ-D5** — the 36 added element names stand as-is; no TV Tropes match-check required before they count as real content. **AC-D4** — the 181-element data-transcription checklist (`verify/results.md`) accepted as-is, unchecked; Luke will correct any mismatch he later spots rather than auditing it row by row now. **Library authoring judgements** — accepted as-is. **AC-C10** (pleasantness of the story-map interaction) — accepted as-is. **OQ-V1** — detail panel's default "above" position accepted for now. **The "discreet" popularity number** — accepted as looking fine. Human-only smoke items (`share/smoke-results.md`'s HUMAN rows: double-click launcher, real Safari/Firefox, real airplane-mode, the print dialog itself, pasting the clipboard, Luke opening the file offline) deliberately deferred — Luke will run these himself once the app is confirmed operational. | row 13 |
| 2026-09-29 | Build accepted; build docs retired. Full test suite verified first (534 JS + 77 Python, 611/611 passing) and the app launched and driven live in a browser (diagram, story map, About panel all correct) before anything was deleted. `_build/` (`prd.md`, `specs/`, `build.md`, `BUILD-NOTES.md`) removed via `git rm`; git history keeps every version. `README.md` and `StyleGuide.md` written per Phase 4 STEP 2/4. App is operational; refinement from here is ordinary editing (`!AppDevelopment` Phase 4's own rule) — human-only smoke tests (launcher double-click, real browsers, real offline, print dialog, clipboard) are still Luke's to run himself, not a re-open of this approval. | Phase 4 complete |
| 2026-09-29 | Key decisions (D-1–D-21) and their reasoning moved here from README, per `!AppDevelopment` v2.1.0's "no decision of any kind lands in README" — README now points here instead | — |

## Key decisions

Not every decision — only one Luke explicitly wants logged, not left to the code or README. Each
gets its reason; the reason is the point. Append the moment Luke flags one, whenever that is.

| # | Decision | Reason | Rejected alternative |
|---|---|---|---|
| D-1 | The SVG is generated from data at load, not hand-authored | One source of truth for ~180 tiles; position/name/group are checkable as data | — |
| D-2 | Opened by a launcher + tiny stdlib server | ES modules are blocked on `file://`; localhost gives `localStorage` one stable origin | — |
| D-3 | System fonts only | Bundled fonts are a dependency not granted | — |
| D-4 | Pointer events for drag, not HTML5 drag-and-drop | Full control of the ghost, drop highlight and settle animation; works with touch | — |
| D-5 | A drag starts on `pointerdown` after a 5px move; a plain press/release is a click | Gives "select → drag → release" one gesture, keeps double-click working | — |
| D-6 | Drag on empty background pans | Only sensible meaning of a background drag on a zoomable canvas | — |
| D-7 | Modules talk by events on `document` | No module holds a reference to another; each is testable with a fake page | — |
| D-8 | Selected-tile cue is a darker edge in the tile's own hue, plus lift | The source already uses bright yellow on three tiles; a yellow selection could be confused with those | — |
| D-9 | A draft story saves to `localStorage` on every change | A refresh or crash must not lose work in progress | — |
| D-10 | Colour verification uses canvas sampling in the browser | Python's stdlib cannot decode PNG; the browser can | — |
| D-11 | Text via `textContent` / `createElementNS`, never `innerHTML` | JS-6 | — |
| D-12 | A story is a free graph of beads/ribbons, auto-arranged; each drop joins the active bead by default | Matches the poster's own branching outline examples; a straight chain stays effortless | — |
| D-13 | Layout is a pure function of the story, separate from drawing | The riskiest logic, provable without a page; print and screen agree by construction | — |
| D-14 | Grayscale table print uses designed gray tokens, not `filter: grayscale` | Several pastel groups share one lightness and would collapse into the same gray | — |
| D-15 | The library ships as frozen data in the saved-story shape, always opens as a copy | One loader; Luke's edits can never damage a reference | — |
| D-16 | Luke's own copy runs from source; only the shared copy is bundled | Family/friends cannot be expected to have Python; keeping Luke's copy unbundled means what he runs is what he edits | — |
| D-17 | Source modules use only named static imports/exports | The bundler is a strict, checked subset; refuses anything else | — |
| D-18 | The agent gets in-page levers, not a server route | The server has no write path by design and the shared copy has no server | — |
| D-19 | Setting `prefers-reduced-motion: reduce` zeroes all three motion durations app-wide | Every animation becomes an instant change; every cue that would have animated is still shown as a static state, so no information is lost, only the movement | — |
| D-20 | At most 2 things animate at once, with one declared exception at release: a dropped bead's flight-and-settle, the story map's re-arrange, and the table's re-size run together (under 320ms) as a single response to one action | Enforced by review, not code — a bounded, deliberate overlap rather than scope creep | — |
| D-21 | The poster's highlight yellow (`--g-highlight` / `--color-highlight`) marks the drag drop-target and the save cue — never the selection cue (that's D-8's darker-edge-in-hue) | The source poster already uses this exact yellow on three fixed tiles (Cal, 5ma, 4wl); a yellow selection cue would read as one of those tiles | — |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| JS-7 (no build step, no bundler) | `share/build_share.py` and its generated `dist/Storytelling*.html` only — not the app source, not Luke's own copy | The shareable copy must open by double-click without Python; ES modules are blocked on `file://`. Alternatives (hosted page, zip + launcher) offered and declined | 2026-09-21 |
