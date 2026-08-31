# CLOSEOUT — CurriculumPreparation build run

Run date: 2026-08-29. Written after the final repair pass, with REVIEW-A and REVIEW-B's findings
checked against current code. Numbers below were re-verified by running both suites and re-reading
the flagged files directly, not copied from earlier reports.

Current suite state: **341 JS tests PASS / 0 fail** (`node --test tests/*.js`), **21 Python tests
PASS / 0 fail** (`python3 -m unittest discover tests`). `_template/unit.json` is a clean, empty
skeleton (verified by reading it — `nodes: []`, `bigIdeas: []`, `lessons: []`, no fixture strings).

---

## 1. What was built

20 in-scope builds (of 21 planned; `curriculum-ingest` was descoped, see §4), plus a 21st build,
`app-bootstrap`, added late in the run when Closeout Review A discovered the app did not run.

| # | Build | What it owns |
|---|---|---|
| 1 | bundle-template | The nine-entry template tree, `unit.json` skeleton |
| 2 | bundle-server | `serve.py` — stdlib-only local HTTP server |
| 3 | style-guide | `variables.css` design tokens, `StyleGuide/index.html` |
| 4 | document-shell | `TIERS`, `DocumentShell` class, `@page` print CSS, `app/index.html` |
| 5 | local-store | `ids.js`, `local-store.js` — client, persistence, all 44 `INV-DM-*` invariants |
| 6 | newunit-skill | `System/Skillbank/Teaching/!NewUnit/skill.md` — stamps a new unit bundle |
| 7 | curriculum-editor | Hand-entry node CRUD, tree validation, delete gates |
| 8 | arbor-tree | Curriculum map (SVG tidy-tree layout + node cards) |
| 9 | bigidea-list | Big idea list/tree, `computeGlyphSet`, coverage write API |
| 10 | coverage-grid | Coverage grid across topics/assessments |
| 11 | image-paste | Image upload/paste, orphan cleanup, delete-refusal gate |
| 12 | lesson-plan-document | Lesson plan rendering, shared `tier-page-emission.js` / `big-idea-picker.js` |
| 13 | lesson-plan-generator | Deterministic lesson generation from curriculum nodes (no model call) |
| 14 | unit-assessment-document | Unit assessment tiers, mini-assessments, final-assessment guard |
| 15 | lessons-and-topics | Topic/date views, reorder modes, status computation |
| 16 | marking-matrix | Scoring grid against assessments, tier-budget allocation |
| 17 | csv-export | Browser-download CSV export of marking-matrix totals |
| 18 | crib-sheet | 1-2 page printable summary per big idea |
| 19 | resources-page | Unstructured resource links, URL allow-listing |
| 20 | traceability-links | Reverse-reference index, cross-navigation |
| 21 | app-bootstrap | Late addition — `app.js`, page composition/router, part mounting |

**What the widget does today:** a teacher runs `!NewUnit` (or double-clicks `Start Unit.command`) to
stamp a unit folder from `_template/`, starts the bundled local server, and opens the app in a
browser. The app renders a real navigation bar and mounts each part on selection. There is no
automated curriculum-ingest path — units are built by hand through the curriculum editor.

**Test position:** 341 JS + 21 Python tests, all passing, all capable of failing (the one sham test
file, `test_arbor-tree.js`, was rewritten in repair — see §7). This is real coverage of module-level
behaviour; it is not proof the six document parts render correctly end to end, which required the
separate app-bootstrap build and live-browser checks (§2).

---

## 2. What works — verified

Confirmed by actually starting `serve.py` and driving the app in a real browser (console + network
read), not by reading source or trusting unit tests:

- The server starts, binds `127.0.0.1`, serves `app/index.html`, refuses path traversal.
- `index.html` now has a real `<script type="module" src="js/app.js">` entry point and links to the
  ~26 part CSS files that were previously orphaned.
- Navigation renders (8 buttons, `aria-current` marking the active one).
- Loading and error states render for real — proved by breaking a unit and seeing "Could not load
  this unit", not just reading the error-handling code.
- These parts render cleanly when mounted: **Lessons & Topics, Lesson Plans, Unit Assessment,
  Marking Matrix, Resources Page.**
- The Curriculum Map (arbor-tree) and Coverage Grid parts were dead-on-arrival integration bugs
  found by this live check (BUG-3, BUG-4 below) and have since been fixed and re-verified live.
