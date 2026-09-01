# CurriculumPreparation — Refactor Registry

kind: widget
template: `_template/`
test: `_test/`
last_updated: 2026-09-01

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

| # | Requested change | Status | Notes |
|---|---|---|---|
| R-1 | Build `curriculum-ingest` (paste plain curriculum text → structured node tree), or drop it permanently | requested | Excluded from the original build for want of real curriculum text; that text now exists in `_TestData/`. Without it every node tree is hand-entered through curriculum-editor, which does not scale. Recommendation at closeout: build it. |
| R-2 | Split `local-store.js` (971 lines) — pull `validateUnit()` out to a sibling `validate.js` | requested | SR-1 exception below. Lowest-risk cut; roughly halves the file. Must be its own task with its own test run — this is the most depended-on file in the app. |
| R-3 | Split `marking-matrix.js` (1790 lines) by concern: grid rendering / keyboard nav / totals-and-allocation | requested | SR-1 exception below. Do this the next time the matrix is changed for another reason, not on its own — it works and is fully tested. |
| R-4 | Split `bigidea-list.js` (873 lines) between list rendering and the coverage write API | requested | SR-1 exception below. Same class as R-2, lower risk. |
| R-5 | Reshape `computeGlyphSet`'s third parameter so it cannot be satisfied by `resolveDomain` itself | requested | Already caused one real silent outage (the crib sheet was dead on arrival until fixed). Rename to `resolveDomainForNode`, or take `nodes` directly and bind the closure internally. Hardening only — the one live call site is correct. |

Status values: `requested` · `in test` · `accepted` · `in template` · `rejected`.
A rejected change is reverted in `_test/` and left on the board — not silently dropped.

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
