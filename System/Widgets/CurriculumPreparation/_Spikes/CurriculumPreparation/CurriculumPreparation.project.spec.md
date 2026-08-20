# CurriculumPreparation — Project Spec

| Field | Value |
|---|---|
| **Type** | Spike (project container) |
| **Date** | 2026-08-19 (rev 7 — sixth part added rev 6; clickable codes, conditional lesson-plan pagination, comments-vs-UI-text and matrix grid-add/display-mode decisions added rev 7) |
| **Status** | Draft — awaiting Luke's review |
| **Project** | TE-10 · Curriculum Preparation |
| **Repo root** | `System/Widgets/CurriculumPreparation/` |
| **One-liner** | Can a **self-contained unit bundle** — stamped out by a skill, served by its own tiny Python server, built from nothing but stdlib Python and vanilla JS — carry a unit's curriculum map (with coverage grid), big-idea list, lesson plans, unit assessment, crib sheet and a per-unit marking matrix paginated by student: ingested from plain text, cross-linked, image-capable, printable to A4 in the right orientation? |
| **Timebox** | 3 working sessions (see §7). A spike that fails to converge inside the box is itself the answer. |

---

## 0. Operating context

**This is a personal tool, for Luke, on Luke's own computer.** Not a product,
not distributed, not multi-user, never published. That single fact settles a
lot of questions that would otherwise be open:

| Because it's personal… | Consequence |
|---|---|
| One machine, one browser | **Chrome is the target** — gate G-4 closed. Now a preference rather than a necessity: AD-5's local server works in any browser |
| Nothing is published | Curriculum copyright drops from a build blocker to an attribution courtesy (AD-8) |
| No install story, no users to support | **Python and JS only** — no build chain, no framework, no package manager (AD-13) |
| Luke is the only operator | Best-effort tooling is acceptable where a product would need reliability. The ingest may be wrong; Luke fixes it (AD-16) |
| Units outlive the code that made them | Each unit is a **self-contained bundle**, independent of this repo and of every other unit (AD-18) |
| It is Lukeatron code | The **Vibe Coding Rules** (`Memory/Long-Term/Coding/vibe-coding-rules.md`) are binding, in full (AD-13a) |

## 1. Purpose

Build a teaching tool that covers the whole preparation loop for **one unit**
(not a whole year): ingest the relevant slice of a curriculum from plain text,
lay it out as a readable tree of tasks and outcomes, organise the teaching
around a list of big ideas, generate and edit lesson plans against them, boil
the unit down to a crib sheet, and mark student work in a matrix that mirrors
the lesson's own tiering.

**Six parts, one data spine — and each part's cardinality is fixed** (AD-19):

| Part | Artefact | How many | Orientation | Saved as |
|---|---|---|---|---|
| **1 · Curriculum map** | Arbor tree of tasks and outcomes, **plus the unit's big-idea list**; edited via a **coverage grid** (big ideas × content descriptions **and** assessments × content descriptions, rev 6), printed with coverage chips on the tree | **exactly one** | **A4 landscape** | `unit.json` |
| **2 · Lesson plan** | A4 document, **1–4 pages** (rev 7, AD-33): front page always, each tier page only if that tier has content | **many — each different** | **A4 portrait** | `unit.json` |
| **3 · Unit assessment** | One three-tiered final assessment, plus many three-tiered mini assessments, mini assessments carrying qualified `coverage[]` (rev 6) | **exactly one final, many mini** | **A4 portrait** | `unit.json` |
| **4 · Marking matrix** | Scoring grid against the assessments, three tiers, **paginated by student**, half-mark entry, spreadsheet-style presentation, a whole-class edit view entry grid (rev 6) | **exactly one matrix per unit — one editable template, many student pages** | **either — user's choice** | **CSV** + `unit.json` |
| **5 · Crib sheet** | 1–2 page A4 distillation of the unit's big ideas, divided top/bottom into two generic halves labelled by the curriculum profile (rev 6) | **exactly one** | **either — user's choice** | `unit.json` |
| **6 · Resources page** *(rev 6, new)* | A flat, ordered list of link/image/text items, each with an optional note — deliberately unstructured: no tiering, no curriculum or big-idea binding, no coverage links, no row in the traceability graph | **exactly one** | **A4 portrait — fixed** | `unit.json` |

