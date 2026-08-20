# marking-matrix — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-20 (amended — Changes T/U/W, matching PRD/data model/arch rev 12) |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 4 |
| **One-liner** | The unit's singular, paginated-by-student marking matrix — one editable criteria template scored against the unit's assessments, printed one A4 page per student. |

---

## 1. Motivation

Marking a class against a rubric only works if the rubric is written once and
scored many times. Before this build there is no home for that rubric at
all — the data model's `matrixTemplate` exists on paper but nothing edits it,
and nothing turns a roster into scoreable pages. This build is that home: one
template, one document, one page per student, sitting beside the unit's
singular crib sheet the same way the crib sheet sits beside the big-idea list.

**Superseded model, stated up front.** An earlier draft of this data model
described *many* matrices — one per (student, lesson) pair, each carrying a
`lessonId`. Luke has since closed that design: marking happens against the
unit's **assessments** (the final assessment and its mini assessments), not
against individual lessons, and per-lesson marking has been deliberately
removed. This spec is written against that closed decision, not against
whatever `CurriculumPreparation-datamodel.spec.md` currently shows on disk —
that file is mid-revision by another agent as this spec is written. See
AD-MMB-1.

Filed against `_Builds/_PLAN.md`'s wave-4 row for `marking-matrix`
(prereqs: `lesson-plan-document`; gate G-7 — **closed**, portrait default).

## 2. Traceability — FR-MMB vs. the PRD's FR-MM family

`FR-MM-n` is the **PRD-level** family (`CurriculumPreparation-prd.spec.md`,
§ marking matrix). `FR-MMB-n` below is this **build-level** spec's own
numbering, cross-referenced back to FR-MM wherever a PRD requirement
survives unchanged, and flagged where AD-MMB-1's model change supersedes it.

| FR-MM (PRD) | Status here | Where it lands |
|---|---|---|
| FR-MM-1 — reflects the three lesson-plan tiers | **Reworded** — reflects the project's three fixed tiers (not specifically the lesson plan's) | FR-MMB-3 |
| FR-MM-1a — exactly one matrix template per unit | Kept | FR-MMB-2 |
| FR-MM-2 — template provides draft scoring per tier | Kept | FR-MMB-4 |
| FR-MM-3 — draft scoring editable once, on the template | Kept | FR-MMB-4 |
| FR-MM-4 — a matrix is individual per student, **per lesson** | **Superseded** — individual per student only; no lesson axis | FR-MMB-2, AD-MMB-1 |
| FR-MM-4a — many instances across a class × unit | **Reworded** — many student pages within **one** unit-level document | FR-MMB-2, AD-MMB-2 |
| FR-MM-5 — grades entered through the HTML page | Kept | FR-MMB-9 |
| FR-MM-6 — saved as a basic spreadsheet (CSV) | **Out of scope here** — owned by `csv-export` | §2 Out of scope |
| FR-MM-7 — renders SVG, prints A4, either orientation | Kept | FR-MMB-12, FR-MMB-13 |
| FR-MM-8 — print names the lesson, big idea and outcome | **Superseded** — print names the **assessment(s)** each criterion marks, not a lesson | FR-MMB-14 |
| FR-MM-9 — scope axis: per-assessment vs full-unit, both edit and print view *(New — Change T)* | Kept | FR-MMB-33, FR-MMB-34, FR-MMB-36 |
| FR-MM-10 — roll-up rule: per-assessment subtotal vs full-unit total, no double-count *(New — Change T)* | Kept | FR-MMB-35 |
| FR-MM-11 — tiered-ceiling total: Pass 50 / +Intermediate 75 / +Advanced 100 *(New — Change U, reverses OQ-MMB-8)* | Kept | FR-MMB-37, FR-MMB-41 |
| FR-MM-12 — allocation at setup, not rescaling at grading; FR-MM-12a override rule *(New — Change U)* | Kept | FR-MMB-37…40, FR-MMB-42 |
| FR-MM-13 — printing available for both activities: a blank Setup sheet alongside the existing Student-data sheet *(New — Change W, amends AD-MMB-11)* | Kept | FR-MMB-43, AD-MMB-19 |
| FR-MM-14 — Student-data print header identifies the sheet (student/class/assessment) instead of a page counter *(New — Change AD)* | Kept | FR-MMB-44, AD-47 |
| FR-MM-15 — Student-data print gains a unit-progress block, rows not summable into the separately-computed unit total *(New — Change AD)* | Kept | FR-MMB-45, AD-47, AD-MMB-20 |

## 3. Scope

**In scope**
- Editing the **singular** `matrixTemplate`: adding, editing, removing and
  reordering criteria; each criterion belongs to exactly one tier, carries a
  draft score and a max score, and binds to one or more assessments.
- Managing the **roster** used by this document — adding and removing a
  student — and the resulting **per-student pages**.
- Entering awarded scores and per-criterion comments for a student.
- Computing and displaying per-tier and overall totals, with a defined
  rounding and empty-score rule (AD-MMB-5) — unscored counts as zero.
- Fractional awarded scores at half-mark granularity as the primary entry
  affordance, with a typed one-decimal value also accepted (AD-MMB-8,
  resolves OQ-MMB-3).
- A dense, spreadsheet-like tabular layout for the per-student page — visible
  cell boundaries, aligned numeric columns, compact rows — and keyboard-first
  cell-to-cell data entry (FR-MMB-20, FR-MMB-21).
- Live in-grid subtotals per tier and a unit total that update as marks are
  entered (FR-MMB-22).
- A whole-class edit-view entry grid (students × criteria) as an additional
  surface alongside the per-student page (AD-MMB-9, FR-MMB-23) — entry only;
  the print model is unchanged (§ below, AD-MMB-2).
- Binding a criterion to the assessment(s) it marks — the unit's one final
  assessment, its mini assessments, or both.
- Adding a template criterion from **within the marking view itself** —
  the class grid or the per-student page — not only from a separate
  template editor, with a mandatory warning naming its class-wide
  total-drop consequence before the add commits (FR-MMB-24, FR-MMB-25).
- A **four-mode display toggle** (Default Empty / Default Full / Data
  entry / Part of) controlling **what every individual cell in the matrix
  shows**; per-tier subtotals and the unit total are *derived from* each
  mode's cell display, not an independent presentation layer of their own
  (FR-MMB-26…32). Three of the four modes never write; **Default Full is
  the deliberate exception** — it is the mark-allocation design surface,
  and an edit made there writes the shared `matrixTemplate` criterion's
  `maxScore`, changing the ceiling for every student (AD-MMB-11,
  AD-MMB-12).
- Orientation: user-selectable portrait/landscape, stored on the matrix,
  defaulting to portrait (G-7).
- **A scope axis** *(New — Change T)*: full-unit (existing behaviour) or
  per-assessment (criteria filtered to one selected assessment), available
  in both the class grid, the per-student page, and print — never stored as
  duplicate criteria or duplicate scores (FR-MMB-33…36, AD-39, AD-MMB-14/15).
- **A tiered-ceiling `maxScore` allocation model** *(New — Change U, reverses
  OQ-MMB-8)*: the unit total is fixed at 100, split into cumulative tier
  budgets (Pass 50, +Intermediate 25, +Advanced 25), auto-allocated across
  each tier's non-overridden criteria at setup time and adjustable per
  criterion by manual override in Default Full mode (FR-MMB-37…42, AD-40,
  AD-41).
- Printing: A4, exactly one page per student, correct page breaks, print view
  citations of assessments/criteria in human-readable form, never raw ids —
  this is the Student-data activity's print output (FR-MMB-32).
- **A second, explicitly-invoked print output for the Setup activity**
  *(New — Change W, amends AD-MMB-11)*: a single-page blank marking sheet —
  criteria, tiers and allocated ceilings, no student data, no student name —
  additional to Student-data print, never replacing it (FR-MMB-43, AD-MMB-19).
- **A print header identity, and a unit-progress block, on the Student-data
  print sheet only** *(New — Change AD)*: the header names the student,
  class/unit and the sheet's assessment (or scope) instead of a page
  counter; a new block lists every unit assessment's per-assessment
  subtotal for this student alongside an independently-computed unit total
  — never a summed column (FR-MMB-44, FR-MMB-45, AD-47, AD-MMB-20).
- Reading and writing exclusively through `local-store`.

**Out of scope**
- **CSV export.** A **separate, already-identified build** (`csv-export`,
  wave 4, downstream of this one per `_PLAN.md`). This build produces and
  persists the scored data; `csv-export` reads it through `local-store` and
  writes the spreadsheet. Nothing here writes a CSV file.
- **Creating or editing assessment records themselves** (the final
  assessment, the mini assessments) — that is `unit-assessment-document`'s
  job (§4). This build only *reads* assessment ids/names it is given and
  *binds* criteria to them.
- **Per-lesson marking of any kind.** Deliberately removed (AD-MMB-1). No
  criterion, score, or page in this build references a `lessonId`.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (AD-13).
- Cross-part navigation and live citation links — that is
  `traceability-links` (wave 5). This build prints a readable name; it does
  not resolve a clickable cross-reference.
- Page geometry, `@page` print rules, the tier colour constants, and the
  image-drawing primitive — all owned by `document-shell`; this build calls
  into it, never redefines it.
- Roster fields beyond `{ id, name }` — no photos, no contact info, no
  grade history across units.

## 4. Requirements

- **FR-MMB-1** — There is **exactly one** marking matrix document per unit —
  a single `matrixTemplate` plus a single per-student-paginated instance
  document — never one per lesson and never one per (student, lesson) pair.
  *(supersedes old INV-DM-6/19 wording — AD-MMB-1)*
- **FR-MMB-2** — The template's `criteria[]` support add, edit, remove and
  reorder. Each criterion is `{ id, tier, criterion, draftScore, maxScore,
  assessmentIds[] }` — belongs to exactly one of the three fixed tiers, and
  carries its own draft score and max score. *(FR-MM-1a)*
- **FR-MMB-3** — The three tiers are the project-wide fixed constants —
  `pass` / `intermediate` / `advanced`, fixed colours Green / Blue / Orange —
  imported from `document-shell` (FR-DS-6), never redefined or made
  configurable here. Template criteria span all three. *(FR-MM-1)*
- **FR-MMB-4** — A criterion's `draftScore` and `maxScore` are editable in
  **exactly one place** — the template. No per-student instance stores its
  own copy of either. *(FR-MM-2, FR-MM-3, INV-DM-19 lineage)*
- **FR-MMB-5** — Each criterion binds to **one or more** assessments via
  `assessmentIds[]` — the unit's final assessment, one or more of its mini
  assessments, or a mix of both. A criterion with zero bound assessments may
  exist mid-edit but is refused on save. *(OQ-MMB-2)*
- **FR-MMB-6** — Every `assessmentIds[]` entry **resolves** to a real
  assessment record supplied by `unit-assessment-document`; an unresolvable
  id is refused, naming the offending criterion. *(INV-DM-4 lineage)*
- **FR-MMB-7** — The roster used by this document supports adding and
  removing a student, `{ id, name }`. Removing a student cascades to delete
  their page and every score/comment on it, after a confirmation naming
  what will be lost. *(AD-MMB-6)*
- **FR-MMB-8** — Removing a criterion from the template cascades to remove
  every score/comment referencing it from every student page, after a
  confirmation naming how many students are affected. *(OQ-MMB-1)*
- **FR-MMB-9** — Each student has **one page**, rendering every template
  criterion grouped by tier, with an awarded-score input and a per-criterion
  comment field, entered through the HTML control layer only — never
  edited inside the SVG. *(FR-MM-5, FR-DS-2)*
