# CurriculumPreparation — Prerequisites

| Field | Value |
|---|---|
| **Type** | Prerequisites (dependency gate) |
| **Date** | 2026-08-19 (rev 7 — fixture extended for the sixth part, coverage grid, matrix rework, clickable codes, conditional lesson-plan pagination, and the matrix's grid-add + display-mode toggle; first test unit is Year 10 History) |
| **Status** | Draft — **gate mostly OPEN; see correction below** |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

What must exist before work on this project starts, in four buckets.

---

## ⚠️ Correction (rev 4, second pass)

The original version of this gate sequenced **everything** — all of wave 1,
most of wave 2 — behind Q-1 and Q-1b, on the reasoning that the spike "needs a
real unit to test against." Luke caught the error: **building structure, code,
and framework does not need real curriculum content.** Only one thing in the
entire spike does.

**The one genuine content-dependency:** [Q-1](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)
measures how accurately the ingest parser handles **real, messy, unedited**
curriculum text. That number is the whole point of the question — a text
written to be clean and well-structured (which any text I fabricate would
be, even trying not to) would inflate the score and make the measurement
meaningless. This is the *only* place in the project where fabricated content
actively defeats the purpose, rather than merely being a slightly weaker
stand-in.

**Everything else uses a fixture unit — deliberately fabricated, and better
for it.** A fixture can be sized and shaped to order (realistic depth/breadth,
edge cases on demand, predictable content for repeatable tests) in a way real
data can't. [`document-shell`](../../_Builds/document-shell.build.spec.md)'s
build spec already plans exactly this ("Build a 4-page demo document using
**fixture content only**" — FR-DS-8, the shell is content-blind by design).
The fixture unit described below extends that same pattern to the rest of the
spike and to waves 1–5's builds.

**Q-1b needs real content too** (two *other* curricula, to test whether the
model generalises — AD-10), but not Luke's Year 10 History text specifically,
and not from Luke at all: public curriculum documents from another
jurisdiction are enough, and sourcing them is agent work, not a Luke
dependency.

---

## ⚠️ Rev 5 addendum — fifth part, coverage grid, matrix rework

Luke's fourth review changed the first test unit, added a fifth part, and
reworked the marking matrix's cardinality. None of it changes *whether*
prerequisite 2 (the fixture unit) blocks the same things it always
blocked — it only changes what the fixture must now contain:

- **G-3 reopened and re-closed**: the first real test unit is now **"Year 10
  History"** (Victorian History, Victorian Curriculum F–10 **Version 2.0**,
  Levels 9–10 band), replacing the earlier "Grammar Revision" (Victorian
  English, year level TBC). Scope is unchanged — it still blocks **only**
  Q-1 and gate G-9, nothing else (see §1a and the gate summary below, both
  updated).
- **The fixture unit (§2a) is extended**, not replaced, to exercise
  coverage-qualified big-idea links, the new Unit Assessment part, and the
  now-singular marking matrix. **The fixture has not been built yet, so this
  is a cheap change** — nothing downstream has to be redone.
- **Three new builds are filed** against the existing wave structure:
  `coverage-grid` (wave 2), `unit-assessment-document` (wave 3),
  `marking-matrix` (wave 4, superseding the matrix shape assumed in earlier
  revisions).

---

## ⚠️ Rev 6 addendum — sixth part, taught+assessed coverage, matrix/crib-sheet/lesson-number changes

Luke's fifth review added a sixth part (the resources page) and reworked the
coverage grid, mini-assessment coverage, the marking matrix's presentation,
the crib sheet's halves, and lesson numbering. As with rev 5, none of it
changes *whether* prerequisite 2 (the fixture unit) blocks the same things it
always blocked — only what the fixture must now contain, extended in §2a
below: a resources page with one item of each kind, mini assessments with
qualified `coverage[]` including a `partial`, a crib sheet with sections in
both halves, contiguously numbered lessons, and curriculum nodes arranged so
all three coverage-grid gap kinds (taught-not-assessed / assessed-not-taught
/ neither) occur. **Still not yet built**, so this remained a cheap change.

## ⚠️ Rev 7 addendum — clickable codes, conditional lesson-plan pages, matrix grid-add + display modes

Luke's sixth review added three more decisions and asked for one further
fixture extension. None of the three decisions (clickable codes, AD-32;
conditional tier pages, AD-33; comments-vs-UI-text, AD-34) touches the
fixture directly — they are rendering and documentation rules, not data the
fixture needs to carry differently. The fourth item, the marking matrix's
grid-add and four-mode display toggle, **does** need fixture support: §2a
below adds a requirement for at least one lesson with **no** tiered content
(the 1-page case) alongside the existing all-three-tiers lesson (the 4-page
case), and matrix criteria with **varied maxima**, so the four display modes
produce visibly different numbers rather than numbers that coincide by
arithmetic accident — the exact failure mode that let an earlier "Part of"
misreading go unnoticed until a worked example caught it. **The fixture
remains unbuilt**, so this, too, is a cheap change.

## 1. Required first — with build order

| Order | Prerequisite | Owner | Why it blocks | Status |
|---|---|---|---|---|
| 1 | **Luke reviews and approves** the rev-4 spec set (including this correction) | Luke | Specs before code (skill rule); AD-1…AD-19 are all still reversible | ✅ met |
| 2 | **A fixture unit is constructed** — synthetic, realistically sized/shaped, covering the data model's full shape (nodes, big ideas, a lesson, a matrix, an image ref) | **Agent** | Everything below reads or renders it. Not gated on anyone — this is the corrected step | ⊘ pending |
| 3 | **Q-2 answered** — A4 print measured, against the fixture | Agent | AD-3 and AD-4 both rest on it | ⊘ pending |
| 3b | **Q-2b answered** — mixed-orientation print test, against the fixture | Agent | Decides gate G-2 outright (AD-11) | ⊘ pending |
| 3c | **Q-3b answered** — a generated bundle (holding the fixture) runs standalone from a copied folder, another disk, a path with spaces | Agent | AD-18's whole value rests on it | ⊘ pending |
| 4 | `bundle-template` built | Agent | Every other wave-1 build fills a slot in it | ⊘ pending |
| 5 | [`bundle-server`](../../_Builds/bundle-server.build.spec.md) + `style-guide` built and verified | Agent | Everything above the skeleton depends on one or the other | ⊘ pending |
| 6 | [`document-shell`](../../_Builds/document-shell.build.spec.md) + [`local-store`](../../_Builds/local-store.build.spec.md) built and verified, against the fixture | Agent | All six parts render and persist through them | ⊘ pending |
| 7 | `newunit-skill` built | Agent | Nothing to generate until the template is complete | ⊘ pending |

Order: **1 → 2 → (3 · 3b · 3c) → 4 → 5 → 6 → 7.** None of rows 2–7 names
Luke as owner. **The whole of wave 1 is now agent-runnable, unblocked, today.**

**Q-1 and G-9 sit outside this table on purpose** — they gate `curriculum-ingest`
specifically (wave 2), not wave 1, and not the fixture-based work above. See
§1a.

**Q-3 was struck in rev 4.** It asked whether the File System Access API could
give a workable unit folder — a blocking prerequisite, because persistence and
image paste both rested on it. Luke's *"I'm happy for a tiny mini server to be
generated each time"* removed the question rather than answering it (AD-5).
**Q-3b replaces it** with a different and more important one: does a generated
bundle actually run *standalone*? That is what AD-18's whole value rests on.

## 1a. What actually still needs Luke

Only two things in the whole project wait on Luke, and both are narrow:

| Item | Blocks | Status |
|---|---|---|
| **The real Year 10 History curriculum text** | Q-1's accuracy measurement and gate G-9 (build `curriculum-ingest` at all) — **nothing else** | ⊘ pending |
| Optional: a real lesson plan / crib sheet of Luke's, as a fidelity target | Nothing hard — an optional §3 item, sharpens Q-5's judgement | optional |

`curriculum-ingest` itself does **not** need to wait — its heuristics (indentation,
numbering, code patterns, blank-line grouping) can be written now from general
knowledge of how curriculum documents are typically formatted, and run against
the fixture for a first-pass smoke test. Only the **accuracy number** — the
thing G-9 decides on — needs the real text.

---

## 2. Choose-one — decision gates, decided before coding

| Gate | Options | Resolution | Decided by |
|---|---|---|---|
| ~~**G-1 · Ingest mechanism**~~ | | ✅ **CLOSED** — plain text into the bundle's `_ingest/`, digested by a Python script, best-effort (AD-2, AD-16) | **Luke, rev 3** |
| **G-2 · Document packaging** | one artefact for all parts · separate artefacts on a shared shell | separate documents (arch OQ-1) — **likely forced**, not chosen | **Q-2b** (AD-11) |
| ~~**G-3 · First real unit**~~ | | ✅ **CLOSED** — **"Year 10 History"** (reopened and re-closed rev 5, replacing "Grammar Revision"). Subject/level and the actual curriculum text extract for it are still needed before Q-1 can run (see note below) | **Luke, rev 5** |
| ~~**G-4 · Reference browser**~~ | | ✅ **CLOSED** — Chrome on macOS only (FR-SYS-9). Now a preference, not a necessity: AD-5's local server works in any browser | **Luke, rev 3** |
| **G-5 · Generator earns its keep** | build FR-LP-9 / FR-CS-3 · drop them, blank templates only | build them | Q-5 |
| ~~**G-6 · Which curricula**~~ | | ✅ **CLOSED** — Victorian + generic only (arch OQ-5) | **Luke, rev 4 follow-up** |
| ~~**G-7 · Matrix default orientation**~~ | | ✅ **CLOSED** — portrait (arch OQ-6) | **Luke, rev 4 follow-up** |
| ~~**G-8 · Crib sheet default shape**~~ | | ✅ **CLOSED** — 1 page, portrait (arch OQ-8) | **Luke, rev 4 follow-up** |
| **G-9 · Build the ingest at all?** | build it · drop it, hand-enter through the editor | build it | **Q-1's accuracy number** (AD-16) |
| ~~**Persistence mechanism**~~ | | ✅ **SETTLED** — a tiny per-bundle Python server (AD-5). Struck Q-3 from the spike | **Luke, rev 4** |

G-2 gates wave 1. G-9 gates wave 2. G-5 gates wave 3.

**All decision gates but G-2 and G-5 and G-9 are now closed.** G-2 is
mechanical (Q-2b decides it); G-5 and G-9 are measured (Q-5's ergonomics test,
Q-1's accuracy number) — neither is Luke's to pick, both are the spike's to
find out.

**G-3's closure needs one more thing before it fully unblocks Q-1 specifically
— nothing else.** Naming the unit ("Year 10 History") answers *which* unit —
it does not yet supply the *curriculum text* Q-1 measures accuracy against.
Luke, or whoever sources it, still needs to obtain the actual Year 10 History
curriculum wording (subject/level: **Victorian History, Victorian Curriculum
F–10 Version 2.0, Levels 9–10 band**) from its published source
(`f10.vcaa.vic.edu.au`) before Q-1 can run. This
blocks Q-1 and G-9 only — see §1a. It does not block wave 1, `curriculum-editor`,
`arbor-tree`, `bigidea-list`, `image-paste`, or any of waves 3–5.

**G-9 is new and worth noticing.** Luke asked for the ingest, and it is
specced — but the honest position is that a heuristic parser below ~60%
accuracy makes more work than it saves. Q-1 measures it; if the number is bad,
dropping `curriculum-ingest` and entering units through the editor is the
right outcome, not a failure. Better to learn that in one spike session than
after building it. **The build itself can start now**, against the fixture, and
be re-measured against real text once it arrives — only the go/no-go verdict
waits.

---

## 2a. The fixture unit — what it needs to cover

Constructed once (prerequisite 2), reused by every subsequent step until real
data arrives. Named `Fixture Revision` in its own data so it can never be
mistaken for the real Year 10 History unit. **Not yet built** — so the rev 5
extension below (coverage links, unit assessment, singular matrix) is a cheap
change, not a rework. It needs, at minimum:

- **3–4 curriculum strands**, each with 2–4 outcomes, each with 1–3 tasks —
  realistic depth/breadth for Q-4's tree-legibility test (INV-DM-3).
- **1 unedited "raw" text block**, deliberately messy (inconsistent indentation,
  mixed numbering styles), separate from the structured version above — so
  `curriculum-ingest` has something to smoke-test against even before Q-1's
  real number exists. *Not* a substitute for Q-1's measurement — a smoke test,
  not an accuracy claim.
- **A big-idea list**, 3 ideas, one broken into 2 sub-ideas (INV-DM-14) — enough
  to exercise the two-level cap and the many-lessons-to-one-idea binding.
  **Coverage-qualified links to curriculum nodes (rev 5):** at least one link
  marked `full`, at least one marked `partial` (with a note), and at least one
  curriculum node **deliberately left with no coverage link at all**, so the
  coverage grid's gap display has something real to show empty.
- **2–3 lesson plans**, each bound to a different big idea and a different
  curriculum node set, one carrying a placed image reference. **At least one
  lesson links to several mini assessments; at least one other links to the
  unit's single final assessment (rev 5)** — covering both of the two linking
  shapes FR-UA now allows.
- **A unit assessment (rev 5):** **exactly one** three-tiered final assessment
  (pass/intermediate/advanced) plus **2–3 mini assessments**, together
  touching **all three tiers** — enough to prove the final/mini split and the
  tier vocabulary on the new part.
- **The singular per-unit marking matrix (rev 5):** **1 matrix template**
  with criteria across all three tiers, plus **2–3 student pages** — one page
  per student, each page's scoring bound to the assessments (final and/or
  mini), not to individual lessons. This replaces the earlier per-(student,
  lesson) instance shape entirely; nothing in the fixture should still imply
  a matrix keyed by lesson.
- **1 crib sheet**, referencing 2 of the 3 big ideas, **with sections in both
  halves (rev 6)** — at least one section under `upper` and at least one under
  `lower`, so the generic two-half discriminator (AD-29) has something in
  each half to render and print, not just one.
- **1–2 placeholder images** (simple generated shapes, not real photos) for
  Q-6's paste/save/render/print round trip.
- **A resources page (rev 6), with one item of each kind** — at least one
  `link`, one `image`, and one `text` item, each carrying its optional note,
  so the flat unstructured list (AD-25, AD-26) has something to render,
  print, and reorder for every item type it supports.
- **Mini assessments with qualified `coverage[]`, including at least one
  `partial` link (rev 6)** — mirroring the big-idea coverage shape (AD-27),
  so the coverage grid's assessed-coverage column group has both `full` and
  `partial` cells to display, not only `full`.
- **Contiguously numbered lessons, starting at 1 (rev 6)** — the fixture's
  2–3 lesson plans get sequential `number` values with no gaps, so the
  Lessons-tab index (AD-31) has a real, correctly-ordered list to render.
- **Curriculum nodes arranged so all three coverage-grid gap kinds occur
  (rev 6)** — extending the existing "at least one node with no coverage
  link at all" requirement above: the fixture needs (a) a node taught (a
  big-idea link) but not assessed, (b) a node assessed (a mini/final
  assessment link) but not taught, and (c) a node with neither — so
  AD-28's three-way gap split (taught-not-assessed / assessed-not-taught /
  neither) has a real example of each to display, not just the
  already-required "no coverage at all" case.
