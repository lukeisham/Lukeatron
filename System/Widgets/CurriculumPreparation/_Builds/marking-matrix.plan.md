# marking-matrix — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-19 |
| **Spec** | [marking-matrix.build.spec.md](marking-matrix.build.spec.md) |
| **Wave** | 4 |

## Prerequisites

- `document-shell` exists (or its interface is frozen) — page geometry, tier
  constants, control-layer contract, and the orientation-per-document rule
  (AD-DS-4) this build re-renders against.
- `local-store` exists and its load/save/mutate surface is settled.
- The unit's assessment shape (one final assessment, many mini assessments,
  each three-tiered) is frozen — from a completed `unit-assessment-document`
  spec, or from the interim default recorded at OQ-MMB-4.
- `style-guide`'s `variables.css` exists with the tokens this build needs
  (tier colours already exported by `document-shell`; spacing, typography,
  a distinct "unmarked row" indicator token — visual only, since
  unmarked scores as zero per AD-MMB-5).
- No spreadsheet/grid library dependency to add — the class-grid and
  keyboard-navigation work (FR-MMB-20…23) is hand-rolled vanilla JS, per the
  project's standing no-framework/no-bundler rule (FR-MMB-17).

## Steps

1. **Build the fixture.** A synthetic unit with 3 assessments (1 final, 2
   mini), a 12-row template (4 criteria per tier, mixed assessment
   bindings, at least one criterion bound to two assessments), and 5
   students. This is the test subject for every step below. Also build a
   second, smaller **display-mode fixture**: one 5-criterion tier
   (`maxScore` 5 each, 25 possible), with 2 criteria marked (4, 3) and 3
   left unmarked, and at least one other student already fully marked on a
   different tier — the shared data behind the AC-MMB-24…28 worked
   examples and the AC-MMB-22 in-grid-add warning.
   *(supports AC-MMB-1, AC-MMB-22, AC-MMB-24…28)*
2. **Build the template editor.** Render `matrixTemplate.criteria[]`
   grouped by tier; wire add, edit, remove and reorder, each writing
   `{ id, tier, criterion, draftScore, maxScore, assessmentIds[] }` through
   `local-store`. *(FR-MMB-2, FR-MMB-3)*
3. **Wire assessment binding.** A multi-select control on each criterion for
   `assessmentIds[]`, sourced from the unit's assessment records; block save
   on an empty selection or an unresolvable id, surfacing which criterion
   failed. *(FR-MMB-5, FR-MMB-6, OQ-MMB-2)*
4. **Confirm single-source draft/max scores.** Verify editing a criterion's
   `draftScore`/`maxScore` on the template is the only place either value
   can change — no code path writes either onto a student instance.
   *(FR-MMB-4)*
5. **Build the roster panel.** Add/remove a student; removing prompts a
   confirmation naming the student and what will be lost, then cascades the
   delete of their page and every score referencing it. *(FR-MMB-7,
   AD-MMB-6)*
6. **Wire criterion-removal cascade.** Removing a template criterion counts
   affected students first, confirms naming that count, then removes the
   criterion and every matching score across all pages. *(FR-MMB-8,
   OQ-MMB-1)*
7. **Build the per-student page as a spreadsheet-style grid.** One page per
   roster entry, all bound criteria grouped by tier (OQ-MMB-5), each row as
   a bordered grid row showing criterion text, an awarded-score cell, its
   max score, its own contribution to the tier subtotal (FR-MMB-9a), and a
   comment cell — entered through the HTML control layer only. Numeric
   columns decimal-align; rows are compact and uniform height regardless of
   comment length. *(FR-MMB-9, FR-MMB-9a, FR-MMB-19)*
8. **Constrain and grade awarded-score entry.** Reject any value outside
   `0…maxScore` at the control. Implement the resolved granularity
   (AD-MMB-8): a step control/shortcut moving in 0.5 increments as the
   primary affordance, with direct typed entry accepted to one decimal
   place; reject a second decimal place the same way an out-of-range value
   is rejected. *(FR-MMB-10, AD-MMB-8, resolves OQ-MMB-3)*