The remaining plurals are not the same kind of plural. **Lesson plans are
plural because their content differs; mini assessments are plural for the
same reason.** The marking matrix was plural too until rev 5 — one per
(student, lesson) — but is now **singular per unit**, paginated by student
rather than duplicated. It keeps the one-template-many-thin-instances split;
only the axis it is plural *over* changed, from (student × lesson) to
student alone — which is what makes "each the same" true by construction
rather than by discipline. **The resources page (rev 6) is plural only
inside itself** — its item list grows freely — but the page stays singular,
and unlike every other part it carries no tiering, no binding and no
traceability row: it is deliberately the loosest part in the widget (AD-25,
AD-26), not an oversight to tidy up later.

Every part renders as **SVG**, views **offline in a browser**, prints to
**PDF**, and takes its **data entry through an HTML page**.

Seven properties bind the parts into one tool rather than five:

- **The unit is a self-contained bundle.** Not an app that opens unit folders —
  a **skill stamps out a complete, independent bundle** per unit: its own
  server, scripts, style guide, CSS, documentation and data. It can live
  anywhere, be copied to a USB stick or archived at the end of term, and will
  still open in three years because nothing outside the folder is needed
  (AD-18).

- **Two organising axes, not one.** The **curriculum tree** is the authority's
  structure — what the unit is accountable to. The **big-idea list** is Luke's
  structure — how the teaching is actually organised. Every lesson sits on
  both. Keeping them separate is what lets the teaching be shaped by ideas
  while still being answerable to outcomes.
- **Any curriculum, not just Victorian.** The internal model is
  curriculum-agnostic; a named **curriculum profile** describes how a given
  curriculum's text maps onto it.
- **Everything is cross-linked.** A lesson points back to its curriculum nodes
  *and* its big idea, and forward to the mini assessments or the one final
  assessment it uses; the marking matrix scores against those assessments;
  the curriculum map shows which nodes no lesson covers. Navigable in edit
  view, printed as citations on paper.
- **Images paste in.** Diagrams, worked examples and screenshots go straight
  from the clipboard into a lesson plan or crib sheet, and are saved as files
  in the unit's own folder.
- **Coverage is qualified, not binary.** A big idea's links to curriculum
  nodes carry `full` or `partial` coverage rather than a bare yes/no list, so
  gaps show precisely — surfaced through a coverage grid while editing and as
  chips on the print view arbor tree (rev 5).
- **A fifth part, the unit assessment.** One three-tiered final assessment
  plus many three-tiered mini assessments, each with mandatory big-idea
  binding and coverage-qualified curriculum links, cross-linked to lessons
  like every other part (rev 5).
- **A sixth part, the resources page (rev 6).** A flat, ordered, reorderable
  list of link/image/text items with optional notes — deliberately outside
  the tiering/binding/traceability system every other part uses. It is the
  one part a future pass must not "regularise" into consistency with the
  rest (AD-25, AD-26).
- **Coverage is now taught *and* assessed, not taught alone (rev 6).** The
  coverage grid gains a second column group — assessments × content
  descriptions, using the same qualified `full`/`partial` vocabulary mini
  assessments now carry — splitting one gap concept into three: taught but
  not assessed, assessed but not taught, and neither. The middle case is a
  fairness problem, not a planning one, so it is shown distinctly rather
  than folded into a single amber flag.
