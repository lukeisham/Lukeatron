# Closeout Review A — CurriculumPreparation

Reviewer: Sonnet (independent Reviewer A). No coordination with Reviewer B.

## Headline finding

**The app does not run.** `_template/app/index.html` — the one page the server
serves and the one page a teacher would open — contains no `<script>` tag of
any kind. It is a bare shell:

```html
<body>
  <h1>Curriculum Unit</h1>
  <nav id="app-nav" aria-label="Unit sections">
    <!-- Parts mount navigation here -->
  </nav>
  <main id="app-content">
    <!-- Parts mount content here -->
  </main>
</body>
```

36 JS modules exist in `app/js/` (arbor-tree, bigidea-list, coverage-grid,
lesson-plan-document, lesson-plan-generator, unit-assessment-document,
marking-matrix, crib-sheet, resources-page, lessons-and-topics,
curriculum-editor, traceability, local-store, etc.), all with passing unit
tests, and none of them are imported, mounted, or called from `index.html` or
from each other in a bootstrap sense. I started the real server
(`python3 serve.py`, port 8800) and opened it in a browser: the page renders
the literal words "Curriculum Unit" and nothing else. No console errors —
because no script runs at all. `#app-nav` and `#app-content` stay empty
forever; nothing populates them.

This is not one missing wire among many working ones. It is the **only**
wire — there is no top-level bootstrap script anywhere in the tree
(`grep -rn "app-content\|app-nav" app/js/` returns zero hits). Every part
below is scaffolding behind a blank page.

Verified independently:
- `python3 -m unittest discover _template/tests` → 21/21 PASS
- `node --test _template/tests/*.js` (from inside `_template/`) → 330/330 PASS
- `GET http://127.0.0.1:8800/` in a live browser → blank page, title
  "Curriculum Unit", body text "Curriculum Unit", no console output.

Green tests and a running server prove the *pieces* work in isolation. They
say nothing about the *product*, because the product — a teacher opening a
unit bundle and doing curriculum work — never gets past a blank page.

## Part-by-part

| Part | Delivered? | Evidence |
|---|---|---|
| 1a Curriculum map (arbor tree) | Scaffolding only | `app/js/arbor-tree.js` + `tidy-tree.js` exist, audited clean, 160+ tests pass. Not imported by `index.html` or any bootstrap. No way to reach it in the running app. |
| 1b Big-idea list / tree | Scaffolding only | `bigidea-list.js` (873 lines) exists, tested. Not mounted. No nav entry, no route. |
| 1c Coverage grid | Scaffolding only | `coverage-grid.js` + `coverage-derivers.js` exist, tested (incl. keyboard nav per `_WORKLOG.md` repair). Not mounted. |
| 2 Lesson plan (document + generator) | Scaffolding only | `lesson-plan-document.js`, `lesson-plan-generator.js`, shared `tier-page-emission.js` / `big-idea-picker.js` exist, CSS is now linked in `index.html` (`<link>` tags for `lesson-plan-document.css`, `tier-page.css` are present) — but the **JS that would render a lesson is never invoked**. Styling references without a script are cosmetic only. |
| 3 Unit Assessment | Scaffolding only | `unit-assessment-document.js` + 4 supporting modules exist, D1 field rename (prompt/task→material/studentTask) verified done, tested. Not mounted anywhere reachable. |
| 4 Marking matrix | Scaffolding only | `marking-matrix.js` (~1000 lines) exists, keyboard nav and unrendered-state repairs landed per worklog. Not mounted. |
| 5 Crib sheet | Scaffolding only | `crib-sheet.js` exists; worklog records citation-building is still a placeholder (`_buildCitation()` returns `""`) and domain glyphs are plain rectangles, not the pencil/notebook glyphs FR-CUR-13/FR-BI-15 require — so even reachable, this part is itself half-finished. Not mounted regardless. |
| 6 Resources page | Scaffolding only | `resources-page.js` (506 lines), audited clean, allow-listed URL validation, XSS-tested. Not mounted. |
| Bundle/generator `!NewUnit` | Partially delivered | `System/Skillbank/Teaching/!NewUnit/skill.md` exists and is catalogued in `_index.yaml`. It stamps a bundle from `_template/`. But the bundle it stamps is the same broken `index.html` — so `!NewUnit` faithfully reproduces a unit folder that cannot be used. |
| Server (`bundle-server`) | Delivered | `serve.py` runs, binds 127.0.0.1, path-traversal refused, verified live: server starts, serves the (empty) page, logs requests correctly. This piece genuinely works. |
| Local store / data layer | Delivered as infrastructure | `local-store.js` (912 lines), 24+ tests, validates all 44 INV-DM-* invariants, debounced save. Works as a library — but nothing in the running page calls it, so a teacher can't create or edit a `unit.json` through the UI today. |

