# _Builds — Folder Plan

Date: 2026-08-20 (rev 7)
Status: 8 subtasks specced (4 in wave 1, 1 in wave 2, 1 in wave 3, 2 in wave 4);
12 identified and awaiting spike findings. Rev 6 adds the widget's sixth part.
Rev 7 specs `style-guide` (FR-BND-9's build, deriving from AD-13c's settled
token table — see [`style-guide.build.spec.md`](style-guide.build.spec.md)).
Scope: implement all subtasks in this folder. Each subtask = one
`<name>.build.spec.md` (+ one `<name>.plan.md`). Completed subtasks move
(spec + plan) to [`_Done/`](_Done/).

Project context: [`_Spikes/CurriculumPreparation/_PLAN.md`](../_Spikes/CurriculumPreparation/_PLAN.md).
Requirement numbers: [PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md).

## Decision gates (before any code)

| Gate | Blocks | Default / resolution |
|---|---|---|
| ~~**G-1 · Ingest mechanism**~~ | — | ✅ **CLOSED** — plain text → `_Ingest/` → Python digest, best-effort (AD-2, AD-16) |
| **G-2 · Document packaging** | `document-shell` | separate documents on a shared shell — **likely forced** by mixed orientation (Q-2b, AD-11) |
| ~~**G-4 · Reference browser**~~ | — | ✅ **CLOSED** — Chrome on macOS only (FR-SYS-9) |
| **G-5 · Do the generators earn their keep?** | `lesson-plan-generator` | build them |
| ~~**G-6 · Which curricula get bespoke profiles**~~ | `curriculum-ingest` | ✅ **CLOSED** — Victorian + generic only (AD-10, arch OQ-5) |
| ~~**G-7 · Matrix default orientation**~~ | `marking-matrix` | ✅ **CLOSED** — portrait (AD-11, arch OQ-6) |
| ~~**G-8 · Crib sheet default shape**~~ | `crib-sheet` | ✅ **CLOSED** — 1 page, portrait (AD-17, arch OQ-8) |
| **G-9 · Build the ingest at all?** | `curriculum-ingest` | build it — **unless Q-1's accuracy comes in below ~60%** (AD-16) |
| **Schema freeze** | both wave-1 builds | v1 as written in the data model spec |

## Dependency analysis

**Hard dependencies**

```
bundle-template                                                   ← the skeleton; first
      ├──→ bundle-server (Python)  ──→ local-store (JS client)
      └──→ style-guide             ──→ document-shell
                    │
                    └──→ newunit-skill   (last in wave 1)
                                │
      ┌─────────────────────────┼─────────────────────────┐
      ▼                         ▼                         ▼
curriculum-ingest (Python)  bigidea-list             image-paste          ← wave 2
      ▼                         │                         │
curriculum-editor               │                         │
      ▼                         │                         │
  arbor-tree ◄──────────────────┤                         │
                                ├──→ coverage-grid        │
                                ▼                         │
                    lesson-plan-document ◄────────────────┤              ← wave 3
                                │  → lesson-plan-generator │
                                │                          │
                unit-assessment-document ◄─────────────────┤              ← wave 3
                                │                          │
                    ┌───────────┴──────────┐               │
                    ▼                      ▼               │
              marking-matrix          crib-sheet ◄─────────┤              ← wave 4
                    ▼                                    │
               csv-export                  resources-page ◄┘              ← wave 4
                                │
                                ▼
              all parts ──→ traceability-links                            ← wave 5
```

Nine edges deserve naming:

- **`bundle-template` before everything.** Nothing can be built until there is a
  skeleton to build *into*. Small — folders, an empty `unit.json`, a launcher —
  but first.
- **`newunit-skill` last in wave 1.** A generator with nothing complete to copy
  produces broken bundles.
- **`bigidea-list` before `lesson-plan-document`** — FR-BI-4 makes the binding
  mandatory (INV-DM-15), so a lesson literally cannot be a valid record before
  the list exists. Hard edge.
- **`image-paste` before `lesson-plan-document` and `crib-sheet`** — both carry
  images; retrofitting placement into a finished layout is the expensive path.
- **`crib-sheet` after `bigidea-list`** — it is *generated from* the list
  (FR-CS-2, AD-17).
- **`bigidea-list` before `unit-assessment-document`** — the Unit Assessment
  carries the same mandatory big-idea binding a lesson does (FR-UA-5), so it
  cannot be a valid record before the list exists. Hard edge, mirroring the
  lesson-plan one above.
- **`resources-page` depends on almost nothing** — it needs the shell, the
  store and image paste, and no other part. That is AD-26 showing up in the
  dependency graph: the one deliberately unstructured part is also the one
  that can be built at any time. It is **excluded from `traceability-links`'
  "all parts" dependency** — resources carry no links to trace, by design.
