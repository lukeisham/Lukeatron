# unit-assessment-document — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-19 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 3 |
| **One-liner** | The unit's assessments — one final, three-tiered assessment and any number of three-tiered mini assessments — printed as A4 portrait documents, each bound to a big idea and to coverage-qualified curriculum links. |

---

## 1. Motivation

Curriculum Preparation has four parts today — curriculum map, lesson plans,
marking matrix, crib sheet. It is missing the document a lesson actually
points a student *at*: the assessment itself. This build is the fifth part.

It sits beside `lesson-plan-document` in wave 3 because the two share a
shape — a portrait document, bound to a big idea, tiered pass/intermediate/
advanced — but not a cardinality. A unit has many lessons and, by design,
**exactly one** final assessment plus **any number** of mini assessments.
Getting that cardinality wrong here would repeat the mistake INV-DM-18
already exists to prevent for the crib sheet and matrix template.

Marking is deliberately excluded. `marking-matrix` (wave 4) owns scoring,
criteria and per-student instances; this build only produces the document a
mark is eventually recorded against, and points at the matrix by reference.

## 2. Scope

**In scope**
- Document structure for the **final assessment**: one header/binding page
  plus three tier pages (Pass, Intermediate, Advanced), fixed order.
- Document structure for a **mini assessment**: the same shape, smaller
  scope, unlimited count.
- Create, edit, reorder and delete mini assessments. The final assessment
  cannot be deleted or duplicated — it exists for the lifetime of the unit.
- The mandatory big-idea binding (one big idea or sub-big idea per
  assessment) and the control to choose/change it.
- Coverage-qualified curriculum links, shape `{nodeId, coverage, note}`,
  attached to any assessment.
- A derived, edit-view and print-view list of the lessons that reference a
  given assessment — computed from `lesson.assessmentLink.assessmentIds[]`,
  never stored on the assessment.
- A passive, print-view **pointer** to the marking matrix for a given
  assessment (via the lessons that reference it) — no scores, no criteria.
- Print view citations rendered as human-readable text (codes, titles, lesson
  numbers, big-idea titles), never raw ids.
- Image placement inside tier pages via the `image-paste` `ImageRef` model.
- A4 portrait print fidelity on the `document-shell` chassis.
- Persistence of assessment records via the `local-store` client.

**Out of scope**
- **Marking.** Scores, criteria, draft scores, per-student instances, and
  the matrix template itself belong entirely to `marking-matrix`. This build
  never renders a score, a criterion row, or a student name.
- Curriculum ingest and the curriculum tree itself (`curriculum-ingest`,
  `arbor-tree`).
- Creating or editing big ideas (`bigidea-list` owns the list; this build
  only *binds* to an existing entry).
- Writing image files or the image manifest (`image-paste` owns
  `images/` and the manifest; this build only places an existing
  `ImageRef`).
- The general cross-part traceability UI, reverse-link index, and citation
  rendering shared across all five parts — that is `traceability-links`
  (wave 5). This build's derived lesson-lookup is a narrow, local instance
  of the same rule (INV-DM-12), not a replacement for it.
- Resolving gates G-2, G-5 or G-9 — this spec assumes their eventual
  resolution and does not depend on a particular outcome.
- Filesystem access from the browser — every read/write goes through
  `local-store` to the bundle's Python server (AD-13).

## 3. Requirements

> **Requirement families.** `FR-UA-n` is the **PRD-level** family for the Unit
> Assessment part ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-UA-1…10 — *what the part is*). `FR-UAB-n` below is the **build-level**
> family — *what this build implements*. The build family is a superset:
> PRD FR-UA-1/2 → FR-UAB-1, FR-UA-3 → FR-UAB-2/3, FR-UA-4 → FR-UAB-4,
> FR-UA-5 → FR-UAB-5/6, FR-UA-6 → FR-UAB-7, FR-UA-7/8 → FR-UAB-8/9,
> FR-UA-9 → FR-UAB-12, FR-UA-10 → FR-UAB-1/2. FR-UAB-10, 11 and 13 are
> build-level obligations (citation rendering, images, persistence) with no
> single PRD counterpart. The same PRD/build split governs the marking matrix
> (`FR-MM` / `FR-MMB`).