## Integration gaps

- **The single, total gap: no bootstrap script.** Every part above is
  independently built, independently tested, and totally unreachable from
  the browser. This is the one fix that would change most rows in the table
  above from "Scaffolding only" to at least "Partial."
- `index.html` links 4 stylesheets (variables, document-shell,
  lesson-plan-document, tier-page) but zero of the 30 CSS files in
  `app/css/` for the other parts, and zero `<script>` tags for any of the 36
  JS modules — the CSS linking suggests someone started wiring the lesson
  plan document and stopped before the script tag.
- No router, no nav-building code, no "part switcher" of any kind exists to
  decide what mounts into `#app-nav` / `#app-content`. This would need to be
  designed, not just wired — the individual modules were built to independent
  per-build specs with no shared page-composition contract.
- `_WORKLOG.md`'s own stage board lists "6 Closeout review" and "7 Archive +
  registry" as pending, and nowhere in the 20 build specs, the audit passes,
  or the repair passes does an "integrate into index.html" step appear. This
  was never a task anyone owned — every build spec scoped itself to its own
  files.

## What a teacher could actually do today, start to finish

1. Run `!NewUnit` (or double-click `Start Unit.command`) → get a bundle
   folder with a working `serve.py`.
2. Double-click the launcher → server starts on `127.0.0.1:88xx`, no errors.
3. Open the page in Chrome → sees a heading that says "Curriculum Unit" and
   nothing else. No ingest spot, no arbor tree, no way to add a lesson, no
   way to enter a big idea, no menu, no buttons.
4. **Full stop.** There is no path from here into any of the six parts. The
   teacher cannot paste curriculum text, cannot create a lesson plan, cannot
   view a coverage grid, cannot print anything. The only thing that
   "works end to end" is standing up an empty server.

## What would break or block them

- Immediately: nothing to click. The blank page is the blocker, before any
  deeper issue matters.
- If the bootstrap were added today, the next blockers already recorded in
  `_WORKLOG.md` and the audits would surface:
  - crib sheet's citation builder is a stub (`_buildCitation()` → `""`) and
    its domain glyphs aren't the required pencil/notebook icons.
  - Several "print" paths were only ever unit-tested for page-count logic,
    never visually confirmed against real A4 output (document-shell,
    arbor-tree, resources-page, lessons-and-topics all carry this caveat in
    the worklog).
  - `curriculum-ingest` — FR-CUR-1, the "drop plain text in and get a
    structured tree" entry point — was explicitly **out of scope this run**
    (gated on real Year 10 History text from Luke). Even with a working UI,
    there is currently no ingest script to turn pasted text into `unit.json`
    content; a teacher would need to hand-build a unit via the (currently
    unmounted) curriculum editor instead.

## Top 5 issues, priority order

1. **`index.html` has no bootstrap script — nothing renders.** Fix: write a
   composition/router script that imports the part modules, builds
   `#app-nav`, and mounts the selected part into `#app-content`; link the
   remaining ~26 CSS files that are currently orphaned. This single fix is
   the prerequisite for every other issue on this list mattering at all.
2. **No end-to-end verification ever ran.** All 330+304 tests are unit-level;
   nobody clicked through the app as a teacher would, because there was
   nothing to click through. Fix: after (1), do exactly what this review did
   — start `serve.py`, open Chrome, walk one part per pass — before calling
   the run done.
3. **Crib sheet citation rendering is a stub** (`_buildCitation()` returns
   `""`), so even once reachable, printed crib sheets will show blank
   citations where FR-CS requires node codes and lesson numbers. Fix: wire
   the citation builder to the traceability/lesson-number data it already
   has access to.
4. **Curriculum ingest (FR-CUR-1) does not exist.** The PRD's own entry point
   — "drop plain text into an ingest spot" — was descoped for this run.
   Without a working UI *and* without ingest, the only way into the data
   model is directly hand-editing `unit.json`. Fix: this needs Luke's real
   curriculum text (already flagged as gated) before it can be built.
5. **Domain glyphs (pencil/notebook, FR-CUR-13/FR-BI-15) are drawn as plain
   rectangles in the crib sheet**, and several parts' print output has only
   ever been logic-tested, not visually checked against true-size A4 (FR-SYS-4).
   Fix: swap in the real glyph shapes, then do a physical/PDF print check on
   each of the six parts once part (1) makes them reachable.
