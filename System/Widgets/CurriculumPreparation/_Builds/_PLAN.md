# _Builds — Folder Plan

> **STATUS (2026-08-29): 20 of 21 subtasks BUILT, plus a 22nd discovered late — `app-bootstrap`.**
> The widget runs. Suite: 341 JS tests + 21 Python tests, all passing. Completed specs and plans have
> moved to [`_Done/`](_Done/). `curriculum-ingest` is the only subtask not built (gate G-9 open).
>
> **`app-bootstrap` was NOT in this plan and that was the run's most costly omission.** The 21 subtasks
> decomposed the widget into parts and never specified the step that assembles them into a running app —
> so every build honoured its own spec while `index.html` imported nothing and the whole app rendered a
> blank page behind 330 passing tests. A future decomposition must name the integration step explicitly.
>
> Outstanding decisions, known gaps and unverified criteria: [`../_closeout/CLOSEOUT.md`](../_closeout/CLOSEOUT.md).
> Run history and preparation documents: [`../_Archive/2026-08-29-build-run/`](../_Archive/2026-08-29-build-run/).

Date: 2026-08-29 (rev 14)
Status: **21 of 21 subtasks specced** (6 in wave 1, 6 in wave 2, 4 in wave 3,
4 in wave 4, 1 in wave 5). Rev 14 closes the last gap by speccing
`curriculum-ingest` **provisionally** — see
[`curriculum-ingest.build.spec.md`](curriculum-ingest.build.spec.md). That
spec is written but contingent: it stands only if `Q-1` measures ingest
accuracy at or above ~60% and `G-9` closes as "build it". If `Q-1` fails,
the spec is retired and curriculum nodes are entered by hand via
`curriculum-editor`. Rev 14 also **removes the seven `.plan.md` files**
(`bundle-server`, `coverage-grid`, `document-shell`, `local-store`,
`marking-matrix`, `resources-page`, `unit-assessment-document`) at Luke's
instruction; they remain recoverable from git history. No build now carries
a `.plan.md` — execution plans are deferred across the board pending spec
review.

Rev 13 background follows. Rev 13 specs
`bundle-template` (wave 1, first — the skeleton every other wave-1 build
fills a slot in — see
[`bundle-template.build.spec.md`](bundle-template.build.spec.md)),
`newunit-skill` (wave 1, last — the `!NewUnit` Skillbank skill that stamps a
bundle from that skeleton — see
[`newunit-skill.build.spec.md`](newunit-skill.build.spec.md)), `csv-export`
(wave 4 — flattens `marking-matrix`'s already-computed scores to CSV,
needing a small coordinated addition to `bundle-server`'s endpoint surface —
see [`csv-export.build.spec.md`](csv-export.build.spec.md)), and
`traceability-links` (wave 5, the project's last build — the shared reverse
link index and clickable-code component wiring every already-built part
together — see
[`traceability-links.build.spec.md`](traceability-links.build.spec.md)).
Wave 1 is now fully specced end to end; waves 2–4 are each complete but for
`curriculum-ingest` (specced provisionally in rev 14); wave 5 (`traceability-links`) is specced for the first
time. The total subtask count is 21, unchanged since rev 11 — rev 13 only
moves rows from unspecced to specced, it adds none. No `.plan.md` yet for any
of the four rev-13 specs — deferred, matching `style-guide`'s own
convention, pending spec review. Rev 6 adds the widget's sixth part.
Rev 7 specs `style-guide` (FR-BND-9's build, deriving from AD-13c's settled
token table — see [`style-guide.build.spec.md`](style-guide.build.spec.md)).
Rev 8 specs `lesson-plan-document` — the last of the six parts to get a build
spec, closing a gap flagged since wave 3 was first cut (see
[`lesson-plan-document.build.spec.md`](lesson-plan-document.build.spec.md)).
Rev 9 completes the full-pass spec for `crib-sheet` (previously a provisional,
placeholder-text-only draft) — see
[`crib-sheet.build.spec.md`](crib-sheet.build.spec.md). Rev 10 specs
`bigidea-list` and `image-paste` — crib-sheet's own two named hard
dependencies, both previously unspecced despite three other builds already
citing their interfaces by name (see
[`bigidea-list.build.spec.md`](bigidea-list.build.spec.md) and
[`image-paste.build.spec.md`](image-paste.build.spec.md)). `bigidea-list`'s
draft required resolving a real conflict between `AD-44` and `AD-51` over
big-idea editing authority — recorded as an amendment to `AD-44` in the arch
spec — and surfaced a separate gap: the combined Lessons & Topics view
(`FR-TOP-8` onward) had no subtask row in this table at all. **Rev 11 closes
that gap**, adding `lessons-and-topics` (wave 3) — see
[`lessons-and-topics.build.spec.md`](lessons-and-topics.build.spec.md). Its
draft required a small follow-up addition to `bigidea-list.build.spec.md`
(`FR-BIB-17`, a shared lesson→topic resolution function) since both this
build and the already-specced `lesson-plan-document` need it. Rev 12 specs
the remaining wave-2/3 gaps Luke asked to close next: `curriculum-editor`
(node CRUD, and the domain-resolution function `bigidea-list`'s `FR-BIB-8`
already assumed existed), `arbor-tree` (the printed curriculum map itself
— see
[`curriculum-editor.build.spec.md`](curriculum-editor.build.spec.md) and
[`arbor-tree.build.spec.md`](arbor-tree.build.spec.md)), and
`lesson-plan-generator` (see
[`lesson-plan-generator.build.spec.md`](lesson-plan-generator.build.spec.md)),
which required a small addition to `lesson-plan-document.build.spec.md`
(`FR-LPB-13`, naming which build owns the `provenance: "edited"`
transition). Wave 3 is now fully specced end to end. No `.plan.md` yet for
any of the eight rev-9…12 specs — deferred, matching `style-guide`'s own
convention, pending spec review.
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
                    lessons-and-topics ◄────────────────────┤              ← wave 3, cross-cutting
                    (also needs bigidea-list, lesson-plan-document)
                    ┌───────────┴──────────┐               │
                    ▼                      ▼               │
              marking-matrix          crib-sheet ◄─────────┤              ← wave 4
                    ▼                                    │
               csv-export                  resources-page ◄┘              ← wave 4
                                │
                                ▼
              all parts ──→ traceability-links                            ← wave 5