- **FR-UAB-1** — Renders the **final assessment** as one A4 portrait document
  of four pages: page 1 a header/binding page (name, bound big idea,
  curriculum links, referencing lessons, matrix pointer), pages 2–4 the
  three tier pages in fixed order Pass → Intermediate → Advanced. *(mirrors
  INV-DM-5's lesson page order)*
- **FR-UAB-2** — Renders each **mini assessment** in the identical four-page
  shape as FR-UAB-1. Content length may be shorter; the structure does not
  vary between final and mini.
- **FR-UAB-3** — Provides create, edit, reorder and delete for mini
  assessments. Reordering sets an explicit curated `order` field, not
  reliance on array position.
- **FR-UAB-4** — Refuses to delete or duplicate the final assessment. The
  control for it is absent or disabled, not merely a confirm-and-block.
- **FR-UAB-5** — Every assessment (final or mini) carries a **mandatory**
  `bigIdeaId`, resolvable to a `BigIdea` or sub-`BigIdea`. Saving an
  assessment with no bound big idea is refused, naming the missing field.
  *(mirrors FR-BI-4 / INV-DM-15 for lessons)*
- **FR-UAB-6** — Provides the control to choose or change an assessment's
  bound big idea from the unit's `bigIdeas[]` list.
- **FR-UAB-7** — Provides create/edit/remove for an assessment's
  coverage-qualified curriculum links, `{nodeId, coverage, note}[]`, where
  `coverage` is exactly `"full"` or `"partial"`. Refuses a duplicate
  `nodeId` within one assessment's link array. *(mirrors FR-BI-7/9,
  INV-DM-21…23 for `BigIdea.coverage[]`)*
- **FR-UAB-8** — Displays, in edit view and in print view, the lessons that
  reference a given assessment. This list is **computed on load** by
  scanning `unit.lessons[].assessmentLink.assessmentIds[]` for the
  assessment's id — never read from a stored field on the assessment.
  *(INV-DM-12)*
- **FR-UAB-9** — Displays, in edit view and in print view, a passive pointer to the
  marking matrix associated with a given assessment, derived via the
  lessons found by FR-UAB-8. The matrix is a unit-level singleton, so
  the relationship is structural — there is no stored id to follow. Renders as a
  citation only (e.g. "Marking matrix: see Lesson 4") — no score, no
  criterion, no student data. *(scope boundary with `marking-matrix`)*
- **FR-UAB-10** — Renders every link in print view as a human-readable
  citation — a curriculum node's `code`/`title`, a big idea's `title`, a
  lesson's `number` — never a raw id string.
- **FR-UAB-11** — Places images inside tier pages using `image-paste`'s
  `ImageRef` model (`{imageId, x, y, width, height}`), drawn through
  `document-shell`'s image primitive, including its missing-source
  placeholder. Never embeds image data as base64. *(FR-IMG-4…6, FR-DS-9)*
- **FR-UAB-12** — Prints at fixed **A4 portrait** orientation for both final
  and mini assessments — not user-selectable, a property of the part.
  *(mirrors §1c: "Lesson plan — portrait — no, fixed by the part")*
- **FR-UAB-13** — Persists every assessment record through the `local-store`
  client only. No direct filesystem access from the browser; all reads and
  writes go through the bundle's Python server. *(AD-13)*

**Acceptance criteria**

- **AC-UAB-1** — A demo unit with one final assessment and two mini
  assessments renders in edit view and prints to A4 portrait PDFs, each four
  pages in the fixed page order.
- **AC-UAB-2** — The final assessment's delete and duplicate controls are
  absent or disabled; deleting, creating and reordering a mini assessment
  succeeds and persists.
- **AC-UAB-3** — Saving any assessment with no `bigIdeaId` set is refused,
  and the error names the missing field.
- **AC-UAB-4** — Adding a curriculum link whose `nodeId` already exists on
  that assessment is refused.
- **AC-UAB-5** — Inspecting the demo unit's `unit.json` shows no
  `assessment.lessonIds`-shaped field anywhere; the referencing-lessons list
  only ever appears computed in the running app.
- **AC-UAB-6** — Print view shows node codes/titles, the bound big
  idea's title, and referencing lesson numbers as text — grepping the
  rendered SVG for a bare id pattern (e.g. a `nodeId`/`bigIdeaId` UUID)
  outside `id=`/`data-*` attributes returns nothing.
- **AC-UAB-7** — An `ImageRef` placed in a tier page renders in edit view and
  in print view; removing its backing file shows document-shell's placeholder.
  `unit.json` contains no base64 image data.
- **AC-UAB-8** — A physical or PDF-measured print test of the final
  assessment records 4 pages, page box 210 × 297 mm, margins matching
  `document-shell`'s portrait geometry, and the three tier colours matching
  the edit view swatches.