- **FR-MMB-9a** — Every criterion row on a student's page shows, individually
  and simultaneously, its own **awarded value**, its own **max score**, and
  its own **contribution to the tier subtotal** — never a row that hides any
  of the three or folds a criterion's arithmetic into a group figure before
  the row itself is visible. Each mark and half-mark a student earns must be
  traceable to the exact row it came from.
- **FR-MMB-10** — An awarded score is constrained to `0…maxScore` for its
  criterion (inclusive); an out-of-range entry is rejected at the control,
  not silently clamped. Granularity: the control's primary affordance steps
  in **0.5 increments** (click/step or a keyboard step shortcut); a **typed**
  value is also accepted down to **one decimal place**, so `2.5` is a single
  step away and `2.3` is reachable by typing. A value with more than one
  decimal place, or off a criterion's own scale (e.g. above `maxScore`), is
  rejected the same way an out-of-range integer is. *(JS-2, AD-MMB-8,
  resolves OQ-MMB-3)*
- **FR-MMB-11** — A student instance stores **only** `{ criterionId,
  awardedScore, comment }` per scored row — no criterion text, no tier, no
  draft or max score. An instance carrying any of the template's shared
  structure is invalid. *(FR-MMB-4, INV-DM-19 lineage)*
- **FR-MMB-12** — Totals are **computed on render, never stored**: a subtotal
  per tier and one overall total, following the rounding and empty-score
  rule in AD-MMB-5 — unscored criteria count as zero, so a total always
  resolves to a number. *(AD-MMB-4)*
- **FR-MMB-10a** — An **unmarked** criterion is rendered visually distinct
  from one deliberately scored **0** — in edit view and in print view. The
  arithmetic treats them alike (AD-MMB-5); the display must not, or the
  teacher cannot see what still needs marking.
- **FR-MMB-13** — The matrix document declares an **orientation** — portrait
  or landscape — **stored on the matrix**, defaulting to **portrait** (G-7).
  Changing it re-renders into a new document per `document-shell`'s
  immutable-per-document orientation rule (AD-DS-4); it is not a live
  in-place toggle. *(FR-MM-7, INV-DM-13)*
- **FR-MMB-14** — Prints to A4 with **exactly one page per student**, correct
  page breaks between students, no clipping, tier colours preserved, in
  whichever orientation is stored. Every print view assessment or criterion
  reference is a **human-readable citation** — the assessment's name, never
  its raw id. *(FR-MM-7, FR-MM-8 superseded form)*
- **FR-MMB-15** — Reads and writes the unit **only** through the
  `local-store` client. This build never calls the bundle server directly
  and never touches the filesystem. *(AD-13)*
- **FR-MMB-16** — Produces **no CSV output of any kind**. Persisted scores
  are available to `csv-export` only through `local-store`'s normal read
  path. *(§3 Out of scope)*
- **FR-MMB-17** — Vanilla ES modules only — no framework, no bundler, no
  third-party library. *(FR-SYS-8, JS-7)*
- **FR-MMB-18** — CSS uses only tokens from `variables.css`; no hardcoded
  values, no `!important`; one file per component, each under 150 lines.
  *(CSS-1, CSS-2, CSS-5)*
- **FR-MMB-19** — The per-student page's criteria table reads as a
  **spreadsheet**, not prose: every row has a visible bottom border, every
  numeric column (awarded score, max score, subtotal) is aligned so digits
  stack on a shared position, numbers **right-align on the decimal point**,
  and row height is compact and uniform (no row taller than any other purely
  because of wrapped comment text pushing the whole row open). *(Luke's
  mockup direction — "look more like a spreadsheet")*