- **Curriculum codes are edit view navigation, plain text in print view (rev 7).**
  Clicking a code anywhere it appears — lesson plan, unit assessment, crib
  sheet, marking matrix — jumps to the coverage view, scrolled to and
  highlighting that content description, with a back affordance; the print
  view renders the same code as plain text, unchanged (AD-32, extending
  AD-12's edit view/print view split for links generally to this specific case).

## 2. Questions this spike must answer

Numbered; §8's findings answer each with evidence, not opinion.

- **Q-1 — Ingest quality.** Luke has settled the *mechanism* (plain text into
  an ingest spot, digested by a Python script — gate G-1 closed). The open
  question is **how well a heuristic parser can actually do**, given that only
  "roughly correct" is required. Concretely: over a real curriculum paste, what
  fraction of nodes land at the right depth with the right code and title? Is
  it 90%, or 40%? *Below roughly 60% the correcting is more work than typing it
  in, and the ingest is not worth building.*
- **Q-1b — Generality.** Do at least **two other** curricula (a second
  Australian jurisdiction or VCE study design, and one overseas) map onto the
  same canonical node model without distorting it? Which of their concepts
  does the model fail to hold — and is the gap fixed by a profile's label map,
  or does it need a model change? *A model that only fits Victorian is the
  wrong model.*
- **Q-2 — SVG-first viability.** Can a single offline HTML file hold inline
  SVG that is (a) edited through HTML controls, (b) rendered faithfully, and
  (c) printed to A4 at true size across page breaks — without a print server
  or a PDF library?
- **Q-2b — Mixed orientation.** The six parts print in three different
  orientations. Can one browser print job carry mixed `@page` orientations
  reliably — or must each part be a separate document? **This decides gate
  G-2**: if mixed orientation is unreliable, one-artefact-for-everything is
  dead and separate documents are forced, not preferred.
- ~~**Q-3 — Persistence and file access.**~~ **Struck in rev 4.** It asked
  whether the File System Access API could give a workable unit folder. Luke's
  answer — *"I'm happy for a tiny mini server to be generated each time"* —
  removes the question rather than answering it: AD-5 now puts a `serve.py`
  inside every bundle, so there is no browser file-access problem left to
  measure. This was a blocking prerequisite; it is now gone.
- **Q-3b — Bundle independence.** Does a generated bundle actually run
  standalone? Copy one to a different folder, a different disk, and a machine
  path with a space in it, and confirm it still starts, saves and prints. *The
  whole value of AD-18 rests on this being true in practice, not just in
  design.*
- **Q-4 — Tree layout.** Does a horizontal tidy-tree layout stay legible for a
  realistic unit, on **A4 landscape**, at a printable font size — *with the
  big-idea list also on the page* — or does it need paging/zoom affordances?
- **Q-5 — Ergonomics.** Is "generate a draft lesson plan from a curriculum node
  and a big idea, then modify it" actually faster for Luke than writing the
  plan from a blank template? Same question for the crib sheet. The generators
  are only worth building if the answer is yes.
- **Q-6 — Image round-trip.** Does clipboard paste → file in `images/` →
  re-render → print survive the whole loop at usable quality and file size? A
  pasted screenshot that prints as mush is not worth the plumbing.

## 3. Definition

**Unit** — a bounded teaching sequence (weeks, not a year). On disk, a
**self-contained bundle folder** carrying its own server, code, style guide,
docs and data (AD-18).
**Bundle template** — the master copy in `_template/`, from which every unit
bundle is stamped.
**`!NewUnit`** — the generator skill that copies the template into a new
bundle and fills in its identity.
**Outcome** — a curriculum statement the unit is accountable to.
**Task** — a piece of work students do that evidences an outcome.
**Big idea** — one of Luke's own organising ideas for the unit. May be broken
into **sub-big ideas**; the list is exactly two levels deep, and is editable.
One big idea may be spread across many lessons.
**Lesson** — one plan of **1–4 pages** *(rev 7)*, hanging off one or more
curriculum nodes and **exactly one** big idea or sub-big idea, and linking
either to several mini assessments or to the unit's one final assessment.
The front page always prints; each of the three tier pages prints only if
that tier carries content — the underlying schema still holds all three
tiers always, unchanged (INV-DM-1); only rendering became conditional.
Each lesson also carries a unique, contiguous-from-1 **number**, reachable
from a numbered index on the Lessons tab *(rev 6)*.
**Unit assessment** *(rev 5)* — the fifth part: **exactly one** three-tiered
final assessment (pass/intermediate/advanced) plus **many** three-tiered mini
assessments, each with mandatory big-idea binding and coverage-qualified
curriculum links. Absorbs the earlier, thinner `Assessment` entity, which
becomes the mini-assessment.
**Marking matrix** *(rev 5)* — **exactly one per unit**, paginated by
student (one page each), scoring against the unit's assessments rather than
individual lessons. One editable template shapes every student's page.
Half-mark scoring is the primary entry affordance, presentation is
spreadsheet-style, and a whole-class edit view entry grid sits alongside the
per-student page *(rev 6)* — printing stays one page per student,
unchanged. Criteria may be added from within the grid itself, carrying a
mandatory warning that an unmarked criterion counts as zero, and a
presentation-only cell display-mode toggle governs how cell/subtotal values
are shown without ever changing how they are computed or stored *(rev 7)*.
**Crib sheet** — a 1–2 page A4 distillation of the unit's big ideas and
sub-big ideas, generated as a template then edited, divided top/bottom into
two generic halves (`upper`/`lower`) labelled for display by the active
curriculum profile — never a hardcoded curriculum-specific name *(rev 6)*.
**Resources page** *(rev 6)* — the sixth part: **exactly one** per unit, a
flat, ordered list of link/image/text items, each with an optional note.
Deliberately unstructured — no tiering, no curriculum or big-idea binding,
no coverage links, and no row in the traceability graph. The one part in the
widget that is not cross-linked to anything else.
**Curriculum profile** — a named, declarative adapter describing how one
curriculum's text maps onto the canonical node model, plus its own vocabulary
and attribution. Victorian (Version 2.0) is profile #1; a **generic profile**
is the always-available fallback.
**Coverage** — whether a curriculum node has at least one lesson (or
assessment) serving it. On a big idea's own links to curriculum nodes,
coverage is **qualified**: `full` or `partial` per linked node, plus a note
*(rev 5)* — never a bare id list. Mini assessments carry the same qualified
`coverage[]` shape *(rev 6)*, so **taught** coverage (via big ideas) and
**assessed** coverage (via assessments) read one shared vocabulary. The
coverage grid shows both side by side, distinguishing three gap kinds —
taught-not-assessed, assessed-not-taught, and neither — all derived, never
stored *(rev 6)*.
**Tier** — one of exactly three attainment levels, colour-fixed:

| Tier | Colour | Meaning |
|---|---|---|
| **Pass** | 🟢 Green | the lesson's minimum |
| **Intermediate** | 🔵 Blue | secure grasp |
| **Advanced** | 🟠 Orange | extension |

The three tiers are the spine of the marking: they appear as lesson-plan pages
2–4, on the unit assessment's final and mini assessments, and again as the
marking matrix's scoring bands. They are the same three tiers in every place
— an invariant, not a convention.

## 4. Scope

**In scope**
- A **bundle template** plus a **`!NewUnit` generator skill** that stamps out a
  complete, independent unit bundle wherever Luke asks.
- A **tiny per-bundle Python server** (`serve.py`) with a double-click
  `.command` launcher, matching the existing Lukeatron viewers.
- The bundle's **own style guide, CSS token set, scripts and documentation**.
- One unit at a time, for one subject/level.
- **Plain-text curriculum ingest** — text dropped into an ingest spot, digested
  by a Python script into the canonical structure, best-effort.
- Editing and re-arranging everything the ingest got wrong.
- Arbor-tree render of tasks and outcomes, **A4 landscape**, with the
  **big-idea list** on the same document, printed with **coverage chips**.
- A **two-level, editable big-idea list**, to which every lesson is bound,
  with **coverage-qualified links** (full/partial, plus a note) to curriculum
  nodes *(rev 5)*.
- A **coverage grid** — big ideas **and assessments** on one axis (two
  column groups, one vocabulary since rev 6), content descriptions on the
  other, cells empty/full/partial — as the edit view for that coverage
  data, showing all three gap kinds (taught-not-assessed, assessed-not-
  taught, neither) *(rev 5, extended rev 6)*.
- **A4 portrait** lesson plans, **1–4 pages** *(rev 7)*: front page always,
  each tier page only if populated; generate a draft, then modify.
- **A unit assessment** *(rev 5, fifth part)* — one three-tiered final
  assessment plus many three-tiered mini assessments, mandatory big-idea
  binding, coverage-qualified curriculum links (mini assessments included
  since rev 6), **A4 portrait**.
- A **1–2 page A4 crib sheet** integrating big ideas and sub-big ideas,
  divided top/bottom into two generic halves labelled by the curriculum
  profile *(rev 6)*.
- **A single per-unit marking matrix**, paginated by student, with editable
  draft scoring against the assessments, half-mark entry, spreadsheet-style
  presentation, a whole-class edit view entry grid, grid-added criteria with
  a mandatory low-score warning, and a presentation-only display-mode
  toggle, **either orientation** *(rev 5 — replaces the earlier per-lesson
  matrices; rev 6/7 add the entry-ergonomics and display-mode items)*.
- **A resources page** *(rev 6, sixth part)* — one flat, ordered,
  reorderable list of link/image/text items with optional notes,
  deliberately outside the tiering/binding/traceability system, **A4
  portrait**, flowing to as many pages as needed.
- **Clipboard image paste** into lesson plans and crib sheets, saved as files
  in the unit folder.
- Cross-links between all parts except the resources page, navigable in edit
  view, printed as citations; in edit view, curriculum codes are clickable,
  jumping to a focused, highlighted row in the coverage view with a back
  affordance — print stays plain text *(rev 7)*.
- Coverage display on the curriculum map.
- Save/view any part as PDF **or** HTML; data entry only via HTML.
- CSV export of the marking matrix.
- **Offline operation** — no network request ever leaves the machine. Note this
  no longer means "no server": each bundle runs its own localhost `serve.py`
  (AD-5).
- Compliance with the **Vibe Coding Rules** in full (AD-13a).

**Out of scope**
- Whole-year or multi-unit planning.
- Any server, account, sync, or cloud storage.
- Multi-user, multi-teacher, or distribution to anyone else.
- Reporting to parents, attendance, timetabling, LMS integration.
- Automated grading or AI-written student feedback.
- Maintaining any curriculum's own content.
- Any dependency beyond the Python standard library and vanilla JS — no
  framework, no package manager, no build chain (SR-2, PY-1, JS-7).
- Any write outside a bundle's own root. `serve.py` is hard-scoped and never
  touches `Memory/` (AD-13b).
- **Migrating an already-generated bundle** to a newer template. Bundles are
  independent, which means they do not receive template fixes — that is the
  accepted price of AD-18, not an oversight.
- A second crib sheet, a second curriculum map, a second big-idea list, a
  second final assessment, or a second marking matrix per unit — these are
  singular by schema (AD-19).
- **Per-lesson marking matrices.** Removed *(rev 5)* — the matrix is singular
  per unit, paginated by student, scored against the assessments. This was a
  deliberate reversal of earlier-specced behaviour, not an omission.
- Image *editing* — paste, place, size, remove. Nothing more.
- Rich WYSIWYG authoring inside the SVG canvas.
- **Tiering, curriculum/big-idea binding, coverage links, or a traceability
  row for the resources page** *(rev 6)* — deliberately left unstructured;
  do not regularise it to match the other five parts.
- **Fetching a resources-page link's content.** Links are recorded only —
  a URL and a label — never followed; the tool makes zero outbound network
  requests to resolve them.
- **Clickable curriculum codes in print view.** *(rev 7)* Meaningless on paper — a
  print view page cannot navigate. Print view keeps plain-text citations exactly as
  before (AD-32).
- **Making a lesson plan's three tiers optional in the schema.** *(rev 7)*
  Rejected explicitly by AD-33 — all three tiers stay mandatory on every
  `Lesson.tiers` object; only whether a tier's *page* is printed became
  conditional.
- **Developer-facing justification text as permanent UI copy.** *(rev 7)*
  A validation rule or invariant citation belongs in a code comment, not a
  standing edit view caption (AD-34) — see also the note on comments vs.
  genuine post-refusal error messages in the same decision.

**Boundary (deliberately deferred, not rejected)**
- XLSX export (CSV first — AD-6).
- More than one curriculum inside a single unit (cross-curricular units).
- Big-idea nesting deeper than two levels.
- Paper sizes other than A4.

## 5. Success criteria

- **SC-1** — Every question Q-1…Q-6 is answered with a number or a
  demonstrated artefact, not a judgement call.
- **SC-1a** — A generated bundle **runs standalone**: copied to another folder,
  another disk, and a path containing a space, it starts, saves and prints.
- **SC-2** — A throwaway prototype takes **the fixture unit** end to end — a
  plain-text paste through to a printed lesson plan PDF (1–4 pages,
  rev 7), a unit assessment document, a crib sheet, a CSV marking matrix
  paginated across two students, and a resources page (rev 6). *(No real
  content required — see the prerequisites correction; SC-2 exercises the
  pipeline's shape, not the parser's accuracy on real text.)*
- **SC-3** — PDF output is measured against A4 at true size — page count, page
  box, margins, colour fidelity — **in both orientations**, recorded as numbers.
- **SC-4** — The data model's invariants survive contact with the fixture and
  with whatever real data becomes available (Year 10 History, Q-1b's two other
  curricula), or are amended with a recorded reason. The fixture is deliberately
  built to probe edge cases (deep nesting, shared big ideas, orphaned nodes)
  that real data may not happen to contain.
- **SC-5** — At least two curricula beyond Victorian have been mapped onto the
  canonical model on paper (Q-1b), and every concept that failed to fit is
  written down.
- **SC-6** — The cross-link web is demonstrated end to end: lesson → curriculum
  node → covering lessons; lesson → big idea → the other lessons sharing it;
  lesson → a student's marking grid — and the same links appear as readable
  citations in print view.
- **SC-7** — **Ingest accuracy is a measured number**, not an impression:
  nodes correctly placed ÷ nodes in the source, over a real paste.
- **SC-8** — An image pastes from the clipboard, lands as a file in the unit
  folder, re-renders on reopen, and prints legibly.
- **SC-9** — `serve.py`'s scope guard is proven both ways (TEST-7): a path
  outside the bundle root is refused, a path inside it passes.
- **SC-10** — The prototype is checked against the Vibe Coding Rules — stdlib
  only, no framework, no bundler, CSS tokens in one file, `viewBox` on every
  SVG.
- **SC-11** — A go/no-go recommendation is filed, with the build waves in
  [`_PLAN.md`](_PLAN.md) either confirmed or re-cut.

## 6. Exit conditions

The spike exits when **any** of these is true:

- **Go** — SC-1…SC-11 met; findings appended below; `_Builds/` waves confirmed.
- **Re-cut** — SVG-first (Q-2) proves unworkable, or bundles turn out not to
  run standalone (Q-3b); findings recorded and the architecture re-specced.
  This is a *successful* spike.
- **Partial** — ingest accuracy (Q-1) comes in too low to be worth building.
  Drop `curriculum-ingest`, keep everything else, and enter units by hand
  through the editor. Also a success: it saves building a thing that doesn't
  pay for itself.
- **No-go** — the timebox expires without convergence. Record what blocked it.

## 7. Timebox

> **Corrected.** Only Q-1 needs Luke's real Year 10 History text — see the
> [prerequisites spec's correction](CurriculumPreparation.prerequisites.spec.md#%EF%B8%8F-correction-rev-4-second-pass).
> Sessions below run against a **fixture unit** ([built spec §2a](CurriculumPreparation.prerequisites.spec.md#2a-the-fixture-unit--what-it-needs-to-cover))
> wherever the question doesn't specifically require real content. Session 1
> can start immediately; Q-1 alone waits on the real text and can slot in
> whenever it arrives, without reordering the rest.

| Session | Focus | Needs real content? | Output |
|---|---|---|---|
| 1 | Fixture unit built + Q-4 (tree shape) + Q-1b (two other curricula, agent-sourced) | Q-1b only, sourced by the agent, not Luke | Fixture unit in the draft schema; two curricula mapped on paper |
| 2 | Q-2 + Q-2b (print, both orientations) + Q-3b (bundle independence) + Q-6 (image round-trip) | No — fixture throughout | Printed PDFs measured against A4; a throwaway bundle running from a copied folder, with a pasted image |
| 3 | Q-5 (generator ergonomics) + cross-link walkthrough (SC-6) + write-up | No — fixture throughout | Findings, go/no-go, re-cut waves |
| *(slots in whenever ready)* | **Q-1** (ingest accuracy) — the one question that needs Luke's real Year 10 History text | **Yes — the only one** | Accuracy number; decides gate G-9 |

## 8. Findings

> *Filled on exit — one subsection per question, each answered with numbers or
> a named artefact. Empty until the spike runs.*

**Q-1 —** *pending* · ingest accuracy: __ % of nodes correctly placed
**Q-1b —** *pending*
**Q-2 —** *pending*
**Q-2b —** *pending*
**Q-3b —** *pending*
**Q-4 —** *pending*
**Q-5 —** *pending*
**Q-6 —** *pending*

**Recommendation:** *pending*

**Follow-on requests filed:** *pending*

---

## Related documents

- [Product requirements](CurriculumPreparation-prd.spec.md) — FR numbers for all six parts
- [Data model](CurriculumPreparation-datamodel.spec.md) — entities and invariants
- [Architecture decisions](CurriculumPreparation.arch.spec.md) — AD-1…AD-19
- [Dependency analysis](DEPENDENTS.md) — general capabilities filed as builds
- [Prerequisites gate](CurriculumPreparation.prerequisites.spec.md) — what must exist first
- [Project plan](_PLAN.md) — waves and tracking