- **AC-UAB-9** — Grepping the build's new files for a hex/rgb colour
  literal or `!important` outside `variables.css` returns nothing (CSS-2,
  CSS-5).
- **AC-UAB-10** — The `node:test` suite for the assessment module imports
  cleanly, exercises the happy-path create-and-save, and covers one guard
  path (final-assessment delete refusal, or missing-big-idea save
  refusal) (TEST-2, TEST-7).

## 4. Prerequisites & dependencies

- **Required first:** [`document-shell`](document-shell.build.spec.md)
  (the chassis this renders on), [`local-store`](local-store.build.spec.md)
  (persistence client), `bigidea-list` (the list this build binds to and
  reads coverage-link conventions from), `image-paste` (the `ImageRef`
  model and `images/` manifest this build places but never writes).
- **Coordinate-with:** `marking-matrix` — shares the tier vocabulary
  (pass/intermediate/advanced) and the notion of "assessment"; sequence so
  the two do not define the vocabulary twice. `traceability-links` — this
  build's derived lesson-lookup (FR-UAB-8) is a narrow local instance of the
  rule that build owns in general; do not let this build grow into a second
  reverse-link index. `lesson-plan-document` — same wave, same big-idea
  picker shape and tier-page shape; extract any shared control into a
  common module rather than duplicating it in both builds (SR-4).
  [`CurriculumPreparation-datamodel.spec.md`](../_Spikes/CurriculumPreparation/CurriculumPreparation-datamodel.spec.md)
  is under active edit by another agent as of this writing — **read-only**
  for this build. The `assessments[]` entity shape this spec assumes
  (AD-UAB-1) is a proposal against that document, not yet reconciled into
  it — see OQ-UAB-1.
- **Not resolved here:** G-2 (document packaging), G-5 (do the generators
  earn their keep), G-9 (build the ingest at all). This spec does not
  depend on any of their outcomes and takes no position on them.

**Gate:** work may start once `document-shell`, `local-store`, `bigidea-list`
and `image-paste` are done, and OQ-UAB-1's schema shape is reconciled with
the data-model spec's owner.

## 5. Decisions