9. **Wire keyboard-first cell navigation.** One delegated keydown handler
   shared by the per-student grid and the class grid (step 11): Enter
   commits the focused cell and moves focus to the same cell one row down;
   Tab/Shift+Tab move focus between a row's editable cells; arrow keys move
   focus by one cell in their direction. No mouse click required to move
   between cells once the grid has focus. *(FR-MMB-20)*
10. **Confirm the thin-instance shape.** Verify a saved student record
    contains only `{ criterionId, awardedScore, comment }` per row — no
    criterion text, tier, draft or max score anywhere in it. *(FR-MMB-11)*
11. **Build totals, live and in-grid.** Per-tier subtotal and overall
    total, computed on render from the current template + instance data —
    never stored — and rendered as rows/cells inside the grid itself
    rather than a separate summary panel, updating on every keystroke that
    commits a score. Implement AD-MMB-5 exactly: nearest-whole-number
    percentage rounding (ties up), one-decimal point totals only when a
    fractional score exists, and **unscored criteria counted as zero** — 0
    to the numerator, full `maxScore` to the denominator — so every
    subtotal and the overall total always resolve to a number. Then render
    unmarked rows visually distinct from rows deliberately scored 0
    (FR-MMB-10a), since the arithmetic no longer separates them.
    *(FR-MMB-10a, FR-MMB-12, FR-MMB-21, AD-MMB-4, AD-MMB-5)*
12. **Build the whole-class entry grid.** Students as columns, criteria as
    rows, **all three tiers in one edit view** in fixed tier order
    (OQ-MMB-6, resolved — Luke: "all three tiers"); tier band and criterion
    column both stay visible while scrolling either axis;
    reuses the same keyboard-navigation handler (step 9) and the same
    render-time totals function (step 11) as the per-student page — no
    second calculation path. Reads and writes the same `local-store`
    instance data as the per-student pages, so a change in either view is
    immediately visible in the other. Entry and review only — never
    printed, never a second print model. *(AD-MMB-9, FR-MMB-22)*
13. **Confirm the class grid is hand-rolled.** No spreadsheet/grid library,
    framework, or bundler anywhere in the class-grid or keyboard-navigation
    code. *(FR-MMB-23)*
14. **Wire orientation.** A stored `orientation` field on the matrix
    document, defaulting to portrait; changing it triggers a re-render into
    a new document via `document-shell`, not a live toggle. *(FR-MMB-13,
    AD-MMB-7)*
15. **Wire the print path.** One A4 page per student, correct breaks between
    students, tier colours preserved, in the document's stored orientation.
    The class grid (step 12) never enters this path. *(FR-MMB-14, AD-MMB-9)*
16. **Render print view citations.** Every print view assessment/criterion reference
    resolves to the assessment's display name — never a raw id — reading
    the name from the assessment record supplied by `unit-assessment-document`
    (or the OQ-MMB-4 interim shape). *(FR-MMB-14)*
17. **Audit the I/O boundary.** Grep the build's source for any direct
    `fetch`/`XMLHttpRequest` call; confirm every read and write routes
    through `local-store`, and that no CSV is ever written from this code.
    *(FR-MMB-15, FR-MMB-16)*
18. **Audit dependencies.** Confirm vanilla ES modules only — no framework,
    bundler, or third-party package import anywhere in the build, including
    the grid/keyboard code from steps 9, 12, 13. *(FR-MMB-17, FR-MMB-23)*
19. **Finish the CSS pass.** One file per component, each under 150 lines,
    every value a `variables.css` token, no `!important` — including the
    grid's border/alignment/row-height styling (FR-MMB-19). *(FR-MMB-18)*
20. **Run the supersession grep.** Grep the whole build for `lessonId` (and
    any per-lesson matrix vocabulary) and confirm zero hits outside this
    spec's own prose citations. *(AD-MMB-1)*