- **At least one lesson with no tiered content at all (rev 7)** — so the
  1-page lesson-plan case (AD-33) is testable: front page only, no
  Green/Blue/Orange tier pages emitted, while the `Lesson.tiers` object
  still carries all three fixed keys underneath (schema unchanged).
- **At least one lesson with content in all three tiers (rev 7)** — so the
  4-page case (AD-33) is also exercised, alongside the no-tier lesson above;
  together they cover both ends of the new 1-to-4-page range, not just the
  old fixed-4 case.
- **Marking-matrix criteria with varied maxima (rev 7)** — at least two
  criteria whose max scores differ meaningfully (e.g. not all `10`), so the
  matrix's four display modes (Default Empty, Default Full, Data entry, Part
  of) produce **visibly different** numbers per cell rather than modes that
  happen to coincide arithmetically — the exact failure mode that let an
  earlier "Part of" misreading go unnoticed until a worked example exposed
  it (see `notes.md`'s marking-matrix guidance).

This is enough surface area to build and exercise every part of the schema —
**six parts now, not five** — without a single real fact about English or
history in it. **The fixture is still unbuilt** (prerequisite 2 below), so
every extension above — rev 6's and rev 7's alike — remains a cheap change
made before construction, not a rework of something already built.

## 3. Optional

- A second real unit, for checking the ingest doesn't overfit to the first.
- A sample class roster (names only), for exercising the per-student matrix at
  realistic width.
- An existing lesson plan of Luke's, as a fidelity target for the 4-page layout.
- An existing crib sheet or unit summary of Luke's, likewise.
- A few representative images Luke would actually paste — a diagram, a
  screenshot, a photo of handwriting — for Q-6's quality/size test on top of
  the fixture's placeholders.
- A USB stick or second disk, for the Q-3b portability check.

*(Extracts for Q-1b moved to §1a — agent-sourced, not a Luke dependency.)*

---

## 4. Coordinate-with — shared files and vocabulary

- **`document-shell` and `local-store` share the unit-folder contract.** The
  shell renders what the store loads. Settle the
  [data model](CurriculumPreparation-datamodel.spec.md) schema **once**, before
  either starts.
- **`bundle-template` owns the folder layout.** Every wave-1 build fills a slot
  in it; none invents a top-level folder without amending the template.
- **`bundle-server` owns the endpoint shape**, and `local-store` is its only
  client. Settle it once in wave 1, or wave 2 spends its time redesigning it.
- **`style-guide` owns `variables.css`.** No other file hardcodes a value that
  belongs in a token (CSS-2).
- **Tier vocabulary is global.** `pass` / `intermediate` / `advanced` and
  Green / Blue / Orange (INV-DM-1, AD-7) are fixed constants in one place.
- **No build may name a curriculum.** Curriculum-specific vocabulary lives in a
  profile's `labels`, never in a field name, enum or rendered string
  (INV-DM-10). *A field called `vcaaCode` is a bug.*
- **Page geometry belongs to `document-shell` alone**, in both orientations. No
  later build writes `@page` rules (AD-11).
- **Forward reference fields must be stored from the start** — `lesson.nodeIds`,
  `lesson.bigIdeaId`, `lesson.miniAssessmentIds` / `lesson.finalAssessmentId`,
  `assessment.bigIdeaId`, `bigIdea.coverage[].nodeId`, `matrix.studentId`,
  `cribSheet.sections[].bigIdeaId`, every `ImageRef`. `traceability-links`
  derives every reverse edge from them and can invent nothing. **This is the
  one coupling that cannot be fixed later.** Note (rev 5): the matrix is no
  longer keyed by lesson — `matrix.lessonId` from earlier revisions is gone;
  its scoring now points at assessments, not lessons.
- **Reverse links are derived, never stored** (INV-DM-12).
- **The image manifest belongs to `image-paste`.** Documents hold `ImageRef`s;
  only `image-paste` writes files and manifest entries. No other build touches
  `images/`.
- **Curriculum node `code`/`title` are verbatim (INV-DM-2)** — importer,
  editor and every renderer agree never to normalise them.
- **The Python/JS tier boundary is absolute** (AD-13). **Python owns all
  filesystem I/O**; the browser never touches a file directly. Everything goes
  through `bundle-server`.
- **`serve.py` is hard-scoped to its bundle root** (AD-13b) and needs TEST-7
  gate tests in both directions before it counts as done.
- **The Vibe Coding Rules bind every file** (AD-13a). Read
  `Memory/Long-Term/Coding/vibe-coding-rules.md` before writing any code, and
  the two existing `System/Tools/*/serve.py` viewers before writing ours (SR-6).
- **`System/Widgets/Parser/_shell/`** is a **read-only reference**. Read it for
  conventions; never import from it, never edit it — it backs the live parser
  widgets.

---

## Gate summary

> **Wave 1 building may start as soon as a fixture unit exists (2) and A4 print
> — both orientations, mixed-orientation, and bundle portability — is measured
> against it (3, 3b, 3c). Gate G-2 must be closed before `document-shell`.
> None of this needs Luke, real curriculum data, or the Year 10 History text.**

Prerequisite 1 (Luke's approval) is **met**. Current state: **1 of 7 required
prerequisites met**, with **rows 2–7 entirely agent-owned and startable now.**
Six of nine decision gates are closed (G-1, G-3, G-4, G-6, G-7, G-8); **G-2 and
G-5 remain and are settled by the fixture-based spike; G-9 is settled by Q-1
alone, once the real Year 10 History text arrives.**

**The one thing genuinely waiting on Luke** is the Year 10 History curriculum
text (§1a) — and it blocks only Q-1's accuracy number and gate G-9. It does not
block wave 1, it does not block most of wave 2, and it never blocked spec work
at all.
