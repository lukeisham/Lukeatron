# CurriculumPreparation — Project Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-17 (rev 4) |
| **Status** | Draft — gated on [prerequisites](CurriculumPreparation.prerequisites.spec.md) (gate CLOSED) |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

Scope: take Curriculum Preparation from spec to a working offline toolkit —
curriculum map, big-idea list, lesson plans, crib sheet, marking matrices. This
plan covers the spike and the waves it unlocks; per-subtask HOW lives in each
subtask's own `.plan.md`.

---

## 1. Decision gates (before any code)

Nine gates, listed in full in the
[prerequisites spec §2](CurriculumPreparation.prerequisites.spec.md#2-choose-one--decision-gates-decided-before-coding).

**Closed by Luke in rev 3:** **G-1** ingest mechanism (plain text → `_ingest/`
→ Python digest, best-effort) · **G-4** reference browser (Chrome only).

**Settled by Luke in rev 4:** persistence — *"I'm happy for a tiny mini server
to be generated each time."* That **struck Q-3 from the spike entirely** (it was
a blocking prerequisite) and simplified `local-store` from a File System Access
client into a thin fetch wrapper.

**Closed by Luke in the rev-4 follow-up:** the rev-4 spec set is **approved**,
and four more gates are closed — **G-3** first real unit (**"Grammar
Revision"**) · **G-6** which curricula (Victorian + generic only) · **G-7**
matrix default orientation (portrait) · **G-8** crib sheet default shape (1
page, portrait).

**Open — and none of these three is Luke's to pick:** **G-2** packaging,
settled by Q-2b (mixed-orientation printing) · **G-5** whether the generators
earn their keep, settled by Q-5's ergonomics test · **G-9** whether the ingest
is worth building at all, settled by Q-1's measured accuracy number.

**One loose end on G-3, and it's narrower than it first looked.** Naming the
unit answers *which* unit; **Q-1 alone** still needs the actual Grammar
Revision curriculum text sourced and in hand — see the
[prerequisites spec's correction](CurriculumPreparation.prerequisites.spec.md#%EF%B8%8F-correction-rev-4-second-pass).
That correction fixed an over-broad gate: building structure, code and
framework never needed real curriculum content, and everything below except
Q-1 now runs against a synthetic **fixture unit** instead. Only Q-1 and gate
G-9 wait on the real text.

---

## 2. Dependency analysis

### Hard dependency graph

```
        Luke approves specs
                 │
                 ▼
       Agent builds the fixture unit (no Luke, no real content)
                 │
                 ▼
        Q-2, Q-2b, Q-3b, Q-4 measured against the fixture     ← runs now,
        (Q-1b: agent-sourced from OTHER real curricula,          not gated on
         independent of Year 10 History)                        Year 10 History
                 │
                 ▼
  bundle-template                                                            ← wave 1
  (the skeleton every bundle is stamped from)
     │
     ├──→ bundle-server (Python: serve, scope guard, file I/O)
     ├──→ style-guide  (tokens, variables.css, patterns)
     │         │
     ▼         ▼
  document-shell               ∥                          local-store
  (portrait + landscape)                            (thin JS client → server)
     │                                                           │
     └───────────────────────────┬───────────────────────────────┘
                                 │
                        newunit-skill  (last in wave 1 — needs a complete template)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  curriculum-ingest        bigidea-list             image-paste             ← wave 2
      (Python)                   │                        │                  (3 parallel
        ▼                        │                        │                   tracks)
  curriculum-editor              │                        │
        ▼                        │                        │
    arbor-tree ◄─────────────────┤                        │
   (landscape; renders           │                        │
    BOTH axes)                   │                        │
                                 ▼                        │
                    lesson-plan-document ◄────────────────┤                  ← wave 3
                       (portrait)  │                      │
                                   ▼                      │
                        lesson-plan-generator             │
                                   │                      │
              ┌────────────────────┴───────┐              │
              ▼                            ▼              │
        marking-matrix              crib-sheet ◄──────────┘                  ← wave 4
              │                      (1–2pp, either)
              ▼
         csv-export
                                   │
                                   ▼
                        traceability-links                                   ← wave 5
                        (needs every part)
```

### The edges that actually constrain

- **`bundle-template` → everything.** Nothing can be built until there is a
  skeleton to build it *into*. It is small — folders, an empty `unit.json`, a
  launcher — but it is first, because every other wave-1 build fills a slot in
  it.
- **`newunit-skill` → last in wave 1.** A generator with nothing complete to
  copy is a generator that produces broken bundles.
- **`bundle-server` before `local-store`.** The JS store is now a thin client
  over the server's endpoints (AD-5); the endpoint shape has to exist first.
- **`bigidea-list` → `lesson-plan-document`** is a *hard* edge, from rev 3.
  FR-BI-4 makes every lesson's big-idea binding mandatory (INV-DM-15), so a
  lesson cannot exist before the list does. Not a preference — a lesson with no
  big idea is an invalid record.
- **`image-paste` → `lesson-plan-document`, `crib-sheet`.** Both carry images
  (FR-LP-13, FR-CS-6). Building them first means retrofitting image placement
  into finished layouts.
- **`crib-sheet` → `bigidea-list`.** The crib sheet is *generated from* the
  big-idea list (FR-CS-2, AD-17); with no list there is nothing to generate.
- **`marking-matrix` → `lesson-plan-document`.** The matrix mirrors the
  lesson's tiers (FR-MM-1); building it earlier means inventing a tier
  structure the lesson later contradicts.
- **`traceability-links` → everything.** It lands last and is specced now
  precisely so the earlier waves store what it will read.
- **`document-shell` needs both orientations from the start** (AD-11). Adding
  landscape later would mean revisiting every page-geometry assumption in the
  tree renderer.
- **`curriculum-ingest` is optional; `bundle-server` is not.** Both are Python
  (AD-13), but nothing depends on the ingest at runtime — so if G-9 drops it,
  every other build is unaffected. That independence is exactly what the strict
  tier boundary buys.

### Soft couplings — sequence, don't interleave

| Coupling | Rule |
|---|---|
| Unit-folder schema | Settled **once** before wave 1. `document-shell` and `local-store` both read it; neither evolves it unilaterally. |
| The bundle skeleton | `bundle-template` owns the folder layout. Later builds fill slots in it; none invents a new top-level folder without amending the template. |
| Server endpoint shape | `bundle-server` owns it; `local-store` is its only client. Settle it once, in wave 1, or wave 2 spends its time redesigning it. |
| CSS tokens | `style-guide` owns `variables.css`. No other file hardcodes a value that belongs in a token (CSS-2). |
| Vibe Coding Rules | Binding on every file. A build that ships a dependency, a framework, or a `!important` is not done (AD-13a). |
| Tier constants | One definition, one file. Every wave imports it (INV-DM-1, AD-7). |
| Print/`@page` CSS, both orientations | `document-shell` alone. Later builds request a portrait or landscape page and draw into it (AD-11). |
| Curriculum-neutral vocabulary | No build names a curriculum in a field, enum or rendered string (INV-DM-10, AD-10). |
| Forward reference fields | Waves 2–4 must **store** `lesson.nodeIds`, `lesson.bigIdeaId`, `lesson.assessmentLink`, `bigIdea.coverage[]`, `unitAssessment.bigIdeaId`, `unitAssessment.coverage[]`, `miniAssessment.nodeIds[]`, `matrix.studentId`, `cribSheet.sections[].bigIdeaId`, every `ImageRef`. **The one coupling that cannot be fixed later.** *(REWRITTEN rev 5 — `matrix.lessonId` is retired with per-lesson marking; the coverage and assessment fields are new.)* |
| Reverse-link index | `traceability-links` alone, derived on load (INV-DM-12). |
| The `images/` folder and manifest | `image-paste` alone writes files and manifest entries. Other builds hold `ImageRef`s and nothing more. |
| Python/JS tier boundary | Absolute (AD-13). **Python owns all filesystem I/O; the browser never touches a file directly.** Everything goes through the server. |
| `System/Widgets/Parser/_shell/` | Read-only reference. Never imported from, never edited. |

### Parallelisation

Wave 1's two builds are genuinely parallel once the schema is settled. **Wave 2
has three independent tracks** — the curriculum chain, `bigidea-list`, and
`image-paste` — which touch different parts of the schema and can proceed in
any order. Waves 3–5 are sequential.

---

## 3. Order of work

| Wave | Subtask | Prereqs | Note |
|---|---|---|---|
| **0** | Fixture unit + Q-2, Q-2b, Q-3b, Q-4, Q-5, Q-6 | Luke approves specs | **Agent-run, needs no real content.** 3 sessions, timeboxed. May re-cut wave 1 below. |
| **0** | Q-1b — two other curricula mapped on paper | Luke approves specs | **Agent-sourced**, independent of Year 10 History |
| **0** | **Q-1 — ingest accuracy, measured** | The real Year 10 History curriculum text (Luke) | **The one item that waits on Luke.** Blocks only `curriculum-ingest` (wave 2) and gate G-9 — see the [prerequisites correction](CurriculumPreparation.prerequisites.spec.md#%EF%B8%8F-correction-rev-4-second-pass) |
| **1** | `bundle-template` | Fixture unit built | The skeleton every bundle is stamped from · FR-BND-2 · *spec pending* |
| **1** | [`bundle-server`](../../_Builds/bundle-server.build.spec.md) | `bundle-template` | Python: serve, scope guard, file I/O, port selection · FR-BND-3…6 |
| **1** | `style-guide` | `bundle-template` | Tokens, `variables.css`, patterns · FR-BND-9 · *spec pending* |
| **1** | [`document-shell`](../../_Builds/document-shell.build.spec.md) | `style-guide`; G-2; schema settled | Chassis for all five parts — portrait and landscape |
| **1** | [`local-store`](../../_Builds/local-store.build.spec.md) | `bundle-server`; schema settled | Thin JS client over the server's endpoints |
| **1** | `newunit-skill` | **all of wave 1** | `!NewUnit` in `System/Skillbank/Teaching/` · FR-BND-1 · *spec pending* |
| **2** | `curriculum-ingest` *(Python)* | Wave 1; **G-9**, G-6; Q-1 | FR-CUR-1…1f — best-effort digest with confidence flags · *spec pending* |
| **2** | `curriculum-editor` | `curriculum-ingest` *(or wave 1, if G-9 drops ingest)* | FR-CUR-2 — first-class workflow, not a repair hatch · *spec pending* |
| **2** | `arbor-tree` | `curriculum-editor`; `bigidea-list`; Q-4 | FR-CUR-3, 6, 7, 8 — landscape, renders **both axes** · *spec pending* |
| **2** | `bigidea-list` | Wave 1 | FR-BI-1…8 — two-level list, mandatory lesson binding · *spec pending* |
| **2** | `image-paste` | Wave 1 (esp. `local-store`) | FR-IMG-1…7 — clipboard → `images/`, manifest, placeholders · *spec pending* |
| **3** | `lesson-plan-document` | `bigidea-list`, `image-paste` | FR-LP-1…8, 11, 12, 13 — 4-page portrait · *spec pending* |
| **3** | `lesson-plan-generator` | `lesson-plan-document`; G-5 | FR-LP-9, 10 · *spec pending, may be dropped* |
| **4** | `marking-matrix` | `lesson-plan-document`; G-7 | FR-MM-1…5, 7, 8 — either orientation · *spec pending* |
| **4** | `csv-export` | `marking-matrix` | FR-MM-6 · *spec pending* |
| **4** | `crib-sheet` | `bigidea-list`, `image-paste`; G-8 | FR-CS-1…7 — 1–2pp, hard cap, **singular** · *spec pending* |
| **5** | `traceability-links` | all parts | FR-TR-1…8 — navigation, printed citations, gap display · *spec pending* |

**Why waves 2–5 stay unspecced.** Their shape depends on answers the spike does
not have — ingest accuracy (Q-1), whether the model generalises (Q-1b), print
behaviour (Q-2, Q-2b), bundle portability (Q-3b), tree legibility with two axes
on one landscape page (Q-4), whether the generators pay (Q-5), image round-trip
quality (Q-6). Writing them now would be fiction. Their FR numbers are already
fixed in the [PRD](CurriculumPreparation-prd.spec.md); only the HOW is open.

**But only Q-1 needs Luke.** Everything else in that list runs against the
fixture unit and can proceed today (Q-1b is agent-sourced from two *other*
real curricula, not Year 10 History). `curriculum-ingest` is the only wave-2
build that waits on the real text — `curriculum-editor`, `arbor-tree`,
`bigidea-list` and `image-paste` do not.

**But naming `traceability-links` now is load-bearing**, and more so in rev 3
than before: there are now *two* mandatory forward references per lesson
(`nodeIds` and `bigIdeaId`), plus crib-sheet sections and image refs. A wave 2–4
that ships without them makes wave 5 impossible, and no amount of later work
recovers a link that was never recorded.

---

## 4. Completion protocol

A subtask is done only when its `.plan.md` Verification passes in full. Then:

1. `git mv` its spec **and** plan into the folder's `_Done/`.
2. Update [`_Builds/_PLAN.md`](../../_Builds/_PLAN.md) — strike the row,
   annotate with the completing commit.
3. Re-check [the prerequisites gate](CurriculumPreparation.prerequisites.spec.md)
   and note anything newly unblocked.
4. Update this plan's tracking table.

**Spike exit** additionally: append findings to
[project spec §8](CurriculumPreparation.project.spec.md#8-findings) with
numbers, file the go/no-go, file any follow-on requests, and move the spike
folder to [`_Spikes/_Done/`](../_Done/) — including if the answer is *no*.

---

## 5. Tracking

| Subtask | Wave | Status | Completed |
|---|---|---|---|
| Fixture unit + Q-2/Q-2b/Q-3b/Q-4/Q-5/Q-6 | 0 | ☐ Open — agent-run, unblocked | — |
| Q-1b (two other real curricula, agent-sourced) | 0 | ☐ Open — unblocked | — |
| Q-1 (ingest accuracy) | 0 | ⊘ Blocked — awaiting Year 10 History curriculum text | — |
| `bundle-template` | 1 | ○ Not specced | — |
| `bundle-server` | 1 | ☐ Specced, not started | — |
| `style-guide` | 1 | ○ Not specced | — |
| `document-shell` | 1 | ☐ Specced, not started | — |
| `local-store` | 1 | ☐ Specced, not started | — |
| `newunit-skill` | 1 | ○ Not specced | — |
| `curriculum-ingest` | 2 | ○ Not specced — **and may be dropped (G-9)** | — |
| `curriculum-editor` | 2 | ○ Not specced | — |
| `arbor-tree` | 2 | ○ Not specced | — |
| `bigidea-list` | 2 | ○ Not specced | — |
| `image-paste` | 2 | ○ Not specced | — |
| `lesson-plan-document` | 3 | ○ Not specced | — |
| `lesson-plan-generator` | 3 | ○ Not specced | — |
| `marking-matrix` | 4 | ○ Not specced | — |
| `csv-export` | 4 | ○ Not specced | — |
| `crib-sheet` | 4 | ○ Not specced | — |
| `traceability-links` | 5 | ○ Not specced | — |

<!-- ☐ Open · ◐ Doing · ☑ Done · ⊘ Blocked · ○ Undefined -->