21. **Write the gate tests (TEST-7).** Two tests each for: a thin student
    instance is accepted and one carrying shared structure is refused
    (FR-MMB-11); a criterion with a bound, resolvable assessment saves and
    one with an empty or unresolvable `assessmentIds[]` is refused
    (FR-MMB-5, FR-MMB-6); an in-range/on-granularity score is accepted and
    an off-granularity (two-decimal) or out-of-range score is refused
    (FR-MMB-10, AD-MMB-8). Plus one gate test for the display-mode toggle:
    snapshot the fixture's persisted state, switch through all four modes,
    and assert the snapshot is byte-identical afterward — no write occurs
    at any point in the switch. *(AC-MMB-23, FR-MMB-26, FR-MMB-31)*. Plus
    one gate test for the `maxScore` read-only boundary (step 32): the
    blocked path (an edit attempted in Data entry mode) is refused, and
    the identical edit in Default Full mode succeeds and round-trips.
    *(AC-MMB-29, FR-MMB-28, FR-MMB-29, AD-MMB-11, AD-MMB-12)*
22. **Write the smoke tests (TEST-2, `node:test` + `node:assert/strict`
    only per TEST-1).** Each module imports cleanly; the happy path (add a
    criterion, add a student, enter a score via keyboard navigation,
    compute a total, print) produces the right output; one guard path
    (out-of-range score) behaves as specified. Include a focused test for
    the shared focus-management function (step 9) against a small fake DOM
    grid (TEST-8).
23. **Measure printed sheets in both orientations** — page count, page box
    in mm, margins, tier-colour match against edit view. Record below.
    *(AC-MMB-10)*
24. **Measure the grid's spreadsheet density.** Row height, border
    visibility, and decimal-alignment position for the per-student grid.
    Record below. *(FR-MMB-19, AC-MMB-16)*
25. **Review against `document-shell` and `local-store`.** Confirm this
    build calls their exported surfaces exactly as documented, invents no
    parallel print or persistence mechanism. *(SR-6)*
26. **Build the in-grid add affordance.** Wire an "add criterion" control
    directly into the class grid and the per-student page, writing through
    the same save/validation path the template editor uses (steps 2, 3) —
    a second entry point onto the one `matrixTemplate`, not a second store.
    *(FR-MMB-24)*
27. **Wire the add-consequence warning.** Before an in-grid add commits,
    compute how many existing students already have any score, and show a
    warning naming that every existing student's total will drop until the
    new row is marked (AD-MMB-5's zero rule, as inherited by Data entry
    mode — step 29). Confirm proceeds with the add exactly as step 26
    built it; cancel discards the pending criterion with no write.
    *(FR-MMB-25, AD-MMB-10)*
28. **Build the display-mode toggle as a cell-level renderer.** A
    four-position control — Default Empty / Default Full / Data entry /
    Part of — stored as a display preference on the matrix document itself
    (mirroring `orientation`, step 14), defaulting to Default Empty (also
    the state a freshly created matrix opens in). The toggle governs
    **what each individual criterion cell renders**; per-tier subtotals
    and the unit total are derived by summing that same cell-level
    formula, not computed by a separate presentation layer. Switching
    between modes calls no `local-store` write path at all. *(FR-MMB-26,
    FR-MMB-31, AD-MMB-11)*
29. **Implement each mode's cell formula and derived totals**, all four
    sharing the one render-time totals module already built in step 11 (no
    per-view duplication):
    - **Default Empty** — every cell renders literal `0`, regardless of
      any saved `awardedScore`; tier/unit totals render `0 / <maxScore
      sum>`. *(FR-MMB-27)*
    - **Default Full** — every cell renders its criterion's `maxScore`,
      **editable in-grid while this mode is active** (step 32); tier/unit
      totals render `<maxScore sum> / <maxScore sum>` (always 100%).
      *(FR-MMB-28)*
    - **Data entry** — every cell renders `awardedScore` if entered, else
      `0` (visually distinct per FR-MMB-10a); unchanged from step 11/
      AD-MMB-5: unmarked criteria count 0 in the numerator, full
      `maxScore` in the denominator for tier/unit totals. `maxScore` is
      read-only in this mode (step 32). *(FR-MMB-29)*
    - **Part of** — every cell renders `awardedScore/maxScore` as a
      per-cell fraction (e.g. `0/5`, `4/5`); tier/unit totals use the
      **same summation as Data entry** — this identity is the resolved
      reading of OQ-MMB-7, not a bug to fix. *(FR-MMB-30)*