- Crib Sheet was also dead-on-arrival (BUG-5) and has been fixed and re-verified live.
- `!NewUnit` stamps a clean, valid, loadable unit — this was NOT true at one point in the run
  (see §4/§7, the unit.json pollution incident) but is true now: `unit.json` on disk validates
  against `validateUnit()` and survived a full test-suite run byte-identical (shasum check).

**What is only unit-tested, not demonstrated live:**

- Print output (`@page` geometry, multi-page pagination, physical A4 fit) for document-shell,
  arbor-tree, resources-page, lessons-and-topics, crib-sheet — all logic-tested only. See §6.
- Traceability's scroll-to-highlight and back-navigation (§6).
- The network-disabled gate for lesson-plan-generator (§6).
- Big-idea list / bigidea-tree UI interactions beyond its own module tests — it is imported and used
  by other parts but was not separately walked as a standalone screen in the live check.
- Curriculum-editor's hand-entry flow was not separately walked live in the final app-bootstrap
  verification pass (the live check log lists the six document-producing parts explicitly; curriculum
  editing and big-idea management were not named as separately confirmed).

---

## 3. Decisions Luke has already made — settled, recorded for reference

| # | Decision | Consequence |
|---|---|---|
| D1 | Assessment tier pages use the same field names as lessons (`material` / `studentTask`), not the `prompt`/`task` the unit-assessment-document spec had invented. | Fixed in unit-assessment-document's code + tests; verified with round-trip tests and a negative-assertion test that no `.prompt`/`.task` survives. Confirmed still true — grep finds no live usage. |
| D2 | `_template/VERSION` is blessed as a ninth top-level template entry (source of `generatedFrom`). | `bundle-template.build.spec.md` amended (§2, FR-BT-1, AC-BT-1) to list nine entries; `newunit-skill` uses it. Confirmed landed. |
| D3 | CSV export is a browser `Blob` download — no server endpoint, no `exports/` folder. | csv-export built against this from the start; confirmed no server-side export code exists. |

---

## 4. DECISIONS NEEDED FROM LUKE

### Q1 — Build `curriculum-ingest`, or drop it permanently?

`curriculum-ingest` (FR-CUR-1: paste plain curriculum text, get a structured node tree) was excluded
from this run — gate G-9/Q-1 needs real Year 10 History curriculum text from Luke to build and test
against, and none was available.

- **Option A — build it next**, once you supply real curriculum text. Restores the PRD's intended
  entry point; without it, every unit's node tree is entered by hand through curriculum-editor.
- **Option B — drop it permanently**, and treat hand-entry via curriculum-editor as the supported
  path. Simpler, no dependency on sourcing/parsing real jurisdiction text, but slower for a teacher
  setting up a new subject from scratch.
- **Recommendation:** A, when you have the text — hand-entry doesn't scale past a handful of nodes.
- **Blocks:** nothing today (the app runs and is usable without it); blocks the "drop text in, get a
  tree" workflow the PRD describes as the primary onboarding path.

### Q2 — Split `local-store.js` (920 lines) and `bigidea-list.js` (873 lines)?

Both breach SR-1 ("one file, one job") — flagged at build time and deliberately not repaired
mid-run (splitting at the end of a build run was judged riskier than leaving it). `local-store.js`
mixes `ServerClient`, `LocalStore`, and all 44 `INV-DM-*` invariant checks in one file.

- **Option A — split now.** Lowest-risk cut: pull `validateUnit()` into a sibling `validate.js`
  (pure function, no shared state) — this alone would take `local-store.js` from ~920 to roughly
  half. `bigidea-list.js` would need a similar cut between list rendering and the coverage write API.
- **Option B — accept as-is.** Both files work, are heavily depended on, and a refactor risks
  introducing a regression with no build stage left to catch it.
- **Recommendation:** A, but only as its own small task with its own test run — not bundled into
  anything else. `local-store.js` is the single most central file in the app (every part reads
  through it); it is where a future bug is most likely to hide unnoticed.
- **Blocks:** nothing functionally; this is a maintainability decision only.

### Q3 — Reshape `computeGlyphSet`'s third parameter?

`computeGlyphSet(bigIdeaId, nodes, resolveDomain)` needs its third argument to be a caller-bound
1-argument closure over `nodes`, not the natural 2-argument `resolveDomain(nodeId, nodes)` function
it's named after. Passing the natural function directly caused a real, silent outage (BUG-5: crib-sheet
was dead on arrival until fixed) — the kind of mistake the signature invites rather than prevents.

