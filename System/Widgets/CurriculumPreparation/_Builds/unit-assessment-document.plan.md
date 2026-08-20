# unit-assessment-document — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-19 |
| **Spec** | [unit-assessment-document.build.spec.md](unit-assessment-document.build.spec.md) |
| **Wave** | 3 |

## Prerequisites

- `document-shell` done — chassis this renders on.
- `local-store` done — persistence client this build reads/writes through.
- `bigidea-list` done — the list this build binds to; do not re-implement
  big-idea CRUD here.
- `image-paste` done — `ImageRef` model and `images/` manifest this build
  places but never writes.
- OQ-UAB-1's schema proposal (`finalAssessment` + `miniAssessments[]`)
  reconciled with the data-model spec's owner. `CurriculumPreparation-
  datamodel.spec.md` stays read-only for this build throughout.
- G-2, G-5, G-9 are **not** resolved by this plan and are not waited on.

## Steps

1. **Define the assessment record shapes.** `finalAssessment` (singular
   object) and `miniAssessments[]` (array, each with an explicit `order`),
   sharing one `Assessment`-shaped record: `id`, `bigIdeaId`, `bigIdeaNote`,
   `links[]` (`{nodeId, coverage, note}`), `tiers` (`pass`/`intermediate`/
   `advanced`, each `{prompt, task, workspaceLines, imageRefs[]}`),
   `provenance`. *(FR-UAB-1, FR-UAB-2, AD-UAB-1, AD-UAB-2)*
2. **Build the final-assessment page renderer** on `document-shell`: one
   header/binding page (name, bound big idea, curriculum links, referencing
   lessons, matrix pointer) plus three tier pages in fixed order. *(FR-UAB-1)*
3. **Build the mini-assessment page renderer**, reusing step 2's page
   templates for the identical four-page shape. *(FR-UAB-2)*
4. **Build mini-assessment CRUD + reorder** — create, edit, delete, and an
   explicit `order` control — through `local-store`. Refuse delete when a
   lesson still references the assessment (OQ-UAB-6), naming the blocking
   lessons. *(FR-UAB-3, OQ-UAB-3, OQ-UAB-5, OQ-UAB-6)*
5. **Lock the final assessment against delete and duplicate** — omit or
   disable those controls specifically for `finalAssessment`, not a
   confirm-and-block dialog. *(FR-UAB-4)*
6. **Build or import the shared big-idea picker.** Check whether
   `lesson-plan-document` has already landed one; if so import it, if not
   build it here for both builds to share (AD-UAB-3). Wire the mandatory-
   binding save guard: refuse a save with no `bigIdeaId`, naming the field.
   *(FR-UAB-5, FR-UAB-6, AC-UAB-3)*
7. **Build the curriculum-link editor** — add/remove/edit
   `{nodeId, coverage, note}` entries, `coverage` restricted to `"full"`/
   `"partial"`, duplicate `nodeId` on the same assessment refused, edits
   in place per OQ-UAB-7. *(FR-UAB-7, OQ-UAB-4, OQ-UAB-7, AC-UAB-4)*
8. **Build the derived "referencing lessons" lookup** — on load, scan
   `lessons[].assessmentLink.miniAssessmentIds[]` / `.finalAssessment` for the current assessment's
   id; render the result, store nothing. *(FR-UAB-8, AD-UAB-4, AC-UAB-5)*
9. **Build the marking-matrix pointer** — the matrix is a unit-level
   singleton (INV-DM-6, INV-DM-18), so the relationship is structural: there
   is no id to follow. Render a citation string only, no score or criterion
   data. *(FR-UAB-9, AD-UAB-5)*
10. **Build citation rendering** — resolve every id (`nodeId`, `bigIdeaId`,
    lesson `number`) to its human-readable text (`code`/`title`/number) at
    both edit-view and print-view time; never emit a raw id into visible content.
    *(FR-UAB-10, AC-UAB-6)*
11. **Wire image placement** — drop `image-paste`'s `ImageRef`s into tier
    pages via `document-shell`'s image primitive, including its
    missing-source placeholder; confirm no base64 path exists. *(FR-UAB-11,
    AC-UAB-7)*
12. **Fix print orientation to A4 portrait** for both assessment types,
    using `document-shell`'s existing portrait geometry — no new `@page`
    rule. *(FR-UAB-12)*
13. **Route all persistence through `local-store`** — no direct file or
    `fetch` calls outside its client; confirm the browser never touches the
    filesystem. *(FR-UAB-13)*
14. **Write the `node:test` suite** — imports cleanly; happy path creates a
    mini assessment, binds a big idea, adds a link, saves; one guard path
    (final-assessment delete refusal, or missing-big-idea save refusal).
    *(TEST-1, TEST-2, TEST-7, AC-UAB-10)*
15. **Measure printed sheets** for the final assessment — page count, page
    box in mm, margins, tier colour swatches against edit view. Record the
    numbers below. *(AC-UAB-8)*
16. **Run the compliance checks** — grep new files for hex/rgb colour
    literals and `!important` outside `variables.css` (CSS-2, CSS-5); grep
    a saved demo `unit.json` for a stored reverse-edge field on an
    assessment; grep rendered SVG output for a bare id string outside
    `id=`/`data-*` attributes. *(AC-UAB-5, AC-UAB-6, AC-UAB-9)*
17. **File OQ-UAB-1's schema reconciliation** with the data-model spec's
    owner once its concurrent edit settles — do not edit that file from
    this build.

## Verification

- [ ] **AC-UAB-1** — demo unit (1 final + 2 mini assessments) renders and
      prints, 4 pages each, fixed page order *(steps 2, 3, 15)*
- [ ] **AC-UAB-2** — final assessment delete/duplicate controls absent or
      disabled; mini CRUD + reorder works and persists *(steps 4, 5)*
- [ ] **AC-UAB-3** — save with no `bigIdeaId` refused, names the field
      *(step 6)*
- [ ] **AC-UAB-4** — duplicate `nodeId` link on one assessment refused
      *(step 7)*
- [ ] **AC-UAB-5** — no stored reverse-edge field on any assessment in
      `unit.json` *(steps 8, 16)*
- [ ] **AC-UAB-6** — print view shows text, not raw ids *(steps 10, 16)*
- [ ] **AC-UAB-7** — `ImageRef` renders in edit view and print view; missing source
      shows placeholder; no base64 in `unit.json` *(step 11)*
- [ ] **AC-UAB-8** — final assessment prints 4 pages, 210 × 297 mm page box,
      tier colours matching edit view swatches *(step 15)*
- [ ] **AC-UAB-9** — zero hardcoded colour/spacing values, zero `!important`
      *(step 16)*
- [ ] **AC-UAB-10** — `node:test` suite imports cleanly, happy path + one
      guard path pass *(step 14)*
- [ ] OQ-UAB-1 filed for reconciliation with the data-model spec *(step 17)*

## Measurements

> *Filled at step 15. Empty until the build runs.*

| What | Expected | Measured |
|---|---|---|
| Page count (final assessment) | 4 | — |
| Page box | 210 × 297 mm | — |
| Top/bottom margin | *(per document-shell's portrait geometry)* | — |
| Left/right margin | *(per document-shell's portrait geometry)* | — |
| Green swatch (pass) | *(per document-shell's tier constants)* | — |
| Blue swatch (intermediate) | *(per document-shell's tier constants)* | — |
| Orange swatch (advanced) | *(per document-shell's tier constants)* | — |