32. **Wire the `maxScore` write boundary and its notice.** In Default Full
    mode, wire the in-grid `maxScore` cell as editable, routing the write
    through the same single-source template path FR-MMB-4 and step 2
    already use — never a second store — and render a persistent, visible
    notice while Default Full is active stating that edits here change
    every student's ceiling. In every other mode (Default Empty, Data
    entry, Part of), the `maxScore` cell is not editable — no control, no
    write path. *(FR-MMB-28, AD-MMB-11, AD-MMB-12, AC-MMB-29, AC-MMB-30)*
33. **Wire the print-mode override.** The print path (step 15) always
    renders using **Data entry mode's** cell display and totals formula
    (step 29), regardless of the matrix document's currently stored/
    selected display mode. *(FR-MMB-32, AD-MMB-11)*
34. **Write the display-mode worked-example tests.** Against the
    display-mode fixture (step 1: 5 criteria, `maxScore` 5 each, 2 marked
    4/3, 3 unmarked), assert: Default Empty renders every cell `0` and the
    subtotal `0/25`; Default Full renders every cell `5` and the subtotal
    `25/25`; Data entry renders cells `4`, `3`, `0`, `0`, `0` and the
    subtotal `7/25`; Part of renders cells `4/5`, `3/5`, `0/5`, `0/5`,
    `0/5` and the subtotal `7/25` — recording in the test output that Part
    of's subtotal is identical to Data entry's (the resolved reading of
    OQ-MMB-7). *(AC-MMB-24…27)*

## Verification

- [ ] **AC-MMB-1** — fixture renders one template editor; no `lessonId`
      anywhere under matrix data *(step 1, 20)*
- [ ] **AC-MMB-2** — criterion add/edit/remove/reorder round-trips through
      save/reload, including `assessmentIds[]` *(step 2)*
- [ ] **AC-MMB-3** — editing a template draft score reflects on every
      student page without touching a student's own record *(step 4)*
- [ ] **AC-MMB-4** — empty or unresolvable `assessmentIds[]` refused, naming
      the criterion/id *(step 3)*
- [ ] **AC-MMB-5** — add/remove student round-trips; removal confirms and
      cascades *(step 5)*
- [ ] **AC-MMB-6** — criterion removal confirms affected-student count and
      cascades correctly, leaving other students untouched *(step 6)*
- [ ] **AC-MMB-7** — out-of-range score rejected; valid (incl. fractional)
      score saves and round-trips *(step 8)*
- [ ] **AC-MMB-8** — saved student record carries only
      `criterionId`/`awardedScore`/`comment` per row *(step 10)*
- [ ] **AC-MMB-9** — fully-scored tier shows a correct rounded subtotal;
      partially-scored tier shows a real number with unscored rows counted
      as zero, and unmarked rows stay visually distinct from scored-0 rows
      *(step 11)*
- [ ] **AC-MMB-10** — portrait fixture prints 210×297 mm pages; landscape
      re-render prints 297×210 mm; tier colours and one-page-per-student
      hold in both *(steps 14, 15, 23)*
- [ ] **AC-MMB-11** — print view citations show assessment names, never raw
      ids, including a criterion bound to two assessments *(step 16)*
- [ ] **AC-MMB-12** — no direct network call outside `local-store`; no CSV
      written from this build *(step 17)*
- [ ] **AC-MMB-13** — no framework/bundler import; CSS files under 150
      lines, tokens only, no `!important` *(steps 18, 19)*
- [ ] **AC-MMB-14** — score control steps in 0.5 increments; a typed
      one-decimal value round-trips; a two-decimal value is rejected
      *(step 8)*
- [ ] **AC-MMB-15** — a criterion row shows its own awarded value, max
      score, and tier-subtotal contribution simultaneously *(step 7)*
- [ ] **AC-MMB-16** — grid rows are bordered, numeric columns decimal-align,
      row height is compact and uniform *(steps 7, 24)*
- [ ] **AC-MMB-17** — Enter/Tab/arrow-key navigation lands focus on the
      expected cell every time, never outside the grid *(step 9)*
