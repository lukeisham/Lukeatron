# CurriculumPreparation — Refactor Registry

kind: widget
template: `_template/`
test: `_test/`
last_updated: 2026-09-02 (R-10 in test — Marking Matrix edit/entry modes — awaiting Luke's review)

## In two lines
A unit-preparation widget for teaching: one self-contained, portable bundle per unit holding a
curriculum tree, big ideas, topics, lessons, a crib sheet, a resources page, a unit assessment and
a marking matrix — editable in the browser, printable to A4.
It runs on a local Python server inside its own folder, with no dependencies and no build step.

## Where things are
```
CurriculumPreparation/
├── _template/              the canonical copy — raw working code + README.md, no data, no specs
├── _test/                  labelled TEST, obviously fake data, where every change is tried first
├── _TestData/              REAL curriculum fixtures — the importer's measurement instruments
└── refactor-registry.md    this file
```
The first three are permanent siblings. The test copy and its fake data are never tidied away
when a refactor finishes.

### Why there is a fourth sibling
Phase 4's standard layout is three items. `_TestData/` is a deliberate, Luke-approved addition
(2026-09-01), because the two test corpora answer different questions and merging them would
destroy one of them:

| | `_test/` | `_TestData/` |
|---|---|---|
| Data | Wholly invented — "Dragonology", TESTLAND, Ms Testerina Faketeacher | **Real** VCAA Victorian Curriculum F–10 v2.0 History, and a real messy teacher paste |
| Purpose | The refactor sandbox. Gets edited, broken and thrown around. | A measurement instrument. The importer is scored against it, and the score is only comparable over time because the input never changes. |
| Its realism | Must never look real — it is not Luke's work | **Is the point** — a tidied fixture would measure the importer against input it will never see |
| Seeded by | `_TestData/seed-test-fake.py` → `_test/` | `_TestData/seed-testunit.py` → `AustraliansAtWar-testunit/` |

Both seed scripts assert their top-level key set against `_template/unit.json`, so schema drift
is caught from both directions. `_TestData/README.md` carries the provenance, the CC BY-NC
licence caveat, and the standing instruction not to "correct" the messy paste.

## The rule
Changes are made in `_test/` only. The template is never edited directly. An accepted change is
ported into `_template/`, the fake data stripped, and the template verified to still run clean.
After every port, `_test/` and `_template/` are diffed file by file — any difference not on the
divergence allowlist below means the port was incomplete.

**Two things in `_test/` are never ported back:** the red TEST banner and titles in
`app/index.html`, and the TEST notice at the top of `_test/README.md`.

## Divergence allowlist
Checked 2026-09-01 by `diff -rq _template _test` (after clearing stray `__pycache__` build
artefacts, which are not code and are excluded from the check). Every difference found was one of
these three:

| What | Where |
|---|---|
| Fake data | `unit.json`, `images/dragon-swatch.png` (present only in `_test/`) |
| TEST banner / title | `app/index.html` |
| TEST launch message / README notice | `Start Unit.command`, `README.md` |

All other files — every file under `app/js/`, `app/css/`, `serve.py`, `tests/`, `StyleGuide/`,
`_ingest/`, `VERSION` — are byte-identical between the two.

## Refactor board

| # | Requested change | Status | Health | Notes |
|---|---|---|---|---|
| R-1 | Build `curriculum-ingest` (paste plain curriculum text → structured node tree), or drop it permanently | requested | — | Excluded from the original build for want of real curriculum text; that text now exists in `_TestData/`. Without it every node tree is hand-entered through curriculum-editor, which does not scale. Recommendation at closeout: build it. |
| R-2 | Split `local-store.js` (971 lines) — pull `validateUnit()` out to a sibling `validate.js` | requested | — | SR-1 exception below. Lowest-risk cut; roughly halves the file. Must be its own task with its own test run — this is the most depended-on file in the app. |
| R-3 | Split `marking-matrix.js` (1790 lines) by concern: grid rendering / keyboard nav / totals-and-allocation | requested | — | SR-1 exception below. Do this the next time the matrix is changed for another reason, not on its own — it works and is fully tested. |
| R-4 | Split `bigidea-list.js` (873 lines) between list rendering and the coverage write API | requested | — | SR-1 exception below. Same class as R-2, lower risk. |
| R-5 | Reshape `computeGlyphSet`'s third parameter so it cannot be satisfied by `resolveDomain` itself | requested | — | Already caused one real silent outage (the crib sheet was dead on arrival until fixed). Rename to `resolveDomainForNode`, or take `nodes` directly and bind the closure internally. Hardening only — the one live call site is correct. |
| R-6 | Restyle the lesson plan (front page + tier pages) in "the studio grid" direction — Luke's pick from a six-way style picker | in template | — | Built in `_test/` across `lesson-plan-document.js`, `lesson-plan-document.css`, and one new `variables.css` token (`--font-size-jumbo-mm`); ported into `_template/` on Luke's approval, verified 377 JS + 22 Python tests pass in `_template/` too, and re-diffed against `_test/` — only the divergence allowlist remained. Side effect fix carried with it: the sidebar/notes column and main content no longer share the same x-range (a pre-existing overlap risk whenever both a big idea box and a sidebar were present — main content now narrows to `x=142` when a sidebar exists). |
| R-7 | Wishlist #2 — colour-code the "Jump to lesson" buttons on the Lesson Plans page by each lesson's completed/uncompleted status | in template | — | `app.js` `mountLessonPlans()` adds an `is-lesson-completed` class when `lesson.completed` is true; `app.css` tints it with the existing `--color-row-tint-completion` token (same one `lessons-and-topics-renderer.js` uses for completed rows) — no new colour introduced. Uncompleted lessons keep the plain default background. Built and verified in `_test/`, accepted by Luke, ported into `_template/`: 377 JS + 22 Python tests pass there too, and `diff -rq _template _test` afterward showed only the divergence allowlist. |
| R-8 | Wishlist #5 — vary the test copy's lesson plans so half are one page and half are multi-page | in test | — | Test-data-only change: `_test/unit.json` lessons `les--conscript`, `les--homefront`, `les--interwar` (5-7) had their three tiers emptied (`material`/`studentTask`/`workspaceLines`/`imageRefs` cleared), joining the already-empty `les--kokoda` (8) — giving 4 one-page lessons (5-8) and 4 four-page lessons (1-4, tiers untouched). Verified page counts in-browser via each lesson's `page X of Y` footer. No template code involved — this row closes once Luke confirms the split looks right; there is nothing to port. |
| R-9 | Wishlist #4 — verify auto-save actually fires whenever data is modified | verified, no change | — | Audited every mutation call site in `app/js/`: all funnel to `LocalStore` either via `setData()` (merges the change, stamps `dateModified`, and debounces `saveUnit()` ~500ms later — used by `curriculum-editor.js`, `bigidea-list.js`, `lessons-and-topics.js`, `coverage-grid.js`, `lesson-plan-generator.js`, `app.js`'s mini-assessment save) or a direct immediate `saveUnit()` call (`resources-page.js`, `marking-matrix.js`, `image-paste.js`) — both paths end at the same `saveUnit()` → `PUT /api/unit`. No mutation site found that skips both. Live-checked in `_test/`: toggled a lesson's completion dot in Lessons & Topics, waited past the debounce, and confirmed a `PUT /api/unit` fired and `unit.json` on disk carried the new value and a fresh `dateModified`. No bug found; no code changed. |
| R-10 | Wishlist #10 — Marking Matrix: direct hypothetical-score editing with live rebalancing, an Edit Rubric / Enter Marks mode split, 0/x score display, and mode-aware print | in test | — | Large one — worked through with Luke in conversation first (three rounds of clarification) before building. Scoped to criteria only for now; criteria/assessment interaction deferred to a later conversation.<br><br>**What was found before building:** most of the plumbing already existed but was never wired to any UI — `DISPLAY_MODES`, `setDisplayMode()`, `renderSetupPrint()` and `renderStudentDataPrint()` had zero call sites outside `marking-matrix.js` itself. Consequence: the live `renderClassGrid()` mounted with `displayMode` stuck at its constructor default (`DEFAULT_EMPTY`), so every score input was `disabled` — a teacher could not enter a mark in the running app at all before this row. Also found: `setMaxScore()` carried a comment "Do NOT re-allocate this tier; overridden criteria are excluded (AD-MMB-18)" — Luke confirmed this was unnoticed drift from the original intent during build, not a decision, and asked for it reversed.<br><br>**Behaviour change:** `setMaxScore()` now calls `allocateTier()` after setting the edited criterion's value, so every other non-overridden criterion in that tier live-rebalances the tier's fixed budget (50/25/25) around it. New test locks this in (`test_marking-matrix.js`, worked example: edit one of 3 pass-tier criteria to 20, assert the other two split the remaining 30 down the middle).<br><br>**New: `renderCriteriaEditor()`** — tier-grouped rubric list, no student names or marks anywhere. Each criterion's hypothetical score is a live-editable input (→ `setMaxScore`); add/remove criteria inline (`openTextPrompt`, extracted out of `app.js` into a new shared `text-prompt.js` so `marking-matrix.js` could reuse it without a circular import); a new criterion defaults to every current assessment. Unit hypothetical total shown at the foot.<br><br>**Changed: `renderClassGrid()`** — every score cell now shows the actual mark (editable input) plus the hypothetical ceiling as a greyed `/x` suffix (`_renderScoreSplit()`, new helper — appends directly into a container rather than returning a `DocumentFragment`, since the test suite's hand-built fake DOM has no `createDocumentFragment`). Tier subtotal cells get the same actual/greyed split. Added a Unit Total row (there wasn't one) using the existing `computeUnitTotal()`, same split.<br><br>**Changed: `renderSetupPrint()`** — was a blank handwriting sheet (empty boxes, a "Student: ___" line); now prints the resolved rubric — every criterion's hypothetical score, tier and unit totals — since Luke was explicit that printing from Edit mode shows the hypothetical numbers, not a blank sheet. No student data on this sheet, so no "actual" half to show.<br><br>**New in `app.js`:** `mountMarkingMatrix()` now holds its own mode (`markingMatrixMode`, module state like `currentPartId`, defaults to `'edit'`) with a visible toggle (`buildMarkingMatrixModeToggle()`, styled like the nav tab strip). Edit mode maps to `DISPLAY_MODES.DEFAULT_FULL`, Entry mode to `DATA_ENTRY`. Each mode also mounts its own hidden-on-screen print pages (`.print-only`, a new symmetric pair to the existing `.screen-only` in `document-shell.css`) via `adoptShellPages` — Edit mode adopts one `renderSetupPrint()` shell, Entry mode adopts one `renderStudentDataPrint()` shell per student — because the interactive HTML editing surface can't double as the print surface the way every other document's SVG-only view does. "+ Populate from Curriculum" now shows in Edit mode only; "Export CSV" in Entry mode only (`getCSVSource` passed conditionally).<br><br>**Verified:** 378 JS + 22 Python tests pass (377 + the new rebalance test). Live in `_test/`: edited a Pass-tier criterion 5→30, watched its sibling rebalance 5→20 live and the tier band read "50/50", confirmed on disk. Switched to Entry mode, confirmed inputs are no longer disabled, entered a mark, confirmed it saved to disk. Confirmed 7 print-only SVG pages mounted for Entry mode (one per student) and 1 for Edit mode, both `display:none` on screen. Read the Edit-mode print page's text directly: "Marking Rubric — …", "Hypothetical total: 90 / 100", "Pass (Budget: 50)", each criterion's number, "50 / 50" — no blank boxes, no student line.<br><br>**Not done / left for a later conversation:** how criteria and assessments interact when editing (Luke deferred this explicitly); no on-screen student-by-student print preview (print output is verified via its text content, not visually per page); `renderStudentPage()` (a third, still-unmounted per-student on-screen view) untouched — out of scope, not part of this ask. Staying **in test** — this is large enough, and touches a corrected architectural decision (AD-MMB-18), that it goes to Luke for review before porting, rather than auto-porting like the smaller wishlist rows. |

Status values: `requested` · `in test` · `accepted` · `in template` · `rejected`.
A rejected change is reverted in `_test/` and left on the board — not silently dropped.

Health is the score out of 10 from `!AppDevelopment` Phase 4 STEP 7's Refactor Health Check, run
once per row immediately before the port. R-1 through R-10 predate the check (added 2026-09-02)
and are marked `—`, not retroactively scored; every row from R-11 on carries a real score.

## Granted rule exceptions
Carried forward from the build. Must match `_template/README.md` exactly.

| Rule ID | Where | Reason | Granted on |
|---|---|---|---|
| SR-1 | `app/js/marking-matrix.js` (1790 lines) | Grid rendering, keyboard navigation and totals-and-allocation are separable but entangled. Working and fully tested; splitting a 1790-line file purely for line count is the riskier move. See R-3. | 2026-08-29 (build closeout) |
| SR-1 | `app/js/local-store.js` (971 lines) | Mixes `ServerClient`, `LocalStore` and all 44 `INV-DM-*` invariant checks. Flagged at build time; splitting at the end of a build run was judged riskier than leaving it. See R-2. | 2026-08-29 (build closeout) |
| SR-1 | `app/js/bigidea-list.js` (873 lines) | List rendering plus the coverage write API. Same class of debt, lower risk. See R-4. | 2026-08-29 (build closeout) |

## Resume block
A cold agent picks this up by reading, in order:
1. This registry — the board, and which row is in flight.
2. `_template/README.md` — key decisions and their reasons, cross-boundary behaviour, navigation map.
3. `_test/` — the current state of whatever is being tried.
Do not reconstruct state from conversation history. This file is the state.

Run the checks from inside either bundle:
```
node --test tests/*.js
python3 -m unittest discover tests
```
Re-seed the fake data with `python3 _TestData/seed-test-fake.py`.

## Migration log
| Date | Event |
|---|---|
| 2026-09-01 | Entered Phase 4 cold on an existing build. `_template/` was already in place and confirmed as the permanent home. Verified before anything else: 105 files, 377 JS tests and 22 Python tests passing. |
| 2026-09-01 | `_test/` built from `_template/` (identical but for `unit.json`, `_ingest/curriculum.md`, one image, and the TEST banner/README notice) and seeded with wholly fictional data. Verified: 377 JS + 22 Python tests pass, server serves the app, `GET`/`PUT /api/unit` and the image routes work, path escape returns 404, no console errors, and a grep for real curriculum strings, student names or codes returns nothing. |
| 2026-09-01 | Documentation folded down into `_template/README.md` — decisions and their reasons, cross-boundary contracts, navigation map, granted rule exceptions — before the specs were deleted. |
| 2026-09-01 | `_Notes/` salvaged to `Memory/Long-Term/Coding/curriculum-preparation-design-notes.md` and registered in that store's `_index.yaml`. |
| 2026-09-01 | Design and build folders deleted after the above verification, on Luke's explicit instruction: `_Spikes/`, `_Builds/`, `_Mockups/`, `_Changes/`, `_Refactors/`, `_Archive/`, `_closeout/`, `_Notes/`. All were committed to git beforehand and remain recoverable from history. |
| 2026-09-01 | R-6 (lesson plan "studio grid" restyle) ported from `_test/` into `_template/` on Luke's approval. Verified: 377 JS + 22 Python tests pass in `_template/`; `diff -rq _template _test` afterward showed only the divergence allowlist (`unit.json`, `images/dragon-swatch.png`, `app/index.html`, `Start Unit.command`, `README.md`) — no unexplained drift. |
| 2026-09-01 | R-7 and R-8 (wishlist items #2 and #5) applied in `_test/` only, per Luke's request to pick up a couple of minor wishlist items. R-7 touches `app/js/app.js` and `app/css/app.css`; R-8 touches only `unit.json`'s fake lesson data. 377 JS + 22 Python tests pass; verified in-browser (completion tint on the right lesson buttons, correct 4×one-page/4×four-page split). Awaiting Luke's acceptance before porting either into `_template/`. |
| 2026-09-01 | Luke closed out wishlist items #2 and #4. R-7 (item #2) ported from `_test/` into `_template/`: 377 JS + 22 Python tests pass in `_template/`; `diff -rq _template _test` afterward showed only the divergence allowlist — no unexplained drift. Item #4 (verify auto-save) closed as R-9: audited every mutation site in `app/js/`, confirmed all reach `LocalStore.saveUnit()` via either the debounced `setData()` path or a direct immediate call, and live-confirmed a `PUT /api/unit` firing on a UI edit with the change landing in `unit.json` on disk. No bug found, no code changed. R-8 (item #5) stays in test, unaffected — Luke did not close that one out yet. |
| 2026-09-02 | Wishlist item #10 (Marking Matrix direct scoring + fuzzy-logic rebalancing) worked through with Luke in conversation across three rounds before any code was touched — scope narrowed to criteria only, the exact rebalance behaviour confirmed, print-per-mode behaviour confirmed. Built in `_test/` as R-10: `setMaxScore()` now live-rebalances its tier (reversing unintentional drift, not a decision, per Luke); new `renderCriteriaEditor()` (Edit Rubric — no student data); `renderClassGrid()` gained the 0/x greyed-hypothetical display and a Unit Total row; `renderSetupPrint()` now prints the resolved rubric instead of a blank handwriting sheet; `app.js` gained an Edit Rubric / Enter Marks toggle, each mode mounting its own print-only SVG pages. Two small extractions along the way: `openTextPrompt` moved out of `app.js` into a new shared `text-prompt.js`; a new `.print-only` CSS pair added beside the existing `.screen-only`. 378 JS + 22 Python tests pass (new test locks in the rebalance behaviour). Live-verified: editing a criterion rebalances its sibling and persists; Entry mode's score inputs are no longer permanently disabled (a pre-existing bug this row incidentally fixed — the whole class grid was unusable before, since `displayMode` never left its constructor default); a mark entered in Entry mode saves to disk; both modes' print-only pages are present, correctly hidden on screen, and carry the right content. Left in test, not ported — this one goes to Luke for review given its size and the corrected architectural decision it carries. |
| 2026-09-02 | `!AppDevelopment` Phase 4 gained the Refactor Health Check (a scored eight-question pass run per board row before each port); the refactor board here gained a `Health` column as a result. R-1 through R-10 were **not** retroactively scored — marked `—` — since they predate the check; R-10's own writeup is exactly the gap the check closes (dead code — `DISPLAY_MODES`/`setDisplayMode()`/`renderSetupPrint()`/`renderStudentDataPrint()` — that passed its tests but had zero live UI call sites, found only by incidental investigation). Every row from R-11 onward is scored. |

## 🎨 House style — SUBORDINATE (the print hard case)

`!HouseStyle` is an always-on core skill (`.claude/skills/!HouseStyle/`) and the default for every
rendered surface. This widget is **SUBORDINATE**, in a specific way — it is the strictest print
surface in the system:

- The **pure-SVG print plane owns geometry**: coordinates, page breaks, layout. The house style
  does not touch it.
- The house style governs the **HTML edit surface** beside it, and supplies the SVG plane's **ink
  and type values only**, so the two modes read as one product.
- **Resolve token values at build time for the SVG plane.** SVG text does not reliably inherit CSS
  custom properties through `<use>`, so `var()` at render time is not safe here.
- Never introduce a shadow, transition or wash into the SVG plane. It is a print surface that
  happens to be shown on screen, not a screen surface that happens to print.
- Test **A4 and Letter**. Letter is 18mm shorter, so height overflows there first.

Full rules: `.claude/skills/!HouseStyle/reference/print.md`.