- **Option A — reshape the signature** so `computeGlyphSet` takes `nodes` directly and binds the
  closure internally, or renames the parameter to something that can't be satisfied by
  `resolveDomain` itself (e.g. `resolveDomainForNode`) so a type/name mismatch is obvious at the
  call site.
- **Option B — leave it and document it.** A code comment at the `computeGlyphSet` definition and
  every call site warning that the third argument must be a bound closure, not `resolveDomain`
  itself.
- **Recommendation:** A. This has already caused one real bug during the run itself; a
  self-documenting signature is cheap insurance against the next one.
- **Blocks:** nothing today (already fixed at the one live call site); this is a hardening decision.

### Q4 — StyleGuide filename: `StyleGuide/index.html` vs the spec's `styleguide.html`

The style-guide spec's prose refers to `styleguide.html`; the file that actually exists (and that
nothing else references by path) is `StyleGuide/index.html`. Confirmed at closeout: `grep` for either
path finds no code reference to it at all — only the spec's own wording uses `styleguide.html`.

- **Option A — rename the file** to match the spec.
- **Option B — amend the spec wording** to match the file that was actually built.
- **Recommendation:** B — `index.html` inside a `StyleGuide/` folder is the more conventional
  pattern and nothing needs to change on disk.
- **Blocks:** nothing; purely a documentation-consistency cleanup.

### Q5 — `marking-matrix.js` has grown to 1553 lines

Started the run at "~1000" per the worklog; the repair pass ("the biggest repair of the run") added
keyboard-navigation helpers, three previously-unrendered UI states, and an unbudgeted unit-progress
block, pushing it past `local-store.js` and `bigidea-list.js` combined were flagged for at 720–912
lines. Confirmed at 1553 lines by direct `wc -l`.

- **Option A — split by concern** the next time this file is touched: grid rendering / keyboard nav
  / totals-and-allocation are three fairly separable pieces already.
- **Option B — accept as-is** for now; it works and is tested.
- **Recommendation:** B for this closeout, A the next time a marking-matrix change is requested —
  don't touch a working, tested 1553-line file purely for line count.
- **Blocks:** nothing; same maintainability class as Q2.

---

## 5. KNOWN GAPS — work that is genuinely unfinished

Verified directly against current code, not against earlier claims:

- **Crib sheet citation rendering is unimplemented.** `crib-sheet.js:594` — `_buildCitation()` is a
  literal placeholder: `// TODO: Query lessons and curriculum nodes for this big idea` /
  `return ''`. Printed crib sheets currently show no citation text at all where node codes and lesson
  numbers should appear. The comment names exactly what's missing: access to `lessonData`/`nodeData`
  when the render context is built.
- **Crib sheet domain glyphs are simplified, not the pencil/notebook icons FR-BI-15 describes.**
  `crib-sheet.js:719-733` — the `_glyph()` function draws a "pencil" as a small rectangle plus a
  short line, and a "notebook" as an outlined rectangle plus a line, both roughly 4×6px. This is
  recognisably glyph-shaped but is a geometric abstraction, not real pencil/notebook iconography.
- **Crib sheet's 1-2 page cap is a text-length heuristic, not a measured height.**
  `crib-sheet.js:_estimateSectionHeight()` and `_computePageCount()` estimate height from
  `section.text.length / 40` and a section-count multiplier — there is no real SVG measurement. The
  hard cap (never more than 2 pages) is therefore only as reliable as the estimate; a section with
  unusually dense or sparse content could still produce a silent page 3. This was accepted as OQ-CSB-2
  during the run but is still open.
- **Curriculum ingest does not exist** (see Q1, §4) — not a defect, a deliberate scope exclusion.
- **INV-DM-32 (contiguous lesson numbering from 1) is enforced only procedurally**, at the reorder
  call sites (`lesson-reorder-topic-mode.js`, `lesson-reorder-date-mode.js`), not structurally inside
  `validateUnit()`. A hand-edited or externally generated `unit.json` with a numbering gap would not
  be caught on load. Not independently re-verified in this pass beyond confirming REVIEW-B's finding
  still matches the code; worth a follow-up check.
- **INV-DM-38/39 (marking-matrix tier-budget arithmetic, the 0.5-boundary rule, override exclusion)**
  — `validateUnit()`'s invariant checks are dominated by referential/structural rules; no check
  specifically pins the tier-budget arithmetic. The allocation logic lives in `marking-matrix.js` and
  is claimed to match the spec's worked example exactly, but whether a test pins the *exact* numbers
  (not just "sums to 100") was not re-confirmed in this pass.