- **`coverage-grid` after `bigidea-list`** — the grid edits `BigIdea.coverage[]`
  (FR-BI-7, FR-CG-1); there is nothing to map until the ideas exist. It
  coordinates with `arbor-tree`, which renders the same links as printed chips
  (FR-CUR-10) — shared vocabulary, so sequence them rather than interleave.
- **`marking-matrix` after `unit-assessment-document`** — *(REWRITTEN, rev 5)*
  the matrix is now **singular per unit** and scores against the assessments,
  not against individual lessons (AD-24, INV-DM-6). A criterion binds to the
  final assessment and/or minis, so those must exist and be addressable first.
  The old per-lesson edge (`marking-matrix` after `lesson-plan-document`,
  mirroring the lesson's tiers) is **retired** — per-lesson marking was removed
  deliberately and must not be reintroduced.

Two builds are Python (AD-13): `bundle-server`, which everything depends on,
and `curriculum-ingest`, which **nothing depends on at runtime**. If G-9 drops
the ingest, every other build is unaffected — that independence is what the
strict tier boundary buys.

**Soft couplings — sequence, do not interleave**

- **Unit-folder schema** — settled once before wave 1; `document-shell` and
  `local-store` both consume it, neither owns it alone.
- **Tier constants** — defined once in `document-shell` (FR-DS-6); every other
  build imports them.
- **Print/`@page` CSS, both orientations** — `document-shell` only. Later
  builds request a portrait or landscape page and draw into it (AD-11).
- **Curriculum-neutral vocabulary** — no build names a curriculum in a field,
  an enum value or a rendered string (INV-DM-10, AD-10). *A field called
  `vcaaCode` is a bug.*
- **Forward reference fields** — waves 2–4 must store `lesson.nodeIds`,
  `lesson.bigIdeaId`, `lesson.assessmentLink`, `bigIdea.coverage[]`,
  `unitAssessment.bigIdeaId`, `unitAssessment.coverage[]`,
  `miniAssessment.nodeIds[]`, `matrix.studentId`,
  `cribSheet.sections[].bigIdeaId` and every `ImageRef` from the start.
  *(REWRITTEN rev 5 — `matrix.lessonId` is retired with per-lesson marking.)* `traceability-links` derives everything from
  them and can invent nothing. **The one coupling that cannot be fixed later.**
- **Reverse-link index** — `traceability-links` alone, rebuilt on load
  (INV-DM-12).
- **`images/` and the manifest** — `image-paste` alone writes files and
  manifest entries. Everything else holds `ImageRef`s only.
- **Python/JS tier boundary** — absolute (AD-13). **Python owns all filesystem
  I/O; the browser never touches a file directly.** Everything goes through
  `bundle-server`.
- **The bundle skeleton** — `bundle-template` owns the folder layout. Later
  builds fill slots; none invents a top-level folder without amending it.
- **Server endpoint shape** — `bundle-server` owns it, `local-store` is its only
  client. Settle it once, in wave 1.
- **CSS tokens** — `style-guide` owns `variables.css`. No other file hardcodes a
  value that belongs in a token (CSS-2).
- **Vibe Coding Rules** — binding on every file (AD-13a). A build that ships a
  dependency, a framework, or an `!important` is not done.
- **Verbatim curriculum fields** — `code` and `title` are never normalised
  (INV-DM-2).

## Order of work

| Wave | Subtask | Prereqs | Note |
|---|---|---|---|
| 1 | `bundle-template` | Fixture unit built | The skeleton every bundle is stamped from · FR-BND-2 |
| 1 | [`bundle-server`](bundle-server.build.spec.md) | `bundle-template` | Python: serve, **scope guard**, file I/O, port selection · FR-BND-3…6 |
| 1 | [`style-guide`](style-guide.build.spec.md) | `bundle-template` | Tokens, `variables.css`, StyleGuide page · FR-SG-1…6, FR-BND-9, CSS-1/2 |
| 1 | [`document-shell`](document-shell.build.spec.md) | `style-guide`; Q-2, Q-2b; G-2; schema frozen | Chassis for all six parts — portrait and landscape |
| 1 | [`local-store`](local-store.build.spec.md) | `bundle-server`; schema frozen | Thin JS client over the server's endpoints |
| 1 | `newunit-skill` | **all of wave 1** | `!NewUnit` in `System/Skillbank/Teaching/` · FR-BND-1 |
| 2 | `curriculum-ingest` *(Python)* | wave 1; G-9, G-6; Q-1 | FR-CUR-1…1f — best-effort, confidence-flagged |
| 2 | `curriculum-editor` | `curriculum-ingest` *(or wave 1 if G-9 drops it)* | FR-CUR-2 |
| 2 | `arbor-tree` | `curriculum-editor`, `bigidea-list`; Q-4 | FR-CUR-3, 6, 7, 8 — landscape, both axes |
| 2 | `bigidea-list` | wave 1 | FR-BI-1…10 |
| 2 | [`coverage-grid`](coverage-grid.build.spec.md) | `local-store`, `bigidea-list`; coordinate with `arbor-tree` | FR-CG-1…19 — taught **and** assessed coverage, three gap kinds |
| 2 | `image-paste` | wave 1 | FR-IMG-1…7 |
| 3 | `lesson-plan-document` | `bigidea-list`, `image-paste` | FR-LP-1…8, 11–17 — portrait, 1–4 pages, numbered lesson index |
| 3 | `lesson-plan-generator` | `lesson-plan-document`; G-5 | FR-LP-9, 10 |
| 3 | [`unit-assessment-document`](unit-assessment-document.build.spec.md) | `document-shell`, `local-store`, `bigidea-list`, `image-paste`; coordinate with `marking-matrix`, `traceability-links` | FR-UAB-1…13 — one final + many mini assessments, portrait |
| 4 | [`marking-matrix`](marking-matrix.build.spec.md) | `document-shell`, `local-store`, `unit-assessment-document`; G-7 *(closed)* | FR-MMB-1…32 — **singular per unit**, class-grid entry, four totals modes, prints one page per student |
| 4 | `csv-export` | `marking-matrix` | FR-MM-6 |
| 4 | `crib-sheet` | `bigidea-list`, `image-paste`; G-8 | FR-CS-1…10 — 1–2pp hard cap, skills/knowledge halves |
| 4 | [`resources-page`](resources-page.build.spec.md) | `document-shell`, `local-store`, `image-paste`; coordinate with `traceability-links` | FR-RESB-1…15 — flat link/image/text list, portrait, unbounded pages |
| 5 | `traceability-links` | all parts *(except `resources-page`)* | FR-TR-1…12 — incl. clickable codes → coverage view |

Waves 2–5 are **deliberately unspecced** until the spike answers Q-1, Q-1b,
Q-2, Q-2b, Q-3b, Q-4, Q-5 and Q-6. Their FR numbers are already fixed in the
PRD; only the HOW is open.

**Only `curriculum-ingest` waits on Luke.** Q-2, Q-2b, Q-3b, Q-4, Q-5, Q-6, and
Q-1b (sourced from two *other* real curricula, not Year 10 History) all run
against a synthetic fixture unit and are agent-runnable now — see the
[prerequisites spec's correction](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md#%EF%B8%8F-correction-rev-4-second-pass).
Only **Q-1** — the ingest's accuracy on real, messy text — genuinely needs the
Year 10 History curriculum text Luke is sourcing. `curriculum-editor`,
`arbor-tree`, `bigidea-list` and `image-paste` do not wait on it.

## Completion protocol

A subtask is done only when its `.plan.md` Verification passes in full. Then:
`git mv` its spec **and** plan into [`_Done/`](_Done/); strike its row in the
tracking table below and annotate with the completing commit; re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md)
and note anything newly unblocked.

## Tracking

| Subtask | Wave | Status | Commit |
|---|---|---|---|
| `bundle-template` | 1 | ○ Not specced | — |
| `bundle-server` | 1 | ☐ Specced, not started | — |
| `style-guide` | 1 | ☐ Specced, not started | — |
| `document-shell` | 1 | ☐ Specced, not started | — |
| `local-store` | 1 | ☐ Specced, not started | — |
| `newunit-skill` | 1 | ○ Not specced | — |
| `curriculum-ingest` | 2 | ○ Not specced — **may be dropped (G-9)** | — |
| `curriculum-editor` | 2 | ○ Not specced | — |
| `arbor-tree` | 2 | ○ Not specced | — |
| `bigidea-list` | 2 | ○ Not specced | — |
| `coverage-grid` | 2 | ☐ Specced, not started | — |
| `image-paste` | 2 | ○ Not specced | — |
| `lesson-plan-document` | 3 | ○ Not specced | — |
| `lesson-plan-generator` | 3 | ○ Not specced | — |
| `unit-assessment-document` | 3 | ☐ Specced, not started | — |
| `marking-matrix` | 4 | ☐ Specced, not started | — |
| `csv-export` | 4 | ○ Not specced | — |
| `crib-sheet` | 4 | ○ Not specced | — |
| `resources-page` | 4 | ☐ Specced, not started | — |
| `traceability-links` | 5 | ○ Not specced | — |

<!-- ☐ Open · ◐ Doing · ☑ Done · ⊘ Blocked · ○ Undefined -->