- **FR-MMB-20** — Data entry across the criteria table is **keyboard-first**:
  typing a value into a cell and pressing **Enter** commits it and moves
  focus to the equivalent cell in the next row; **Tab**/**Shift+Tab** move
  focus horizontally between a row's editable cells (score, comment); the
  **arrow keys** move focus by one cell in the corresponding direction
  without requiring a mouse click first. Focus never leaves the grid to the
  browser chrome mid-entry. *(JS-2, JS-6)*
- **FR-MMB-21** — Per-tier subtotals and the unit total render **inside the
  grid** (not a separate summary panel below it) and **update live** as each
  score is entered or edited — no explicit "recalculate" or save step is
  needed to see a current figure, consistent with totals being computed on
  render (AD-MMB-4). *(AD-MMB-4, AD-MMB-5)*
- **FR-MMB-22** — A **whole-class entry grid** — students as columns,
  criteria as rows — exists as an **edit view only**, reading and
  writing the same `local-store` data as the per-student pages. It is never
  printed and never replaces the one-page-per-student print model
  (FR-MMB-14, AD-MMB-2). Entering or editing a score in either view is
  immediately reflected in the other, since both render from the same
  underlying instance data. *(AD-MMB-9)*
- **FR-MMB-23** — The class-grid and keyboard-navigation code is **hand-rolled
  vanilla JS** — no spreadsheet/grid library, no framework, no bundler.
  *(FR-MMB-17, JS-7, SR-2)*
- **FR-MMB-24** — A criterion can be added **directly from within the
  marking view** — the whole-class grid (AD-MMB-9) or the per-student page —
  without navigating away to a separate template editor edit view. The
  affordance writes the same `{ id, tier, criterion, draftScore, maxScore,
  assessmentIds[] }` shape through the same save/validation path as the
  template editor's own add (FR-MMB-2, FR-MMB-5, FR-MMB-6); it is a second
  entry point onto the one `matrixTemplate`, never a second criteria store.
  *(Luke: "I want the ability to add rows the marking matrix")*
- **FR-MMB-25** — Adding a criterion from within the grid (FR-MMB-24)
  surfaces a warning **at the moment of adding, before the criterion is
  committed**, stating plainly: a criterion is a **template-level object**
  (AD-19/INV-DM-19's one-template-many-thin-instances) — adding it adds an
  unmarked row to **every** student, including students already fully
  marked, and since an unmarked criterion counts as zero in Data entry mode
  (AD-MMB-5 / FR-MMB-29), it **lowers every existing student's total**
  until the new row is marked. The warning must be seen and explicitly
  confirmed or cancelled before the add takes effect; cancelling adds
  nothing. *(AD-MMB-10)*
- **FR-MMB-26** — A **display-mode toggle** controls **what every
  individual cell in the matrix shows** — not, primarily, how a subtotal or
  the unit total is presented. Each mode defines one cell-level formula;
  per-tier subtotals and the unit total are **derived by summing that same
  cell-level formula across a tier/the unit** — there is no separate
  totals-presentation layer. Four modes, in Luke's own order: **Default
  Empty** (default), **Default Full**, **Data entry**, **Part of**
  (FR-MMB-27…30). *(Luke: "Three way toggle Default Empty = zero in cells,
  Default Full = shows max possible score in each cell (adjustable), Data
  entry = auto saved when entered… Part of = shows data as the mark out of
  total possible marks." — see OQ-MMB-9 on the "three way" vs. four-modes
  discrepancy.)* Three of the four modes (Default Empty, Data entry, Part
  of) never write anything when switched into. **Default Full is the
  deliberate exception** — see FR-MMB-28 and AD-MMB-11/AD-MMB-12.
- **FR-MMB-27** — **Default Empty mode** (default toggle position, and the
  state a freshly created matrix opens in). Every cell renders literal `0`,
  regardless of any `awardedScore` already saved for that criterion —
  Default Empty is a clean-slate view of the template's shape, not a
  reduced view of real data. Per-tier subtotals and the unit total
  therefore always render `0 / <tier or unit maxScore sum>` (e.g. `0/25`)
  in this mode. Default Empty **never reads or reflects `awardedScore`** at
  render time, and it never writes anything.
- **FR-MMB-28** — **Default Full mode — the mark-allocation design
  surface, and the one mode that writes.** Every cell renders its
  criterion's `maxScore`, and that value is **adjustable directly in the
  grid while this mode is active** — an in-grid entry point onto the same
  single-source template field FR-MMB-4 already governs (the same
  "second entry point, not second store" pattern as FR-MMB-24's in-grid
  add), never a second place `maxScore` can be edited. Because the
  criterion's `maxScore` is shared template state, **an edit here changes
  that criterion's mark ceiling for every student**, not just the cell
  being edited. This must be **surfaced to the user plainly**: while
  Default Full is active, the grid carries a persistent, visible notice
  that edits here change every student's ceiling (AC-MMB-30) — this is a
  standing state notice, not a per-edit confirmation dialog (FR-MMB-25's
  one-off warning is for the different, already-covered case of *adding* a
  criterion). Per-tier subtotals and the unit total render
  `<tier or unit maxScore sum> / <same sum>` — always 100% — since Full
  mode ignores every `awardedScore`. *(AD-MMB-11, AD-MMB-12)*
- **FR-MMB-29** — **Data entry mode — where marks are actually entered.**
  Every cell renders the criterion's `awardedScore` if one has been
  entered, otherwise `0` (visually distinct from a deliberately-scored `0`
  per FR-MMB-10a). Entering or changing a value **auto-saves on entry or
  change** — no explicit save step — recalculates live, and is associated
  with the student whose page/column it was entered on (the same
  live-update contract as FR-MMB-21). **Data entry must not alter any
  criterion's `maxScore`** — Luke was explicit that mark-allocation design
  and mark entry are separate activities (AD-MMB-12); this mode is
  therefore **read-only on `maxScore`** and must refuse or simply not
  offer an edit control for it (AC-MMB-29). Per-tier subtotals and the
  unit total carry forward AD-MMB-5's existing rule unchanged: an unmarked
  criterion counts `0` in the numerator and its full `maxScore` in the
  denominator, so every subtotal and the unit total always resolve to a
  real number. *(AD-MMB-5, AD-MMB-11, AD-MMB-12)*
- **FR-MMB-30** — **Part of mode — RESOLVES OQ-MMB-7.** Every cell renders
  the criterion's mark **as a per-cell fraction**, awarded over possible:
  unmarked renders `0/1`, `0/10`, or whatever that criterion's own
  `maxScore` is; marked renders e.g. `1/1` or `5/10`. This is Luke's own
  wording verbatim: "Part of = shows data as the mark out of total
  possible marks. Without data shows as 0/1 or 0/10 or whatever, with
  marks it might show as example 1/1 or 5/10 etc" — a **per-cell** display,
  not an aggregate ratio, superseding the earlier provisional reading that
  treated Part of as an aggregate over marked-so-far criteria (that earlier
  reading is retired; see OQ-MMB-7). Per-tier subtotals and the unit total
  use the **same summation as Data entry mode** (FR-MMB-29) — sum of
  `awardedScore` (unmarked = 0) over sum of `maxScore` — so a subtotal
  reads identically whether the matrix is in Data entry or Part of mode;
  only each **cell's** presentation differs (a raw number vs. a per-cell
  fraction). Part of never writes.
- **FR-MMB-31** — The selected display mode is a **view preference stored
  on the matrix document** — the same pattern as `orientation` (AD-MMB-7) —
  never on a student instance and never mixed into a criterion's or a
  score's own fields. **Switching between modes writes nothing, always** —
  that invariant is unconditional and holds even though Default Full's
  in-grid `maxScore` edit (FR-MMB-28) does write: the edit is a deliberate,
  explicit user action taken *while* Default Full is active, never a
  side effect of the switch itself. Mode selection carries no per-student
  state and is never part of the thin-instance shape guarded by
  FR-MMB-11. *(AD-MMB-11)*
- **FR-MMB-32** — The **print view always renders using Data entry
  mode's arithmetic and cell display** — raw awarded values, unmarked
  rendered as a visually-distinct `0` (FR-MMB-10a) — regardless of whatever
  mode is selected in edit view at print time. A printed sheet handed to a
  student or filed as a record must show the true mark, never a mode that
  hides real marks (Default Empty), shows a purely hypothetical ceiling
  (Default Full), or reformats the same true mark as a per-cell fraction
  instead of the sheet's established raw-number format (Part of).
  *(AD-MMB-11)*
  **⚠️ AMENDED 2026-08-20 (Change W).** This text described the ONLY print
  output that existed at the time; it no longer describes the whole of
  print. Luke: *"I want a clearer distinction in the marking matrix between
  setting the grades mode and entering student data mode. Both can be
  printed."* This requirement now governs **only when the Student data
  activity is active** — its "raw awarded values, unmarked as a visually
  distinct 0" rule stands unchanged for that case. When the **Setup**
  activity is active instead, print produces a *different*, new artefact —
  FR-MMB-43. The two are additional to each other, not a replacement: this
  requirement's own text is left exactly as written, for the record of
  what print did before Setup had a print path of its own. See AD-MMB-19.

### Scope axis — per-assessment vs full-unit (New — Change T; FR-MM-9/10)

- **FR-MMB-33** — A **scope** control, independent of the display-mode
  toggle (FR-MMB-26) and orientation (FR-MMB-13), selects **full-unit**
  (default — every criterion, all tiers, all assessments) or
  **per-assessment** (criteria filtered to `criterion.assessmentIds[]`
  containing one chosen assessment id). Available in the whole-class grid,
  the per-student page, and print alike — the same view, filtered, not a
  second view. (FR-MM-9)
- **FR-MMB-34** — **Per-assessment print** produces one A4 page per student
  **for the selected assessment**, using the matrix's stored orientation and
  the print-view's fixed Data entry arithmetic (FR-MMB-32, unaffected by
  scope). This is an **additional, explicitly-invoked** print output — never
  bundled automatically into the default full-unit print run, and never
  replacing it (AD-MMB-15, extends AD-MMB-2 rather than reversing it: the
  per-student, one-page **full-unit** print stays the default and requires
  no extra step; per-assessment print is a second, deliberately separate
  print action). (FR-MM-9)
- **FR-MMB-35** — **Roll-up.** A per-assessment subtotal sums the same
  render-time formula as the full-unit total (AD-MMB-4/5), restricted to
  criteria whose `assessmentIds[]` includes the selected assessment. A
  criterion bound to more than one assessment contributes its **full** mark
  to each of those assessments' own per-assessment subtotals, and **exactly
  once** to the full-unit total — the full-unit total is computed directly
  from all criteria, never as a sum of per-assessment subtotals (which would
  double-count a shared criterion). (FR-MM-10)
- **FR-MMB-36** — Scope is a **view preference stored on the matrix
  document** — the same pattern as orientation (AD-MMB-7) and display mode
  (AD-MMB-11) — never on a student instance, and it introduces **no new
  criteria, no new scores, and no new document**. Switching scope writes
  nothing. (AD-MMB-14, INV-DM-40)

### Tiered-ceiling grading model — REVERSES OQ-MMB-8 (New — Change U; FR-MM-11/12)

(OQ-MMB-8, closed 2026-08-19 as "no normalisation — `maxScore` stays a raw
mark," is marked **superseded** below, not deleted or reworded — Luke has
since explicitly decided the unit total is a fixed 100, reached by
allocating tier budgets across criteria.)

- **FR-MMB-37** — **Allocation algorithm.** For each tier, given `N`
  non-overridden criteria and a fixed budget (Pass 50, Intermediate 25,
  Advanced 25): `rawShare = budget ÷ N`; each criterion's `maxScore` is set
  to `rawShare` **floored to the nearest 0.5**; the remainder
  (`budget − N × flooredShare`, always an exact multiple of 0.5) is
  distributed as **one extra 0.5 mark** to the first `remainder ÷ 0.5`
  criteria, in the tier's existing stable `criteria[]` array order. This is
  **deterministic** — the same criteria set, in the same order, always
  produces the same allocation — and always lands exactly on the tier's
  budget with no remainder lost (INV-DM-38). **Worked example** (3 Pass, 2
  Intermediate, 4 Advanced criteria — see AD-40 for the full derivation):
  Pass → `[17, 16.5, 16.5]` (sum 50); Intermediate → `[12.5, 12.5]` (sum 25,
  the evenly-divisible case); Advanced → `[6.5, 6.5, 6.0, 6.0]` (sum 25). A
  student scoring full marks on Pass only totals **50/100**; full marks on
  Pass + Intermediate totals **75/100**; full marks on all three totals
  **100/100** — the three tier ceilings named in FR-MM-11, demonstrated
  numerically. This is the **mandatory worked example** this build's
  acceptance criteria (AC-MMB-34/35) exercise directly.
- **FR-MMB-38** — **Re-allocation on add/remove.** Adding or removing a
  criterion within a tier (FR-MMB-2, FR-MMB-24) **re-runs FR-MMB-37's
  algorithm for that tier only**, across whatever non-overridden criteria
  remain, and **reuses FR-MMB-25's mandatory warning pattern** — surfaced at
  the moment of the add/remove, before it commits, naming that every
  non-overridden criterion in the tier may have its `maxScore` (and
  therefore every already-marked student's tier subtotal) change as a
  result. Cancelling leaves the tier's allocation untouched.
- **FR-MMB-39** — **Manual override.** Editing a criterion's `maxScore` by
  hand in Default Full mode (FR-MMB-28) sets `allocationOverridden: true`
  on it (INV-DM-39). An overridden criterion is **excluded** from FR-MMB-37/
  38's automatic allocation from that point on; the tier's remaining budget
  (its fixed budget minus the sum of its overridden criteria's `maxScore`s)
  is what FR-MMB-37 divides across the tier's **non-overridden** criteria
  only. If overridden criteria alone exceed the tier's budget, the tier
  renders a **visible, persistent "unbalanced" flag** (the same standing-
  notice pattern as FR-MMB-28's Default Full notice) — never blocked, never
  silently corrected.
- **FR-MMB-40** — **Unallocated tier.** A tier with **zero** criteria has no
  budget to divide (INV-DM-38) and is shown with a visible "not yet set up"
  state distinct from a fully-allocated tier reading `0 / 50` — the same
  distinction FR-MMB-10a already draws between "unmarked" and "marked 0,"
  applied here to a tier that has no rows at all rather than to a row with
  no mark.
- **FR-MMB-41** — AD-MMB-5's **unmarked-criterion-counts-as-zero** rule is
  **unchanged** by the ceiling model: only the *source* of a criterion's
  `maxScore` typically changes (auto-allocated instead of freely typed); the
  Data entry/Part of totals formula, and FR-MMB-10a's unmarked-vs-zero
  visual distinction, are exactly as specced before Change U.
- **FR-MMB-42** — FR-MMB-30's **Part of mode `possible`** value is
  **unchanged in definition** by the ceiling model: it is still literally
  that criterion's current `maxScore`, whatever value it holds — allocated,
  or manually overridden. No new fraction format, no new mode.

### Setup-mode print — REVERSES part of AD-MMB-11/FR-MMB-32 (New — Change W)

*(The mockup — `MatrixSetupPrint.dc.html` — was built ahead of its spec this
session, on the working assumption that both activities need a print path.
Luke has since confirmed the mockup is correct; this section specs it to
match, retroactively.)*

- **FR-MMB-43** — When the **Setup** activity is active (Default Empty or
  Default Full, AD-MMB-13), print produces a **blank marking sheet**, one A4
  page per print run, not one per student: every criterion, grouped by tier,
  with its allocated `maxScore` (FR-MM-12) shown; an **empty, visibly
  writable score cell** per criterion (bordered, sized for a handwritten
  mark) in place of any value; a blank ruled line per criterion for a
  handwritten comment; a blank underlined field for a student's name,
  filled in by hand; each tier's subtotal row showing the tier's **maximum**
  only, its achieved-subtotal cell left blank; and the unit's total
  available marks (**100**, FR-MM-11) with **no achieved score and no
  percentage** anywhere on the page. No `awardedScore`, no per-student data,
  and no completion state may appear — this is a template artefact, not a
  record of any student's work. It is a **separate, explicitly-invoked**
  print action alongside the Student-data print of FR-MMB-32, on the same
  additive footing as per-assessment print (AD-MMB-15) — neither replaces
  the other, and neither auto-triggers the other. *(AD-MMB-19)*

### Print header identity and unit-progress block — Student-data print only (New — Change AD)

*(Both requirements below extend FR-MMB-14/FR-MMB-32 without amending
their text — FR-MMB-14's "one page per student, human-readable citation"
rule and FR-MMB-32's "raw awarded values, Data entry arithmetic" rule both
stand exactly as written; this section adds new content to the same
Student-data sheet, on top of them.)*

- **FR-MMB-44** — The Student-data print header shows, in place of any
  page-position counter, three elements: the **student's name**; the
  **class/unit**; and the **assessment identity** — under full-unit scope
  (FR-MMB-33) this third element is the scope's own label (e.g. the unit
  name, read as "every assessment"); under per-assessment scope it is the
  **selected assessment's** human-readable name (the same citation rule
  FR-MMB-14 already applies to criterion/assessment references — never a
  raw id). When the Setup activity is active instead (FR-MMB-43's sheet),
  this requirement does not apply — Setup's header carries the class/unit
  and the literal label "Setup" in the position the identity element would
  otherwise occupy, and never renders an empty student-name field. (FR-MM-14,
  AD-47)
- **FR-MMB-45** — The Student-data print sheet renders an additional
  **unit-progress block**, positioned below the criteria table established
  by FR-MMB-14/FR-MMB-19, listing **every assessment bound to any criterion
  in the unit's `matrixTemplate`** — the final assessment and every mini
  assessment, in the unit's existing stable order — regardless of which
  scope (FR-MMB-33) is currently selected for the criteria table above it.
  Each row shows that assessment's **per-assessment subtotal for this
  student**, computed by the same roll-up formula as FR-MMB-35, restricted
  to criteria whose `assessmentIds[]` includes that assessment; an
  assessment with no scored criteria for this student renders the same
  visually-distinct dash FR-MMB-10a already uses for an unmarked cell, not
  a `0`. Below the rows, a **unit total** renders the same tiered-ceiling
  figure the criteria table's own unit total already computes (AD-MMB-4,
  AD-40) — **read from that existing computation, never re-derived by
  summing the block's own rows.**
  **Layout requirement, not a copy requirement:** because a criterion may
  be bound to more than one assessment (`criterion.assessmentIds[]` with
  length > 1, AD-MMB-3), the assessment rows will sum to **more** than the
  unit total whenever any criterion is shared — the rows and the total are
  therefore laid out as two visually distinct elements, not one column
  feeding one sum: the unit total sits in its own bordered panel, separated
  from the row list by a visible rule and gap, its own label ("Unit total")
  and its own larger/bolder styling — mirroring the existing visual
  separation between the per-student page's criteria table and its own
  totals band. No caption, footnote, or on-page sentence explaining *why*
  the rows don't sum may appear (SR-9) — the separation itself carries the
  distinction. This block **never appears** on the Setup blank sheet
  (FR-MMB-43) — it depends on a specific student's scores, which that sheet
  by definition never carries. (FR-MM-15, AD-47, AD-MMB-20)

**Acceptance criteria**

- **AC-MMB-1** — A fixture unit with 3 assessments (1 final, 2 mini) and 12
  criteria (4 per tier) renders one `matrixTemplate` editor; grepping the
  saved unit for a `lessonId` anywhere under the matrix data returns nothing.
- **AC-MMB-2** — Adding, editing, removing and reordering a criterion in the
  template round-trips through save/reload via the `local-store` fixture,
  including its `tier`, `draftScore`, `maxScore` and `assessmentIds[]`.
- **AC-MMB-3** — Editing a criterion's `draftScore` on the template is
  reflected on every existing student page without touching any student's
  own record.
- **AC-MMB-4** — Saving a criterion with `assessmentIds: []` is refused with
  a message naming the criterion; saving one with an unresolvable assessment
  id is refused, naming the id.
- **AC-MMB-5** — Adding a student creates a new page with every current
  criterion, all scores blank. Removing a student, after confirming a
  dialog that names the student and states their scores will be lost,
  deletes their page and every score referencing it.
- **AC-MMB-6** — Removing a criterion that has scores on 3 of 5 students
  prompts a confirmation naming "3 students", then removes the criterion
  and all 3 affected score entries; the other 2 students' pages are
  untouched.
- **AC-MMB-7** — Entering an awarded score above a criterion's `maxScore` (or
  below 0) is rejected at the input; a valid in-range score, including a
  half-mark where `maxScore` allows fractions, saves and round-trips.
- **AC-MMB-8** — A student instance saved to the fixture contains, per
  scored row, only `criterionId`, `awardedScore` and `comment` — no
  `tier`, `criterion`, `draftScore` or `maxScore` key anywhere in it.
- **AC-MMB-9** — Every subtotal and the overall total render as a number at
  all times, matching AD-MMB-5's rounding. An unscored criterion contributes
  0 to the numerator and its full `maxScore` to the denominator: a fixture
  with one criterion scored 5/5 and one unscored out of 5 totals 5/10 (50%),
  not 5/5 (100%). An unmarked row remains visually distinguishable from a
  row scored 0 (FR-MMB-10a).
- **AC-MMB-10** — A fixture set to portrait prints A4 pages at 210×297 mm;
  the same fixture switched to landscape re-renders and prints at 297×210
  mm; both preserve tier colours and produce exactly one page per student.
- **AC-MMB-11** — The print view for a criterion bound to two assessments
  shows both assessments' names in the citation; no raw assessment or
  criterion id appears anywhere in print view.
- **AC-MMB-12** — Inspecting network activity during a full edit-and-print
  pass shows calls only into `local-store`'s exported functions — no direct
  `fetch()` to the bundle server, and no file written outside it.
- **AC-MMB-13** — Grepping the build's source for a framework, bundler, or
  third-party package import returns nothing; every CSS file is under 150
  lines, uses only `variables.css` tokens, and contains no `!important`.
- **AC-MMB-14** — Stepping a score control moves it in 0.5 increments (e.g.
  `2` → `2.5` → `3`); typing `2.3` directly into the same control is accepted
  and round-trips; typing `2.33` (two decimals) is rejected at the control.
- **AC-MMB-15** — A fixture criterion row simultaneously displays its
  awarded value, its max score, and its own contribution to the tier
  subtotal; hiding or omitting any one of the three fails the check.
- **AC-MMB-16** — Measuring the rendered criteria table: every row has a
  visible border, numeric columns are decimal-aligned (a value's decimal
  point sits at the same horizontal position across every row in that
  column), and row height does not vary between an unscored row and a
  fully-commented row beyond a tolerance the fixture defines as "compact."
- **AC-MMB-17** — Starting focus on the first row's score cell: pressing
  **Enter** commits the value and moves focus to the next row's score cell;
  pressing **Tab** moves focus to that row's comment cell; pressing the
  **down arrow** from a score cell moves to the score cell one row below;
  focus never lands outside the grid's editable cells during this sequence.
- **AC-MMB-18** — Entering a score updates the row's own contribution
  (AC-MMB-15), its tier's subtotal, and the unit total in the same render
  pass — no reload, no explicit recalculate action, no stale figure visible
  at any point in between.
- **AC-MMB-19** — Entering a score for one student/criterion pair in the
  whole-class grid is reflected on that student's per-student page (and vice
  versa) without a page reload; printing that student still produces exactly
  one A4 page (FR-MMB-14 unaffected).
- **AC-MMB-20** — A fixture with a raw tier total of 27.5 out of a possible
  45 renders the raw total as `27.5 / 45` (one decimal place, since a
  fractional score exists per AD-MMB-5) and the percentage as `61%`
  (`27.5 ÷ 45 × 100 = 61.11…`, rounds down per AD-MMB-5's ordinary rounding —
  ties only round up exactly at `.5`).
- **AC-MMB-21** — Adding a criterion from the whole-class grid (FR-MMB-24)
  round-trips through save/reload exactly like the template editor's own
  add (AC-MMB-2): the new criterion appears in `matrixTemplate.criteria[]`,
  and every existing student's page gains the new row, unmarked.
- **AC-MMB-22** — Adding a criterion in-grid to a fixture where 3 of 5
  students already have scores on other criteria triggers the FR-MMB-25
  warning, naming that every student's total will drop until the new row
  is marked; confirming proceeds with the add, cancelling leaves
  `matrixTemplate.criteria[]` and every student page unchanged.
- **AC-MMB-23** — **Gate test.** Switching a fixture through all four
  display modes (Default Empty → Default Full → Data entry → Part of →
  Default Empty) performs zero writes to any student instance or template
  criterion — asserted by diffing the fixture's persisted state before and
  after every switch. Only the rendered cells/numbers change. This test
  covers **switching only**; it does not exercise Default Full's in-grid
  `maxScore` edit, which is a deliberate write covered separately by
  AC-MMB-29.
- **AC-MMB-24** — **Worked example, Default Empty mode.** The display-mode
  fixture (5 criteria, `maxScore` 5 each = 25 possible, 2 marked 4 and 3,
  3 unmarked) renders **every cell** as `0` — including the two marked
  criteria's cells — and the tier subtotal as `0 / 25` (0%), regardless of
  the underlying saved marks.
- **AC-MMB-25** — **Worked example, Default Full mode.** The same fixture
  renders **every cell** as its own `maxScore` (`5` in each of the 5 cells)
  and the tier subtotal as `25 / 25` (100%), regardless of which criteria
  are actually marked. A visible notice is present in the UI stating that
  edits in this mode change every student's ceiling (AC-MMB-30).
- **AC-MMB-26** — **Worked example, Data entry mode.** The same fixture
  renders each cell as its raw awarded value — `4`, `3`, and `0`, `0`, `0`
  for the three unmarked criteria (visually distinct per FR-MMB-10a) — and
  the tier subtotal as `7 / 25` (28%), matching AD-MMB-5's unmarked-counts-
  as-zero rule.
- **AC-MMB-27** — **Worked example, Part of mode.** The same fixture
  renders each cell as a per-cell fraction: `4/5`, `3/5` for the two marked
  criteria and `0/5` for each of the three unmarked criteria — and the
  tier subtotal as `7 / 25` (28%), numerically identical to Data entry
  mode's subtotal (AC-MMB-26). Record this identity plainly in the test
  output: it is the resolved reading of OQ-MMB-7 — Part of and Data entry
  share one totals formula and differ only in each cell's own display
  format (raw number vs. per-cell fraction).
- **AC-MMB-28** — Printing the AC-MMB-24 fixture while the edit view toggle
  is set to Default Full (or Default Empty, or Part of) still produces a
  print view showing raw awarded values with unmarked rows visually
  distinct — `4`, `3`, `0`, `0`, `0` and a `7 / 25` (28%) subtotal, Data
  entry mode's figures — never the edit view mode's cell display or figure.
- **AC-MMB-29** — **Gate test (TEST-7), maxScore read-only boundary.**
  Attempting to edit a criterion's `maxScore` while Data entry mode is
  active is refused (blocked path) — the control is either absent or
  rejects the edit, and no write occurs; the identical edit made while
  Default Full mode is active succeeds and round-trips into
  `matrixTemplate.criteria[].maxScore`, visible on every student's page
  afterward (permitted path).
- **AC-MMB-30** — While Default Full mode is active, the grid displays a
  persistent, visible notice that editing here changes every student's
  mark ceiling; the notice is absent in the other three modes.
- **AC-MMB-31** — *(New — Change T)* A fixture with 3 assessments and 12
  criteria, switched from full-unit to a per-assessment scope naming one of
  the three, shows only the criteria bound to that assessment in the
  class grid, the per-student page, **and** a print preview; switching back
  to full-unit restores all 12 in every one of those three surfaces.
- **AC-MMB-32** — *(New — Change T)* Invoking per-assessment print for a
  fixture of 5 students produces exactly one A4 page per student for the
  selected assessment, separately from — and without altering — the
  existing full-unit one-page-per-student print output for the same
  fixture.
- **AC-MMB-33** — *(New — Change T)* A criterion bound to two assessments
  in a fixture contributes its full mark to each assessment's own
  per-assessment subtotal; the full-unit total for the same fixture is
  computed directly from all criteria and is **not** equal to the sum of
  the two per-assessment subtotals when this shared criterion is scored.
- **AC-MMB-34** — *(New — Change U)* **Worked example, allocation.** A
  fixture matrix with 3 Pass, 2 Intermediate and 4 Advanced criteria, none
  overridden, allocates `maxScore` to exactly `[17, 16.5, 16.5]`,
  `[12.5, 12.5]` and `[6.5, 6.5, 6.0, 6.0]` respectively (FR-MMB-37), each
  tier summing to its budget (50, 25, 25) with every value on a 0.5
  boundary.
- **AC-MMB-35** — *(New — Change U)* **Worked example, tier boundaries.**
  Against the AC-MMB-34 fixture: a student scored full marks on the three
  Pass criteria only totals `50 / 100`; the same student additionally
  scored full marks on the two Intermediate criteria totals `75 / 100`;
  the same student additionally scored full marks on the four Advanced
  criteria totals `100 / 100` — demonstrating FR-MM-11's three cumulative
  ceilings numerically, in Data entry mode's arithmetic.
- **AC-MMB-36** — *(New — Change U)* Running FR-MMB-37's allocation twice
  against the identical AC-MMB-34 fixture (same criteria, same order, no
  edits between runs) produces byte-identical `maxScore` values both times
  — confirming the algorithm is deterministic, not merely usually
  consistent.
- **AC-MMB-37** — *(New — Change U)* Adding a fourth, non-overridden
  criterion to the Pass tier of the AC-MMB-34 fixture surfaces a mandatory
  warning (mirroring FR-MMB-25's) naming that the tier's existing criteria
  may re-allocate before the add commits; confirming re-allocates all four
  Pass criteria to sum to 50; cancelling leaves the original three
  criteria's `maxScore`s untouched.
- **AC-MMB-38** — *(New — Change U)* Manually overriding one Advanced-tier
  criterion's `maxScore` to `10` (via Default Full, FR-MMB-28) sets
  `allocationOverridden: true` on it; adding a new Advanced-tier criterion
  afterward re-allocates the tier's **remaining** 15-mark budget
  (`25 − 10`) across the two non-overridden criteria only, leaving the
  overridden criterion at exactly `10`.
- **AC-MMB-39** — *(New — Change U)* A fixture with zero criteria in the
  Intermediate tier renders that tier with a visible "not yet set up"
  state, distinct from a fully-allocated tier's `0 / 25`; adding one
  criterion to the tier allocates it the full 25-mark budget and the
  "not yet set up" state clears.
- **AC-MMB-40** — *(New — Change W)* Printing while the Setup activity is
  active produces one page with every criterion's allocated `maxScore` and
  an empty score cell per criterion; grepping the rendered print output for
  any `awardedScore`, student name, or completion marker returns nothing.
  Printing while the Student-data activity is active is byte-for-byte
  unchanged from FR-MMB-32's existing behaviour (AC-MMB-28).
- **AC-MMB-41** — *(New — Change AD)* Printing a Student-data fixture under
  full-unit scope renders a header reading the student's name, the
  class/unit, and the scope's own label; no substring matching a
  page-number-of-N pattern (e.g. `page \d+ of \d+`) appears anywhere on the
  page.
- **AC-MMB-42** — *(New — Change AD)* The same fixture switched to
  per-assessment scope, one mini assessment selected, re-renders the header
  naming that mini assessment by its human-readable title, not its id; the
  student name and class/unit elements are unchanged.
- **AC-MMB-43** — *(New — Change AD)* Printing the Setup blank sheet
  (FR-MMB-43) renders a header carrying the class/unit and the literal text
  "Setup"; grepping the rendered output for an empty or placeholder
  student-name field in the header position returns nothing.
- **AC-MMB-44** — *(New — Change AD)* A fixture unit with 3 assessments (1
  final, 2 mini) where one criterion is bound to both mini assessments:
  printing a student's Student-data sheet renders a unit-progress block
  with 3 assessment rows whose values sum to **more** than the unit total
  shown beneath them, and the unit total figure is byte-identical to the
  same fixture's criteria-table unit total (both read the AD-40
  tiered-ceiling computation) — confirming the total is read from that
  existing computation, not derived from summing the rows. An assessment
  with no scored criteria for this student renders the same dash markup as
  an unmarked criterion cell (FR-MMB-10a), not `0`.
- **AC-MMB-45** — *(New — Change AD)* Measuring the rendered unit-progress
  block: the unit-total figure sits inside a container with a visible
  border/rule separating it from the assessment-row list, and no text node
  anywhere in the block or its surrounding markup contains an explanation
  of why the rows and total differ (grepping rendered text for phrases like
  "double-count", "shared criterion," or "does not sum" returns nothing).
  Printing the Setup blank sheet with the same fixture's template produces
  no unit-progress block at all.

## 5. Prerequisites & dependencies

- **Required first:**
  - [`document-shell`](document-shell.build.spec.md) — the paginated A4
    chassis, the fixed tier constants (FR-DS-6), and the orientation-per-
    document rule (AD-DS-4) this build's re-render behaviour depends on.
  - [`local-store`](local-store.build.spec.md) — this build's only path to
    the unit; its load/save/mutate surface and debounced-save contract must
    be settled.
  - `unit-assessment-document` — the unit's final assessment and mini
    assessments must exist and be addressable by id and name before a
    criterion can bind to one. *Specced at wave 3
    ([spec](unit-assessment-document.build.spec.md)); shape frozen — see
    OQ-MMB-4.*
- **Choose-one:** G-7 (matrix default orientation) — **already closed**:
  portrait (AD-11, arch OQ-6). This build implements that default; it does
  not reopen the gate.
- **Coordinate-with:**
  - [`csv-export`](../_Builds/_PLAN.md) — the next build downstream
    (`_PLAN.md` wave-4 order: `marking-matrix` → `csv-export`). This build
    must keep the persisted score shape (`criterionId`, `awardedScore`,
    `comment`) stable and simple enough for `csv-export` to flatten without
    re-deriving anything this build already computed.
  - `traceability-links` (wave 5) — this build prints assessment names as
    plain citations (FR-MMB-14); `traceability-links` later turns the same
    forward references (`criterion.assessmentIds[]`) into navigable links.
    Neither build should invent a second reference shape for the same edge.
  - `bigidea-list` / `curriculum-editor` — not a direct dependency, but this
    build's roster-and-criteria editing conventions (add/edit/remove/reorder,
    inline confirm-before-cascade) should read the same as those builds'
    once they exist (SR-6).

**Gate:** work may start once `document-shell` and `local-store` are
implemented (or their interfaces are frozen even if implementation trails),
and the unit's assessment shape (final + minis) is frozen — which it now is,
via the completed `unit-assessment-document` spec and the data model's
`unitAssessment` entity (INV-DM-24…27).

## 6. Decisions

- **AD-MMB-1** — *Decision:* this build supersedes the earlier per-lesson
  marking-matrix design. There is one `matrixTemplate` and one
  paginated-by-student matrix document **per unit**, scored against the
  unit's assessments (final + minis), not against individual lessons.
  *Rationale:* marking happens at assessment granularity — that is what a
  report card and a rubric actually certify — and the matrix's natural
  place is beside the unit's other singular documents, the crib sheet
  chief among them (INV-DM-18's "singular parts are singular" pattern,
  extended to the matrix). *Rejected:* retaining per-lesson matrices
  alongside the new assessment-scored ones — **explicitly rejected by
  Luke**; carrying both would mean two parallel marking systems disagreeing
  about what a score means, for no teacher-facing benefit. **Flag:** the
  data-model spec's `matrices[]` array, `Matrix.lessonId` field, and
  INV-DM-6 ("one matrix per (student, lesson) pair") / part of INV-DM-19's
  worked example should be amended by whoever next revises that document —
  this build does not edit `_Spikes/` files.
- **AD-MMB-2** — *Decision:* pagination is **by student**, one page per
  student holding all tiers and all bound criteria — not one page per
  (student, assessment) pair. *Rationale:* `document-shell` renders one
  page per printed sheet (AD-DS-2); a page-per-assessment scheme would
  multiply the print job by assessment count for no reader benefit, since a
  single student's full picture across all three tiers is the thing Luke
  actually wants on one sheet. *Rejected:* one page per (student,
  assessment) — explodes page count needlessly; a single combined page for
  the whole class — fails FR-MMB-14's per-student page-break requirement and
  becomes unreadable past a handful of students.
- **AD-MMB-3** — *Decision:* a criterion binds to assessments via
  `assessmentIds[]` — many-to-many, not a single `assessmentId`.
  *Rationale:* mirrors the existing forward-reference pattern
  (`lesson.nodeIds[]`, `assessment.nodeIds[]`) and matches how a rubric row
  often contributes to both a mini assessment and the final. *Rejected:* a
  single `assessmentId` per criterion — too restrictive for a criterion that
  genuinely marks contribution toward more than one assessment.
- **AD-MMB-4** — *Decision:* totals (per-tier subtotal, overall total) are
  **computed on render, never stored** in the instance. *Rationale:* keeps
  the persisted schema to "only what was entered" (FR-MMB-11) and avoids a
  cached total silently going stale the moment a template `maxScore`
  changes. *Rejected:* caching totals into the student instance — creates a
  second source of truth that can disagree with the template the moment
  either side is edited.
- **AD-MMB-5** — *Decision — rounding and empty scores.* A percentage
  (subtotal ÷ possible, ×100) rounds to the nearest whole number, ties
  rounding up (0.5 → 1). Raw point totals are shown to one decimal place
  only if any `awardedScore` in the unit is fractional; otherwise as plain
  integers. A criterion with **no entered score counts as zero** — it sits
  in the denominator at its full `maxScore` and contributes nothing to the
  numerator. Subtotals and the overall total are therefore **always a
  number**, from the very first mark entered. *(REVISED 2026-08-19 at
  Luke's direction — the original rule excluded unscored criteria from both
  sides and rendered a "not yet marked" state instead of a figure.)*
  A row that has never been marked is still **visually distinct** from one
  deliberately scored 0 (see FR-MMB-10a), so the display never loses the
  distinction the arithmetic collapses.
  *Rationale:* the matrix is a marking sheet whose total should read like
  the grade it will become — an unmarked criterion is worth zero marks
  until it earns some, and a running total that always resolves is simpler
  to reason about and to print. *Rejected:* excluding empty scores from
  numerator and denominator (flatters a part-marked student — a single
  correct answer out of thirty criteria reads 100%); suppressing the total
  until marking completes (leaves the sheet without a figure for most of
  its working life).
  **Naming, not reopening (revised with the cell-level display-mode
  toggle, AD-MMB-11):** this decision is now specifically **Data entry
  mode's** totals rule (FR-MMB-29), shared unchanged by **Part of mode's**
  totals (FR-MMB-30) — the toggle's other two positions, Default Empty and
  Default Full, do not use this rule at all: they render a static `0` or a
  static `maxScore` per cell regardless of any `awardedScore` (FR-MMB-27,
  FR-MMB-28). This decision's arithmetic remains what every printed page
  shows, whatever mode is selected on screen (FR-MMB-32); Default Empty,
  not Data entry, is the toggle's default screen position (FR-MMB-26,
  FR-MMB-27), since Default Empty is also the state a freshly created
  matrix opens in.
- **AD-MMB-6** — *Decision:* removing a student **cascades**, deleting their
  page and every score/comment on it, after a confirmation naming the
  student and stating what is lost. *Rationale:* mirrors the data model's
  own cascade default for a comparable case, OQ-DM-12 (deleting a lesson
  cascades its old per-lesson matrix instances, after confirmation naming
  the count) — the same shape applies one level up, to a student. *Rejected:*
  a soft-delete/archived-student state — adds a hidden roster state nobody
  asked for; a class roster is short-lived relative to the curriculum tree
  that OQ-DM-7's refuse-on-delete rule protects.
- **AD-MMB-7** — *Decision:* orientation is stored on the matrix document
  itself, defaulting to portrait (G-7, already closed). Selecting a new
  orientation re-renders into a new document rather than live-toggling the
  existing one, following `document-shell`'s AD-DS-4 (orientation immutable
  per rendered document). *Rationale:* keeps this build's orientation
  handling identical to `document-shell`'s contract rather than inventing a
  second mechanism for the one other document (besides the crib sheet)
  where orientation is user-selectable. *Rejected:* an in-place CSS rotation
  of the existing pages — exactly the failure mode AD-DS-1 already rejected
  at the shell level, for the same reasons.
- **AD-MMB-8** — *Decision — granularity of awarded scores, resolving
  OQ-MMB-3.* Fractional scores are a **first-class requirement**, not a
  defaulted-open question. The primary entry affordance steps in **0.5
  increments** (click/step control, or a keyboard step shortcut); a
  **typed** value is also accepted to **one decimal place**, so `2.5` is one
  step away and `2.3` is reachable by typing it directly. *Rationale:* half
  marks are the driving case Luke needs and should be the path of least
  resistance (one step, not a typed fraction), while a rubric occasionally
  wants finer-grained judgement (`2.3`) that a rigid 0.5-only control would
  refuse outright. One decimal place is also the precision the data model
  already uses for `maxScore`, so awarded and max scores share one scale.
  *Rejected:* **integers only** — throws away exactly the granularity Luke
  asked for and reopens a fight already settled by the mockup review;
  **free-form floats with no stepping** — technically permits `2.3` but
  makes the common case (a clean half mark) slower to enter than it needs to
  be, and invites entry noise (`2.499999…`, `2.31`) a spreadsheet-like sheet
  should not have to guard against on every read.
- **AD-MMB-9** — *Decision — a whole-class entry grid, on-screen only.* In
  addition to the per-student page, this build adds a **whole-class grid**
  (students as columns, criteria as rows) as an on-screen data-entry
  surface, alongside — never instead of — the per-student page. The grid is
  **entry and review only**; it is never printed, and it introduces no
  second print model. The printed artefact remains **exactly one A4 page
  per student**, unchanged from AD-MMB-2, FR-MMB-14, and Luke's explicit
  "each student gets their own page." *Rationale:* marking a whole class one
  criterion at a time is materially faster than opening thirty separate
  per-student pages in turn — the class grid is the natural on-screen
  complement to a per-student print artefact, the same relationship a
  spreadsheet's data-entry view has to its printed report. *Rejected:*
  **per-student entry only** (today's design) — leaves the single biggest
  ergonomic win for marking thirty students on the table; **replacing the
  per-student print page with a whole-class print sheet** — explicitly
  closed against by INV-DM-6, AD-MMB-2, and Luke's own statement that each
  student gets their own page; a class-wide print sheet would also fail
  FR-MMB-14's per-student-page-break requirement outright.
- **AD-MMB-10** — *Decision — add-from-grid, with a mandatory consequence
  warning.* A criterion can be added from within the class grid or the
  per-student page (FR-MMB-24), not only from the template editor; because
  a criterion is template-level (AD-19/INV-DM-19), the add is surfaced with
  an explicit warning (FR-MMB-25) naming the exact consequence — every
  existing student's total drops until the new row is marked, per
  AD-MMB-5's unscored-counts-as-zero rule. *Rationale:* Luke asked for the
  ability to add rows "in the grid" — routing that through a separate
  template-editor screen defeats the point of doing it inline while
  marking; but the same inline convenience makes it easy to trigger a
  class-wide total drop without realizing it, so the warning is not
  optional UI polish, it is the safety condition that makes the fast path
  acceptable. *Rejected:* adding silently, matching the template editor's
  own no-warning add — acceptable there because the template editor is a
  deliberate "I am editing the rubric" context, not true here where a
  teacher mid-marking-session could add a row as a passing thought and only
  discover the total drop later, possibly after printing; a separate
  "pending" criterion state exempt from AD-MMB-5's zero rule until
  finalized — rejected because it reopens AD-MMB-5's settled arithmetic and
  introduces a second criterion lifecycle state nothing else in this build
  has.
- **AD-MMB-11** — *Decision — a cell-level display-mode toggle, four modes,
  one write exception, Data entry always on print.* The display mode
  (FR-MMB-26) governs **what every individual cell shows**; per-tier
  subtotals and the unit total are derived from that same cell-level
  formula, not a separate presentation layer. Four modes: Default Empty
  (default), Default Full, Data entry, Part of. The mode is stored as a
  **view preference on the matrix document**, the same pattern as
  `orientation` (AD-MMB-7) — never on a student instance. The **printed
  page always uses Data entry mode's arithmetic and cell display**
  regardless of the on-screen mode (FR-MMB-32). This decision states the
  toggle's **write boundary** precisely, in three parts, because Default
  Full is a deliberate exception to "the toggle only changes what
  renders":
  1. **Switching between modes writes nothing, always.** Moving the toggle
     from any mode to any other mode — including into or out of Default
     Full — triggers no write to any student instance or template
     criterion. This is the unconditional invariant, gated by its own
     test (AC-MMB-23).
  2. **Within Default Full, an explicit user edit to `maxScore` is
     permitted and writes.** The user may deliberately type or step a new
     `maxScore` while Default Full is active; that edit routes through
     the same single-source template field FR-MMB-4 already governs
     (FR-MMB-28). This is a **user-initiated edit while a mode is active**,
     never a side effect of the switch itself — rule 1 is not violated by
     it existing.
  3. **Within Data entry, `maxScore` is read-only.** The mode must refuse
     or simply not offer any control to edit `maxScore`; only
     `awardedScore` and `comment` are editable there. This has its own
     gate test, both directions: the blocked path (an attempted edit in
     Data entry) is genuinely blocked, and the permitted path (the
     identical edit in Default Full) passes through (AC-MMB-29).
  *Rationale:* AD-MMB-4's totals-computed-on-render principle already
  treats a total as a view, not stored data — extending that principle to
  four *cell-level* formulas is the natural generalisation, and Data entry
  on print exists because a printed sheet is handed to a student or filed
  as a record; it must show the mark that will actually count, never a
  mode that hides real marks (Default Empty), shows a purely hypothetical
  ceiling (Default Full), or restyles the same true mark as a fraction
  instead of the sheet's raw-number format (Part of). Default Full's write
  exception exists because mark-allocation design has to happen somewhere,
  and doing it in-grid, in the same view the marking happens in, is
  strictly better ergonomics than a second screen — see AD-MMB-12 for why
  it is nonetheless a **separate mode** rather than folded into Data entry.
  *Rejected:* storing the selected mode per student instance — invents
  per-student view state for something that is, by definition, the same
  lens applied to every student; defaulting to Default Full or Data entry
  instead of Default Empty — Default Empty is both the toggle's default
  and the state a freshly created matrix opens in, and reopening that
  without new information is unwarranted; printing whatever mode is
  currently on screen — closed above for the same reason a flattering mode
  was rejected as the default in AD-MMB-5.
  **⚠️ AMENDED 2026-08-20 (Change W) — print clause only.** "The printed
  page always uses Data entry mode's arithmetic" described the only print
  artefact that existed at the time. It still governs whenever the
  Student-data activity is active. A second print artefact now exists for
  when the Setup activity is active instead (FR-MMB-43) — this decision's
  own text is left exactly as written, for the record of what print did
  before Setup had a print path of its own; it no longer describes print
  unconditionally. The rest of this decision — the four modes, the
  write-boundary rules, the Default Full exception — is untouched. See
  AD-MMB-19 for the amendment in full.

- **AD-MMB-12** — *Decision — mark-allocation design and mark entry are
  deliberately separate modes.* Designing the mark allocation (setting or
  changing a criterion's `maxScore`, in Default Full) and entering marks
  against students (setting `awardedScore`, in Data entry) are two
  different activities, assigned to two different toggle positions, never
  merged into one mode that permits both. *Rationale:* editing a
  criterion's ceiling while thirty students are mid-marked silently
  rescales every one of their totals the moment it happens — a teacher
  who nudges a `maxScore` up or down while thinking they are simply
  reviewing a student's page would have no warning that every other
  student's mark just moved too. Separating the two into distinct modes
  makes the dangerous edit only reachable from a mode whose entire purpose
  is "I am designing the rubric right now" (Default Full, carrying its own
  standing notice — FR-MMB-28, AC-MMB-30), and makes the common case
  (entering a student's mark) structurally incapable of triggering it
  (FR-MMB-29's read-only `maxScore`). *Rejected:* **one mode that allows
  editing both `awardedScore` and `maxScore` together** — collapses the
  two activities back into one screen and reintroduces exactly the silent-
  rescale risk this decision exists to prevent, since nothing would stop a
  `maxScore` edit from happening mid-marking-session by mistake; **a
  separate template-editor screen divorced from the grid** — this build
  already has one (the template editor from FR-MMB-2/FR-MMB-3), and it
  remains available, but a screen divorced from the grid is exactly the
  friction FR-MMB-24's in-grid-add already argued against for the parallel
  case of adding a criterion — routing mark-allocation changes through it
  exclusively would defeat the same ergonomic goal for `maxScore` that
  in-grid add already won for adding rows.
- **AD-MMB-13** — *Decision — the four modes split into two SETUP modes and
  two PER-STUDENT modes.* **Default Empty** and **Default Full** operate on
  the shared `matrixTemplate` and carry **no per-student data at all**: they
  are the setup phase, used when a unit widget is first created, to lay out
  the criteria and their mark allocation. **Data entry** and **Part of** are
  the per-student modes: both read and write (or display) marks associated
  with a named student. *Rationale:* Luke, on being asked which modes are
  saved per student: *"Only 'Data entry' and 'Part of' are saved per student
  name. 'Default Full' and 'Default Empty' are part of the setup phase when
  I've created a new unit widget."* This is not merely a UI grouping — it
  explains why Default Full may write to `maxScore` (it is template work,
  before any student exists) while Data entry may not (students are already
  marked, and rescaling the ceiling under them corrupts finished marking).
  The write-boundary rule in AD-MMB-11 is the mechanical expression of this
  split. *Rejected:* treating all four as peer views of the same per-student
  data (obscures why two of them are allowed to change the template, and
  invites a later "why can't I fix the max from here?" that would reopen a
  settled safety boundary); making the setup modes a separate screen
  entirely (the grid IS the natural surface for laying out a grid, and a
  divorced template screen was already rejected at AD-MMB-12).
  *Consequence:* the toggle should read as two pairs, and a mode switch from
  a setup mode into a per-student mode is the point at which the matrix
  stops being a design and starts being a record.

- **AD-MMB-14** — *Decision — scope is a computed filter, never new stored
  data (Change T).* Per-assessment scope (FR-MMB-33) is implemented as a
  filter of `matrixTemplate.criteria[]` by `assessmentIds[]`, rendered over
  the same `matrices[]` student instances the full-unit view already reads.
  No second criteria array, no second instance shape, no per-assessment
  copy of a score. *Rationale:* mirrors AD-MMB-4's "computed on render,
  never stored" principle and AD-MMB-11's "mode is a view, not a store"
  principle — scope is a third axis of the same kind, not a new kind of
  thing. *Rejected:* a genuinely separate per-assessment `matrixTemplate`/
  `matrices[]` pair per assessment (forks the one-template guarantee
  INV-DM-19 exists to protect, and forces a shared criterion's mark to be
  entered twice).
- **AD-MMB-15** — *Decision — per-assessment print is additional, not a
  replacement (Change T, extends AD-MMB-2).* The default printed artefact
  remains exactly what AD-MMB-2 already fixed: one A4 page per student,
  full-unit scope, no extra step required. Per-assessment print (FR-MMB-34)
  is a second, explicitly-invoked print action, producing one page per
  student **for the chosen assessment**, never triggered automatically
  alongside the default run. *Rationale:* Luke asked for both scopes in
  both edit and print view — the request is additive, not a request to
  change the default. Naming this as an **extension** of AD-MMB-2 rather
  than silently reinterpreting it keeps that decision's original text
  intact and its "one page per student" default legible as still true.
  *Rejected:* making per-assessment the new default print (breaks the
  established one-page-per-student full-unit habit for no reason a teacher
  asked for); auto-generating a per-assessment print run every time the
  full-unit one is invoked (multiplies every print job by assessment count
  for a feature only sometimes wanted — the exact multiplication AD-MMB-2
  already rejected once, for a different axis).
- **AD-MMB-16** — *Decision — the tiered-ceiling allocation algorithm
  (Change U, reverses OQ-MMB-8).* Documented in full, with its worked
  example, at [AD-40](CurriculumPreparation.arch.spec.md#ad-40--tiered-ceiling-mark-allocation-budgets-divided-across-criteria-at-setup-not-marks-rescaled-at-grading)
  in the arch spec — floor-to-0.5 per criterion, exact-remainder
  redistribution in stable array order, deterministic for any criteria
  count. Recorded here as a decision, not re-derived, to avoid the two
  specs disagreeing about the same arithmetic (SR-4).
- **AD-MMB-17** — *Decision — re-allocation on add/remove reuses FR-MMB-25's
  warning, not a new one (Change U).* Adding or removing a criterion within
  a tier re-runs AD-MMB-16's allocation for that tier and surfaces the
  consequence through the **same mandatory, must-confirm warning pattern**
  FR-MMB-24/25 already established for "adding a criterion lowers every
  student's total until marked" — extended to also cover "and every
  sibling criterion's ceiling in this tier may move." *Rationale:* this is
  the same underlying danger (a template-level edit silently affecting
  every already-marked student) FR-MMB-25 already exists to guard against;
  inventing a second, differently-worded warning for what is structurally
  the same risk would be exactly the kind of duplicated mechanism SR-4
  argues against. *Rejected:* a silent re-allocation with no warning —
  reopens the exact danger FR-MMB-25 was written to close, one layer over.
- **AD-MMB-18** — *Decision — manual override pins a criterion out of the
  allocation pool (Change U).* Full account, rationale and rejected
  alternatives at [AD-41](CurriculumPreparation.arch.spec.md#ad-41--a-manual-maxscore-override-opts-a-criterion-out-of-automatic-tier-allocation)
  in the arch spec. Recorded here as a decision, not re-derived, for the
  same SR-4 reason as AD-MMB-16.
- **AD-MMB-19** — *Decision — print follows the active activity, not a
  single hardcoded mode (Change W, amends AD-MMB-11).* AD-MMB-11's "the
  printed page always uses Data entry mode's arithmetic" clause was written
  when Student data was the only activity that existed. Luke: *"I want a
  clearer distinction in the marking matrix between setting the grades mode
  and entering student data mode. Both can be printed."* Print now branches
  on which **activity** (not which of the four display modes) is active:
  **Setup active** → the blank marking sheet of FR-MMB-43; **Student data
  active** → FR-MMB-32's existing per-student sheet, completely unchanged.
  AD-MMB-11's other two clauses — the unconditional "switching modes writes
  nothing" invariant, and Default Full's `maxScore`-edit write exception —
  are untouched by this decision; only its print clause is amended.
  *Rationale:* AD-MMB-11's original reasoning for hardcoding print to Data
  entry was sound *for the artefact that existed then* — "a printed sheet
  handed to a student ... must show the true mark, never ... a purely
  hypothetical ceiling." That reasoning still holds for the Student-data
  print path, which is why FR-MMB-32 is unchanged, not rewritten. It simply
  never anticipated a *second* print artefact whose entire purpose is to be
  a template, not a record — a blank sheet is not "a hypothetical ceiling
  masquerading as a real mark," because it makes no claim to be a record at
  all. Naming this as an amendment to AD-MMB-11's print clause, rather than
  a silent contradiction of it, keeps AD-MMB-11's original text legible as
  what governed before this build had two activities to print.
  *Rejected:* folding the blank sheet into FR-MMB-32 as a fifth "display
  mode" (conflates the mode axis, which is about what a *cell* shows, with
  the activity axis, which is about whether student data exists on the page
  at all — the same category error AD-MMB-13 already drew a line against);
  making the blank sheet the print default and requiring an extra step for
  the per-student sheet (reverses the established one-page-per-student habit
  AD-MMB-2/AD-MMB-15 both protect, for a print need that arises less often
  than marking a class).
- **AD-MMB-20** — *Decision — print header identity and a non-summable
  unit-progress block on the Student-data sheet (Change AD).* Full account,
  rationale and rejected alternatives at
  [AD-47](CurriculumPreparation.arch.spec.md#ad-47--the-marking-matrixs-student-data-print-sheet-drops-its-page-counter-for-a-sheet-identity-and-gains-a-non-summable-unit-progress-block-new--change-ad)
  in the arch spec. Recorded here as a decision, not re-derived, for the
  same SR-4 reason as AD-MMB-16/18. In short: the header (FR-MMB-44) trades
  a page-position counter for student/class/assessment identity; the new
  block (FR-MMB-45) lists every unit assessment's per-assessment subtotal
  for this student next to an independently-computed tiered-ceiling unit
  total, laid out so the two can never be misread as a column and its sum
  — because FR-MM-10's shared-criterion rule means they frequently are not
  one.

**Open questions**

- **OQ-MMB-1** — Does removing a template criterion cascade-delete matching
  scores, or refuse while any student has one? *Default:* **cascade**, with
  a confirmation naming the affected student count (FR-MMB-8) — matching
  the roster-removal shape in AD-MMB-6 rather than the curriculum tree's
  refuse-on-delete shape (OQ-DM-7), because a criterion is this build's own
  authored content, not a shared cross-referenced node.
- **OQ-MMB-2** — May a criterion be saved with zero bound assessments?
  *Default:* **no** — allowed transiently while editing in the browser, but
  refused at save (FR-MMB-5). An unbound criterion would be an orphaned
  rubric row nothing certifies against.
- **OQ-MMB-3** — ✅ **RESOLVED (2026-08-19).** Fractional (half-mark)
  awarded scores are not just allowed but a **first-class requirement**:
  the primary entry affordance steps by **0.5**, with a typed value also
  accepted to **one decimal place** — see AD-MMB-8 for the full decision,
  rationale, and rejected alternatives (integers only; free-form floats with
  no stepping).
- **OQ-MMB-4** — ✅ **RESOLVED (2026-08-19).** `unit-assessment-document` is
  now specced ([spec](unit-assessment-document.build.spec.md)) and tracked in
  [`_PLAN.md`](_PLAN.md) at wave 3. The assessment shape is frozen: the flat
  `Assessment` entity is retired, absorbed into a singular `unitAssessment`
  holding `finalAssessment` (exactly one — INV-DM-24) and `miniAssessments[]`
  (many). A criterion's `assessmentIds[]` therefore names
  `unitAssessment.miniAssessments[].id` values and/or the unit's one final
  assessment. This build adds no new project-level gate of its own.
- **OQ-MMB-5** — Does a student's page group criteria by tier or by
  assessment? *Default:* **by tier** — mirrors the fixed tier spine every
  other document uses (FR-DS-6) and matches INV-DM-7's "a matrix's rows
  cover all three tiers" framing; an assessment's own view of "who scored
  what against me" is a derived read, not a layout requirement here.
- **OQ-MMB-6** — ✅ **RESOLVED (2026-08-19).** Luke: **"all three tiers"**.
  The whole-class entry grid shows **every criterion across all three tiers on
  one screen**, as a single tall grid with the tier bands in their fixed order
  (INV-DM-5), not a tier switcher. The recorded default (one tier at a time)
  is retired. *Consequence:* the grid scrolls in both axes on a large class,
  so FR-MMB-19's density requirement and sticky headers carry more weight —
  the tier band and the criterion column must both stay visible while
  scrolling, since a marker who cannot see which tier or which criterion a
  cell belongs to will mis-enter marks. Fold that into FR-MMB-19/FR-MMB-20's
  acceptance rather than adding a new requirement.

- **OQ-MMB-7** — ✅ **RESOLVED (2026-08-19), by Luke's own direct wording.**
  What does **Part of mode** actually mean? *Resolved:* a **per-cell**
  fraction, not an aggregate ratio. Luke's exact words: "Part of = shows
  data as the mark out of total possible marks. Without data shows as
  0/1 or 0/10 or whatever, with marks it might show as example 1/1 or
  5/10 etc." Each cell renders its own criterion's `awardedScore` over its
  own `maxScore` (FR-MMB-30). The earlier provisional reading recorded
  here — an aggregate over marked-so-far criteria, numerically identical
  to what was then called Saved mode — is **retired**: Saved mode as a
  distinct named position no longer exists in the revised four-mode set
  (Default Empty / Default Full / Data entry / Part of), and Part of's
  *totals* (as opposed to its cell display) turn out to use the same
  summation as Data entry mode's totals — which is expected, not a
  problem, once "Part of" is understood as a cell-display format layered
  over the same underlying marks, not a competing arithmetic (see
  FR-MMB-30, AC-MMB-27).
- **OQ-MMB-8** — ✅ **RESOLVED (2026-08-19).** Luke: *"equals 100 = the
  total possible unit score. the `maxScore` in otherwords."* There is **no
  normalisation to a 100-point scale.** "100" was shorthand for the unit's
  own total possible score — the sum of every criterion's `maxScore`. A
  fully-marked matrix therefore totals its own raw maximum, whatever that
  number happens to be. `maxScore` stays a **raw mark**, not a weight, and
  every worked example in this spec stands as written.
  **⚠️ SUPERSEDED 2026-08-20 (Change U).** Luke has since explicitly
  reversed this: the unit total **is** fixed at 100, reached by dividing
  fixed tier budgets (Pass 50, Intermediate 25, Advanced 25) across each
  tier's criteria at setup time — allocation of a budget among criteria,
  not rescaling of an entered mark (FR-MM-11/12, FR-MMB-37…42, AD-40). This
  resolution's own text above is left exactly as written, for the record of
  what was decided and why at the time; it no longer governs. See AD-40 for
  the full reversal and its worked example.


- **OQ-MMB-9** — ✅ **RESOLVED (2026-08-19).** Luke, asked directly about
  the "three way toggle" wording against the four modes he listed:
  *"Four way toggle."* All four positions are implemented as described.
  The recorded default stands; no collapse.

- **OQ-MMB-10** — ✅ **RESOLVED (2026-08-19)** — duplicate of OQ-MMB-6,
  answered in the same breath: all three tiers on one screen. Kept as a
  numbered entry rather than deleted, so the earlier cross-references still
  resolve.
- **OQ-MMB-11** — *(New — Change T)* Does `csv-export` (unspecced, wave 4,
  downstream of this build) need to export the per-assessment scope as its
  own file, or does CSV export stay full-unit only? *Default:* **full-unit
  only for now** — FR-MMB-16 already scopes CSV export entirely out of this
  build, and nothing here blocks `csv-export` from adding a per-assessment
  export later once it exists. Duplicate of arch spec OQ-21, kept here too
  since this build is where `csv-export`'s upstream contract is coordinated
  (§5).

## 7. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| A later edit reintroduces a per-lesson field out of habit (copying old fixtures, old naming) | The superseded model creeps back in, silently forking marking data into two shapes | AD-MMB-1 stated up front; grep check for `lessonId` under matrix data in verification | AC-MMB-1 |
| Unmarked and deliberately-zero rows become indistinguishable on the page | The teacher cannot tell what still needs marking; a finished sheet and a barely-started one look alike | FR-MMB-10a keeps them visually distinct even though AD-MMB-5 scores them alike | AC-MMB-9 |
| A cached/stored total drifts from the template after a `maxScore` edit | Print view totals disagree with the live template, and nobody notices until parents' evening | Totals computed on render only, never stored (AD-MMB-4) | AC-MMB-3, AC-MMB-9 |
| Criterion or student removal leaves dangling score references | A future `csv-export` or `traceability-links` pass chokes on an unresolvable id | Cascade-delete on both removals, confirmed before it happens (AD-MMB-6, FR-MMB-8) | AC-MMB-5, AC-MMB-6 |
| A student instance accumulates its own copy of criterion text/tier/maxScore over time | Editing a draft score in one place stops being true — the whole reason the template exists | FR-MMB-11 gate test: an instance carrying shared structure is refused | gate test |
| Orientation change treated as a live toggle instead of a re-render | Diverges from `document-shell`'s contract; margins/print risk reappears exactly where AD-DS-4 already closed it | Re-render-into-new-document behaviour (AD-MMB-7) exercised directly against `document-shell` | AC-MMB-10 |
| `unit-assessment-document` lands with a different assessment shape than assumed here | Criterion bindings break or need a migration the moment the real build ships | OQ-MMB-4's explicit interim default, reviewed against the real spec once it exists | manual cross-review at both builds' completion |
| Hand-rolled keyboard cell-navigation is fragile (focus lost, wrong cell targeted) across a large grid | Marking thirty students becomes slower than the mouse-driven version it replaced, defeating FR-MMB-20's purpose | One delegated keydown handler with a single tested focus-management function shared by both the per-student and class-grid views (AD-MMB-9); no per-cell listener duplication | AC-MMB-17 |
| The whole-class grid (AD-MMB-9) and per-student page compute totals via two different code paths | The two views silently disagree on a subtotal, the exact failure AD-MMB-4 was written to prevent | Both views call the same render-time totals function; no view owns its own calculation | AC-MMB-18, AC-MMB-19 |
| A visible spreadsheet-style stepper control eats horizontal space needed for compact rows (FR-MMB-19) | The sheet stops looking like a spreadsheet the moment scores are entered, defeating Luke's own direction | Step by keyboard shortcut/modifier as the primary path; keep any visible stepper minimal and inside the existing cell width | AC-MMB-14, AC-MMB-16 |
| Adding a criterion in-grid silently drops every student's total | A teacher discovers marks dropped only after printing/parents' evening, having no idea why | Mandatory warning at add time naming the consequence, not discoverable-after-the-fact (FR-MMB-25, AD-MMB-10) | AC-MMB-22 |
| A display mode is implemented as stored per-student state instead of a render-time view | Reopens AD-MMB-4's totals-on-render principle by the back door, multiplying persisted state per mode per student | Mode stored once, on the matrix document, never on an instance (FR-MMB-31, AD-MMB-11) | AC-MMB-23 |
| Print view shows whatever mode was last selected in edit view | A hidden (Default Empty), hypothetical (Default Full), or reformatted (Part of) view leaves the building as a permanent record | Print path hardcoded to Data entry mode's arithmetic and cell display regardless of edit view state (FR-MMB-32) | AC-MMB-28 |
| Four modes implemented from prose alone, without numbers, diverge from Luke's intent | Data entry and Part of end up computed wrongly, or Default Full's write path is missed entirely, and nobody notices until Luke checks a real fixture | Worked example per mode against one shared fixture, numbers recorded in the spec itself (AC-MMB-24…27) | AC-MMB-24, AC-MMB-25, AC-MMB-26, AC-MMB-27 |
| A `maxScore` edit made in Default Full is treated as "just a view change" like the other three modes, and ships without a write path or without the write being visible to the user | Mark-allocation edits either silently fail (frustrating) or silently succeed with no indication every student's ceiling just moved (dangerous) | Default Full is named the explicit write exception to the toggle in AD-MMB-11/AD-MMB-12, with a standing edit view notice (FR-MMB-28) and its own gate test | AC-MMB-29, AC-MMB-30 |
| Data entry mode is left able to edit `maxScore` "for convenience," reopening the silent-rescale risk AD-MMB-12 exists to prevent | A teacher adjusts a ceiling mid-marking-session by mistake, rescaling every other student's total without meaning to | Data entry mode is read-only on `maxScore` by construction, with its own gate test proving the blocked path is genuinely blocked | AC-MMB-29 |
| A per-assessment scoped view is implemented as a second stored criteria/instance shape instead of a filter | Forks the one-template guarantee (INV-DM-19) the same way the old per-lesson model did — the exact failure AD-MMB-1 already exists to prevent, one axis over | Scope is a computed filter over the existing `criteria[]`/`matrices[]`, never a second store (AD-MMB-14, INV-DM-40) | AC-MMB-31 |
| Per-assessment print silently becomes the new default, or auto-runs alongside full-unit print | Breaks the established one-page-per-student full-unit habit, or multiplies every print job by assessment count unasked | Per-assessment print is a separate, explicitly-invoked action; full-unit stays the default (AD-MMB-15) | AC-MMB-32 |
| A criterion bound to two assessments gets double-counted when a per-assessment total is summed into the full-unit total | The full-unit total silently disagrees with the sum of every criterion's own mark, and a student's report looks inflated | Full-unit total computed directly from all criteria, never as a sum of per-assessment subtotals (FR-MMB-35) | AC-MMB-33 |
| The allocation algorithm is implemented from prose alone, without numbers, and quietly rounds or redistributes differently than specced | A tier's criteria stop summing to its budget, and the "totals 100" promise silently breaks the first time a tier's count doesn't divide evenly | Worked example with real numbers recorded in both the arch spec and this build spec (AD-40, FR-MMB-37), gate-tested directly | AC-MMB-34, AC-MMB-35, AC-MMB-36 |
| Adding/removing a criterion re-allocates its tier silently, with no warning that every sibling criterion's ceiling — and every already-marked student's subtotal — just moved | A teacher discovers marks shifted only after printing, having no idea why, the same failure FR-MMB-25 already exists to prevent for the simpler "add lowers totals" case | Re-allocation reuses FR-MMB-25's mandatory, must-confirm warning pattern rather than a silent write (FR-MMB-38, AD-MMB-17) | AC-MMB-37 |
| A manually overridden criterion gets silently swept back into automatic allocation the next time a sibling criterion changes | A teacher's deliberate override is invisibly undone, and the tool cannot be trusted to keep a hand-made decision | Overridden criteria are excluded from the allocation pool by a stored, checked flag, not by convention (INV-DM-39, FR-MMB-39) | AC-MMB-38 |
| A tier with zero criteria is rendered as if it had already been allocated (e.g. a bare `0/0` or `0/50`) instead of a distinct "not set up" state | A teacher cannot tell "nothing marked yet" from "nothing built yet," and the ceiling claim looks satisfied when it is actually undefined | A tier with no criteria renders a visibly distinct "not yet set up" state (FR-MMB-40, INV-DM-38) | AC-MMB-39 |
| The new Setup-mode print path leaks a student's real mark or name onto what is supposed to be a blank template | A blank sheet handed out for hand-marking, or filed as a template, carries real student data it was never meant to show | Setup print reads only `criterion`/`maxScore` — it has no code path that touches `awardedScore`, a student's name, or `matrices[]` at all (FR-MMB-43) | AC-MMB-40 |
| Setup print is implemented as a fifth display mode instead of a second activity-level artefact | Conflates the mode axis (what a cell shows) with the activity axis (whether student data exists on the page), reopening the category error AD-MMB-13 already closed | Setup print branches on activity, not on the four-mode toggle; FR-MMB-32's Data-entry print path is untouched (AD-MMB-19) | AC-MMB-40 |
| The unit-progress block's rows are quietly "corrected" (apportioning a shared criterion's mark across its assessments) so they sum to the unit total | Breaks the stronger guarantee that a row matches the mark the student was actually handed back for that assessment (FR-MM-10, FR-MMB-35) | Rows always render the true, unaltered per-assessment subtotal; the unit total is read from the existing tiered-ceiling computation, never derived from the rows (FR-MMB-45, AD-47) | AC-MMB-44 |
| The unit-progress block reads as one summable column because nothing separates the rows from the total | A student adds the rows by hand, gets a number that disagrees with the printed total, and has no way to tell why | Unit total rendered in its own bordered panel, separated by a visible rule/gap from the row list, with its own label — a layout requirement, not a caption (SR-9) | AC-MMB-45 |

## 8. Plan

See [`marking-matrix.plan.md`](marking-matrix.plan.md).

## 9. Verification — definition of done

- [ ] All acceptance criteria AC-MMB-1…40 demonstrated
- [ ] **TEST-7 gate tests exist and pass in both directions** for: an
      instance carrying shared template structure is refused vs. accepted
      when thin (FR-MMB-11), an unbound criterion is refused at save vs.
      accepted once bound (FR-MMB-5), and an unresolvable `assessmentIds[]`
      entry is refused vs. accepted once resolvable (FR-MMB-6)
- [ ] **TEST-7 gate test** for the display-mode toggle: switching through
      all four modes performs zero writes to any student instance or
      template criterion, verified by diffing persisted state before and
      after (AC-MMB-23)
- [ ] **TEST-7 gate test** for the `maxScore` read-only boundary: an edit
      attempted in Data entry mode is blocked; the identical edit made in
      Default Full mode succeeds and round-trips (AC-MMB-29)
- [ ] Default Full mode carries a persistent, visible notice that edits
      there change every student's ceiling; the notice is absent in the
      other three modes (AC-MMB-30)
- [ ] In-grid criterion add (FR-MMB-24) is blocked by an unconfirmed
      warning and proceeds only on explicit confirmation (AC-MMB-22)
- [ ] Print view always uses Data entry mode's arithmetic and cell
      display, regardless of the edit view display mode, **while the
      Student-data activity is active** (AC-MMB-28)
- [ ] While the **Setup** activity is active, print instead produces the
      blank marking sheet — every criterion's allocated ceiling, an empty
      writable cell per criterion, no `awardedScore`, no student name, no
      completion state anywhere on the page (AC-MMB-40, FR-MMB-43)
- [ ] Smoke tests per TEST-2 (`node:test` + `node:assert/strict` only,
      TEST-1): each module imports cleanly, the happy path (add a criterion,
      score a student, print) produces the right output, one guard path
      (illegal score, unbound criterion) behaves
- [ ] Every `fetch`-equivalent goes through `local-store`; no direct network
      call from this build's code (AC-MMB-12)
- [ ] Zero third-party dependencies; vanilla ES modules only (AC-MMB-13)
- [ ] Every CSS file under 150 lines, tokens only, no `!important`
      (AC-MMB-13)
- [ ] No `innerHTML` used on unit content (JS-6)
- [ ] Grep for `lessonId` under any matrix-related code/data returns nothing
      (AC-MMB-1, AD-MMB-1)
- [ ] Print measurements recorded for both orientations — page count,
      page box in mm, one page per student, tier colours matching edit view
      (AC-MMB-10)
- [ ] Reviewed against `document-shell` and `local-store` conventions (SR-6)
- [ ] **(New — Change T)** Scope round-trip: switching full-unit ↔
      per-assessment writes nothing to any student instance or template
      criterion, in both the class grid and the per-student page (AC-MMB-31)
- [ ] **(New — Change T)** Per-assessment print produces one A4 page per
      student for the selected assessment, as a separate action from the
      unchanged default full-unit print (AC-MMB-32)
- [ ] **(New — Change T)** A criterion bound to two assessments is not
      double-counted in the full-unit total (AC-MMB-33)
- [ ] **(New — Change U)** Worked-example gate tests for the tiered-ceiling
      allocation (3/2/4 criteria → `[17,16.5,16.5]` / `[12.5,12.5]` /
      `[6.5,6.5,6.0,6.0]`) and the three tier-boundary totals (50/75/100)
      pass exactly as specced (AC-MMB-34, AC-MMB-35)
- [ ] **(New — Change U)** Allocation is deterministic: re-running it against
      an unchanged criteria set produces identical `maxScore` values
      (AC-MMB-36)
- [ ] **(New — Change U)** Adding/removing a criterion in a tier surfaces a
      mandatory re-allocation warning before it commits, and cancelling
      leaves the tier's existing allocation untouched (AC-MMB-37)
- [ ] **(New — Change U)** A manually overridden criterion is excluded from
      later automatic re-allocation in its tier (AC-MMB-38)
- [ ] **(New — Change U)** A tier with zero criteria renders a visibly
      distinct "not yet set up" state, never a fabricated `0/50` (AC-MMB-39)
- [ ] Grep every FR-MM/FR-MMB/AD-MMB/AC-MMB/INV-DM id introduced by Change
      T/U for duplicates and dangling references against the PRD, data
      model and arch spec — the standing cross-file audit this project's
      registry names as the lesson from two prior requirement-family
      collisions

**On completion:** set Status to Done, `git mv` this spec and its plan to
`_Done/`, update [`_PLAN.md`](_PLAN.md) (report only from this session —
that file is not edited here), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).

**Gates explicitly not resolved by this spec:** G-2 (document packaging),
G-5 (do the generators earn their keep), G-9 (build the ingest at all) —
all three are project-level decisions outside this build's scope.