- Curriculum-editor's hand-entry flow was not walked live end-to-end in the final verification pass —
  the app-bootstrap live check named six document parts explicitly and did not separately confirm
  curriculum-editor or bigidea-list as standalone screens.

---

## 6. UNVERIFIED — needs a human or a real printer

Every acceptance criterion below is logic/unit-tested only; none has been demonstrated with a real
printer, PDF export, or a populated live dataset, because this environment cannot produce or measure
either.

| Item | How to verify |
|---|---|
| True A4 print geometry, both orientations (`@page` rules, 794×1123 / 1123×794 px @96dpi) | Open `app/index.html`, print-preview or export to PDF for each of the 7 print artboards, measure against physical A4 |
| Multi-page print output (document-shell, arbor-tree, resources-page, lessons-and-topics, crib-sheet) | Populate a unit with realistic-sized data (40+ nodes/resources, several lessons) and print-preview each part |
| Traceability scroll-to-highlight and back-to-position navigation | Click a cross-reference in a live browser session, confirm the target scrolls into view, highlights, and back-navigation returns to the origin |
| Network-disabled gate for lesson-plan-generator (AC-LPG-7) | DevTools → block all network → exercise the generator; the static `grep -rn fetch` check done during the run is necessary but not sufficient proof of runtime behaviour |
| Regenerate control absence for an edited lesson (AC-LPG-5) | Render an edited lesson, inspect the DOM for the control |
| 40-item resources page pagination and 200-char URL wrap (AC-RESB-6/7) | Populate 40 resource items, print-preview |
| Crib sheet page-cap reliability under real content | Author a crib sheet with unusually dense/sparse sections and confirm it never silently exceeds 2 pages |

---

## 7. Lessons for the next run

1. **330 (now 341) unit tests passed while the app did not run at all**, because every module was
   tested against its own mocks and no build owned integration. `_PLAN.md` had 21 subtasks and none
   of them was "assemble the parts into the page." The fix landed as a 22nd build (`app-bootstrap`),
   discovered only because a closeout reviewer opened the app in a real browser. **Recommendation:**
   every future multi-part build plan must include an explicit integration/bootstrap subtask from the
   start, not as a closeout afterthought — and at least one stage in every run should be "start the
   real thing and click through it," not just "run the test suite."

2. **Test fixtures written from the implementation, not the schema, prove nothing.**
   `test_coverage-grid.js`'s mock unit builder used the key `curriculum:` for the node array — the
   same wrong shape as the buggy code it was testing — so the test exercised the bug and passed. It
   only surfaced when the app-bootstrap live check hit the real bug (`this.unit.curriculum` should
   have been `this.unit.nodes`) and the mock had to be corrected to `nodes:` to make the test honest.
   **Recommendation:** run a fixture-vs-schema sweep on the whole test suite before calling any future
   run done — for every test fixture, diff its shape against the real `unit.json` schema rather than
   against the module it's testing.

3. **A test that cannot fail is worse than no test.** `test_arbor-tree.js` wrapped 8 of its 9
   assertions in `try { assert(...) } catch { assert(true) }`, which silently launders a real
   assertion failure into a green result. It contributed 8 tests to the "330 PASS" headline while
   proving zero of `ArborTree`'s actual rendering behaviour — and its own per-build audit also marked
   the build "PASS (clean)" by reading source text the same way the sham tests did, so neither caught
   the other's blind spot. This has since been rewritten with a hand-built fake-DOM (no `try/catch`
   swallowing) and immediately found two real bugs (multi-strand layout dropping whole strands; node
   code/title truncated at 18 characters) that eight fake-green tests and a clean audit had both
   hidden. **Recommendation:** the `try { assert } catch { assert(true) }` shape should be a hard
   grep-based lint check in this codebase from now on — it should never appear again anywhere in the
   tree.

4. **Cross-build sweeps caught defects no per-build audit could.** The `!important` breach (three
   separate builds each reaching for the same CSS-5 escape hatch independently) and the coverage-grid
   `curriculum:`/`nodes:` mismatch were both found only by someone reading across the whole tree at
   once, not by any single build's own audit. **Recommendation:** keep a dedicated cross-cutting sweep
   stage in every future run — it is cheap relative to what it catches, and this run's own evidence is
   that per-build audits structurally cannot see cross-build duplication.