```

Twelve edges deserve naming:

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
- **`arbor-tree` after `curriculum-editor`** — *(named, rev 12)* `arbor-tree`
  is a pure renderer over the node tree `curriculum-editor` owns, including
  that build's shared domain-resolution function (`FR-CEB-5`); there is
  nothing to lay out or glyph until nodes exist and that function is
  settled. Hard edge, the same "edit here, render there" split `AD-22`
  already draws for `coverage-grid`/`arbor-tree`.
- **`lesson-plan-generator` after `lesson-plan-document`** — *(named, rev
  12)* the generator produces `Lesson` records; `lesson-plan-document`
  defines the field shapes those records must satisfy (including the
  `provenance` transition it owns, `FR-LPB-13`) and the shared big-idea
  picker component (`AD-LPB-2`) the generator reuses rather than
  reimplements. Sequenced after, per that build's own §4.
- **`lessons-and-topics` after `bigidea-list`, `lesson-plan-document` and
  `unit-assessment-document`** — *(New, rev 10)* this cross-cutting view
  places lessons and assessments by resolving `bigidea-list`'s shared
  topic-resolution function against records `lesson-plan-document` and
  `unit-assessment-document` create, and it owns the lesson-reorder
  interaction `lesson-plan-document`'s own `AD-LPB-4` locates here. It was
  missing a subtask row entirely until this revision, despite `AD-38`,
  `AD-42`, `AD-44` and `AD-50` all being written about it and three other
  builds already citing it forward by name.

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
| 1 | [`bundle-template`](bundle-template.build.spec.md) | Fixture unit built | The skeleton every bundle is stamped from · FR-BND-2 |
| 1 | [`bundle-server`](bundle-server.build.spec.md) | `bundle-template` | Python: serve, **scope guard**, file I/O, port selection · FR-BND-3…6 |
| 1 | [`style-guide`](style-guide.build.spec.md) | `bundle-template` | Tokens, `variables.css`, StyleGuide page · FR-SG-1…6, FR-BND-9, CSS-1/2 |
| 1 | [`document-shell`](document-shell.build.spec.md) | `style-guide`; Q-2, Q-2b; G-2; schema frozen | Chassis for all six parts — portrait and landscape |
| 1 | [`local-store`](local-store.build.spec.md) | `bundle-server`; schema frozen | Thin JS client over the server's endpoints |
| 1 | [`newunit-skill`](newunit-skill.build.spec.md) | **all of wave 1** | `!NewUnit` in `System/Skillbank/Teaching/` · FR-BND-1 |
| 2 | [`curriculum-ingest`](curriculum-ingest.build.spec.md) *(Python)* | wave 1; G-9, G-6; Q-1 | FR-CUR-1…1f — best-effort, confidence-flagged |
| 2 | [`curriculum-editor`](curriculum-editor.build.spec.md) | `curriculum-ingest` *(or wave 1 if G-9 drops it)*, `local-store`, `style-guide` | FR-CUR-2 — node CRUD, domain resolution (FR-CEB-5) |
| 2 | [`arbor-tree`](arbor-tree.build.spec.md) | `curriculum-editor`, `bigidea-list`, `document-shell`, `local-store`, `style-guide`; Q-4 | FR-CUR-3, 5–13 — landscape, both axes, three independent coverage chips |
| 2 | [`bigidea-list`](bigidea-list.build.spec.md) | wave 1 | FR-BI-1…9, 15–20; FR-TOP-1…7 — big-idea list, topics, Big Idea Tree, shared glyph/topic-resolution functions |
| 2 | [`coverage-grid`](coverage-grid.build.spec.md) | `local-store`, `bigidea-list`; coordinate with `arbor-tree` | FR-CG-1…19 — taught **and** assessed coverage, three gap kinds |
| 2 | [`image-paste`](image-paste.build.spec.md) | `bundle-server`, `local-store`, `document-shell` | FR-IMG-1…7 |
| 3 | [`lesson-plan-document`](lesson-plan-document.build.spec.md) | `bigidea-list`, `image-paste` | FR-LP-1…8, 11–17 — portrait, 1–4 pages, numbered lesson index |
| 3 | [`lesson-plan-generator`](lesson-plan-generator.build.spec.md) | `lesson-plan-document`, `bigidea-list`, `curriculum-editor`; G-5 *(resolved: build them)* | FR-LP-9, 10 — template-driven draft, no model call |
| 3 | [`unit-assessment-document`](unit-assessment-document.build.spec.md) | `document-shell`, `local-store`, `bigidea-list`, `image-paste`; coordinate with `marking-matrix`, `traceability-links` | FR-UAB-1…13 — one final + many mini assessments, portrait |
| 3 | [`lessons-and-topics`](lessons-and-topics.build.spec.md) | `bigidea-list`, `document-shell`, `local-store`; coordinate with `lesson-plan-document`, `unit-assessment-document` | FR-LTB-1…17 — combined view, completion, scheduling, lesson reorder; cross-cutting, not a seventh part |
| 4 | [`marking-matrix`](marking-matrix.build.spec.md) | `document-shell`, `local-store`, `unit-assessment-document`; G-7 *(closed)* | FR-MMB-1…32 — **singular per unit**, class-grid entry, four totals modes, prints one page per student |
| 4 | [`csv-export`](csv-export.build.spec.md) | `marking-matrix`, `local-store`; needs a coordinated `bundle-server` addition | FR-MM-6 — full-unit scope only, no re-derivation |
| 4 | `crib-sheet` | `bigidea-list`, `image-paste`; G-8 | FR-CS-1…10 — 1–2pp hard cap, skills/knowledge halves |
| 4 | [`resources-page`](resources-page.build.spec.md) | `document-shell`, `local-store`, `image-paste`; coordinate with `traceability-links` | FR-RESB-1…15 — flat link/image/text list, portrait, unbounded pages |
| 5 | [`traceability-links`](traceability-links.build.spec.md) | all parts *(except `resources-page`)* | FR-TR-1…12 — incl. clickable codes → coverage view |

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
| `bundle-template` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `bundle-server` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `style-guide` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `document-shell` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `local-store` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `newunit-skill` | 1 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `curriculum-ingest` | 2 | ⊘ NOT BUILT — excluded from the 2026-08-29 run; G-9/Q-1 still open, needs real curriculum text from Luke. Spec remains in `_Builds/`. | — |
| `curriculum-editor` | 2 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `arbor-tree` | 2 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `bigidea-list` | 2 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `coverage-grid` | 2 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `image-paste` | 2 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `lesson-plan-document` | 3 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `lesson-plan-generator` | 3 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `unit-assessment-document` | 3 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `lessons-and-topics` | 3 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `marking-matrix` | 4 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `csv-export` | 4 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `crib-sheet` | 4 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `resources-page` | 4 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |
| `traceability-links` | 5 | ☑ Done (2026-08-29 build run) — spec+plan in [`_Done/`](_Done/) | — |

<!-- ☐ Open · ◐ Doing · ☑ Done · ⊘ Blocked · ○ Undefined -->