- **AD-UAB-1** — *Decision:* store assessments as two separate fields on the
  unit — a singular `finalAssessment` object and a `miniAssessments[]`
  array — rather than one `assessments[]` array carrying a `kind`
  discriminator. *Rationale:* matches the project's established pattern for
  singular-vs-plural parts (INV-DM-18: `cribSheet` is a singular object,
  `matrices[]` is an array); makes "the final assessment cannot be deleted
  or duplicated" structurally true instead of an invariant checked at
  runtime against a shared array. *Rejected:* one `assessments[]` array with
  a `kind: "final" | "mini"` flag — would need its own "exactly one `kind:
  final`" invariant doing the same job the schema shape already does for
  free.
- **AD-UAB-2** — *Decision:* an assessment's tier pages use their own field
  names (e.g. `prompt`, `task`) distinct from `Lesson`'s `TierPage`
  (`material`, `studentTask`), even though the page shape — `{tier,
  ..., workspaceLines, imageRefs[]}` — is identical. *Rationale:*
  `document-shell` is content-blind (FR-DS-8) and does not care about field
  names; an assessment task and a lesson's teaching material are different
  domain concepts and sharing field names would blur that. *Rejected:*
  reusing `Lesson.tiers`'s field names verbatim for assessments.
- **AD-UAB-3** — *Decision:* the big-idea picker control is shared code, not
  duplicated between this build and `lesson-plan-document`. Whichever build
  lands first extracts it to a common module; the other imports it.
  *Rationale:* SR-4 (share, don't copy-paste) — both builds need the exact
  same "pick one big idea or sub-big idea" interaction. *Rejected:*
  building two independent pickers because the builds are speced
  separately.
- **AD-UAB-4** — *Decision:* the "lessons referencing this assessment" list
  is computed on load by scanning `lessons[].assessmentLink.assessmentIds[]`
  — never stored as `assessment.lessonIds[]`. *Rationale:* INV-DM-12,
  applied to a new edge exactly as it already applies to
  `BigIdea → Lessons` and `Node → Lessons`. *Rejected:* a stored reverse
  field kept in sync on every lesson edit.
- **AD-UAB-5** — *Decision:* the marking-matrix pointer (FR-UAB-9) renders as
  a citation string only, derived transitively through the referencing
  lessons — this build stores and computes nothing matrix-shaped.
  *Rationale:* keeps the scope boundary with `marking-matrix` sharp; a
  richer summary would require this build to understand scores and
  criteria, which is exactly what it must not do. *Rejected:* embedding a
  matrix score summary on the assessment page.

**Open questions**

- **OQ-UAB-1** — ✅ **RESOLVED (2026-08-19).** The data-model spec settled
  concurrently and agrees with AD-UAB-1: the flat `Assessment` entity is
  retired and absorbed into a singular `unitAssessment` object holding
  `finalAssessment` (an `AssessmentTiers`, exactly one — INV-DM-24) and
  `miniAssessments[]` (many `MiniAssessment`). `lesson.assessmentLink` is
  `{ miniAssessmentIds[], finalAssessment, note }`. No reconciliation
  outstanding; build to those field names.
- **OQ-UAB-2** — Must all three tier pages exist on every assessment, even
  if a tier is left blank? *Default:* yes — always three, blank content
  allowed, mirroring INV-DM-5's fixed lesson tier order.
- **OQ-UAB-3** — Is there a cap on the number of mini assessments per unit?
  *Default:* no cap — unlike the crib sheet's hard page cap (INV-DM-16),
  nothing about assessments demands one.
- **OQ-UAB-4** — Are curriculum links (FR-UAB-7) mandatory on every
  assessment, or optional? *Default:* optional — zero or more; unlike the
  big-idea binding, coverage can legitimately be empty on a brand-new
  mini assessment.
- **OQ-UAB-5** — How is mini-assessment order stored? *Default:* an explicit
  `order` number field, curated by the user, mirroring `BigIdea.order` —
  not implicit array position.
- **OQ-UAB-6** — What happens when a lesson still references a mini
  assessment that a user tries to delete? *Default:* refuse, naming the
  blocking lessons — mirrors OQ-DM-7's default for node deletion, and
  keeps `lesson.assessmentLink.assessmentIds[]` from dangling (INV-DM-4).
- **OQ-UAB-7** — Can a curriculum link's `note` or `coverage` be edited in
  place, or must it be removed and re-added? *Default:* editable in place
  — mirrors the `BigIdea.coverage[]` rule that changing full↔partial edits
  the one entry rather than adding a second (INV-DM-23).

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Final/mini split (AD-UAB-1) drifts from whatever the data-model spec ends up saying once its concurrent edit lands | Two documents disagree about the schema; a later build reads a field that doesn't exist | OQ-UAB-1 filed explicitly for reconciliation; this build never edits the data-model spec itself | Schema reconciliation checked before this build's Verification is signed off |
| "Lessons referencing this assessment" quietly becomes a stored field under deadline pressure | INV-DM-12 violated; a second reverse-link index appears outside `traceability-links` | AD-UAB-4; grep `unit.json` fixtures for a `lessonIds` key on an assessment | AC-UAB-5 |
| Marking-matrix pointer (FR-UAB-9) grows into score/criteria rendering | Scope boundary with `marking-matrix` collapses; two builds define the same thing twice | AD-UAB-5; scope section names it explicitly out of bounds | Code review against FR-UAB-9's citation-only wording |
| Big-idea picker built twice (once per wave-3 build) | Two subtly different pickers, doubled maintenance, SR-4 violated | AD-UAB-3; coordinate-with note in §4 | Manual check: one shared module imported by both builds |
| Raw ids leak into print view under time pressure | A parent-facing document with a UUID on it | FR-UAB-10; grep the rendered SVG for id-shaped strings | AC-UAB-6 |

## 7. Plan

See [`unit-assessment-document.plan.md`](unit-assessment-document.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-UAB-1…10 demonstrated
- [ ] A physical or PDF-measured A4 portrait print test recorded with
      numbers for the final assessment
- [ ] Final assessment delete/duplicate refusal demonstrated (gate test,
      TEST-7)
- [ ] Missing-big-idea save refusal demonstrated (gate test, TEST-7)
- [ ] No stored reverse edge for "lessons referencing this assessment"
      (INV-DM-12) — verified by inspecting a saved `unit.json`
- [ ] No raw id ever rendered in print view (FR-UAB-10)
- [ ] No base64 image data in `unit.json` (FR-UAB-11)
- [ ] Every new file under 150 lines, CSS values from `variables.css` only,
      no `!important` (CSS-1, CSS-2, CSS-5)
- [ ] `node:test` suite passes (TEST-1, TEST-2)
- [ ] OQ-UAB-1's schema proposal filed for reconciliation with the
      data-model spec

**On completion:** set Status to Done, `git mv` this spec and its plan to
`_Done/`, update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