- [ ] **AC-MMB-18** — a committed score updates its own row, tier subtotal,
      and unit total in the same render pass *(step 11)*
- [ ] **AC-MMB-19** — a score entered in the class grid appears on the
      matching per-student page (and vice versa) without a reload; printing
      is unaffected *(step 12, 15)*
- [ ] **AC-MMB-20** — a 27.5/45 fixture renders the raw total to one decimal
      and the percentage correctly rounded per AD-MMB-5 *(step 11)*
- [ ] **AC-MMB-21** — an in-grid criterion add round-trips into
      `matrixTemplate.criteria[]` and appears unmarked on every existing
      student page *(step 26)*
- [ ] **AC-MMB-22** — an in-grid add on a partially-marked fixture triggers
      the consequence warning; confirming adds, cancelling leaves
      everything unchanged *(step 27)*
- [ ] **AC-MMB-23** — gate test: switching through all four display modes
      writes nothing to any student instance or template criterion
      *(step 21, 28)*
- [ ] **AC-MMB-24** — Default Empty mode worked example: every cell renders
      `0`, subtotal `0/25`, on the display-mode fixture *(step 29, 34)*
- [ ] **AC-MMB-25** — Default Full mode worked example: every cell renders
      its `maxScore` (`5`), subtotal `25/25`, with the write-consequence
      notice visible *(step 29, 32, 34)*
- [ ] **AC-MMB-26** — Data entry mode worked example: cells render `4`, `3`,
      `0`, `0`, `0`, subtotal `7/25` *(step 29, 34)*
- [ ] **AC-MMB-27** — Part of mode worked example: cells render `4/5`,
      `3/5`, `0/5`, `0/5`, `0/5`, subtotal `7/25` — recorded as identical
      to Data entry's subtotal (resolved OQ-MMB-7) *(step 29, 34)*
- [ ] **AC-MMB-28** — print view always uses Data entry mode's cell
      display and totals (`4`, `3`, `0`, `0`, `0`, `7/25`) regardless of
      the edit view display mode at print time *(step 33)*
- [ ] **AC-MMB-29** — gate test: a `maxScore` edit attempted in Data entry
      mode is blocked; the identical edit in Default Full mode succeeds and
      round-trips into `matrixTemplate.criteria[].maxScore` *(step 21, 32)*
- [ ] **AC-MMB-30** — the write-consequence notice is visible while Default
      Full is active and absent in the other three modes *(step 32)*
- [ ] TEST-7 gate tests for the thin-instance rule, the assessment-binding
      rule, the score-granularity rule, the display-mode toggle no-write
      rule, and the `maxScore` read-only-in-Data-entry boundary, all both
      directions *(step 21)*
- [ ] TEST-2 smoke tests for every module, `node:test` + `node:assert/strict`
      only, including the shared focus-management function against a fake
      DOM grid (TEST-8) *(step 22)*
- [ ] Reviewed against `document-shell` and `local-store` conventions
      *(step 25)*

## Measurements

> *Print measurements filled at step 23; grid-density measurements filled at
> step 24. Empty until the build runs.*

| What | Expected (portrait) | Measured | Expected (landscape) | Measured |
|---|---|---|---|---|
| Page count | = student count | — | = student count | — |
| Page box | 210 × 297 mm | — | 297 × 210 mm | — |
| Top/bottom margin | *(per `document-shell`)* | — | *(per `document-shell`)* | — |
| Left/right margin | *(per `document-shell`)* | — | *(per `document-shell`)* | — |
| Green swatch (pass) | *(per `document-shell`)* | — | *(per `document-shell`)* | — |
| Blue swatch (intermediate) | *(per `document-shell`)* | — | *(per `document-shell`)* | — |
| Orange swatch (advanced) | *(per `document-shell`)* | — | *(per `document-shell`)* | — |

### Grid density (FR-MMB-19, AC-MMB-16)

| What | Expected | Measured |
|---|---|---|
| Row height (unscored row) | compact, uniform across all rows | — |
| Row height (fully-commented row) | same as unscored row, within tolerance | — |
| Row border visibility | visible on every row | — |
| Numeric column decimal-alignment | shared horizontal position per column | — |
