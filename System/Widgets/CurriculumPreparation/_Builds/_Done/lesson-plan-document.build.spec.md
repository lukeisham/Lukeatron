# lesson-plan-document — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-20 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 3 |
| **One-liner** | The lesson plan — a front page plus zero to three tier pages, 1 to 4 A4 portrait pages total — as a real, editable, printable document. |

---

## 1. Motivation

Curriculum Preparation has six parts. Five of them — curriculum map, Unit
Assessment, marking matrix, crib sheet, resources page — already have a build
spec. The lesson plan does not: it is the part every other document points
*at* (a lesson's citations, a lesson's assessment links, a lesson's place in
the combined Lessons & Topics view), and it is the one part of the six with no
build spec at all. Luke flagged this directly — "the lesson plan should have a
spec" — and this build closes that gap.

The gap matters more than usual here because the lesson plan is not a late
addition to the schema; `FR-LP` is the PRD's Part 2, the big-idea binding is
mandatory on it (FR-BI-4), and two other build specs already lean on it by
name: `unit-assessment-document.build.spec.md` names it as the coordinate-with
build sharing the tier-page shape and the big-idea picker (SR-4), and
`CurriculumPreparation.arch.spec.md`'s AD-33 describes the lesson plan's
1-to-4-page rendering rule as the one **both** parts share. Neither of those
references had a home to point at until now.

This build spec covers rendering the lesson plan as a document — front page,
tier pages, sidebar, edit and print views. It does not cover *generating* a
lesson plan from a curriculum node and a big idea (FR-LP-9) — that is a
separate, already-named, not-yet-specced build, `lesson-plan-generator`
(wave 3, gated on G-5) — see Scope below.

## 2. Scope

**In scope**
- Document structure for **one lesson plan**: a front page (always) plus zero
  to three tier pages (Pass, Intermediate, Advanced — emitted only when a tier
  has content), fixed order, 1 to 4 A4 portrait pages total (FR-LP-7, FR-LP-11,
  AD-33). **This page-count model is settled and unchanged by this build** —
  see the note below.
- Front-page field rendering: lesson number, topic (above big idea, FR-LP-1a/
  FR-TOP-9), big idea box (read-only reflection + binding picker only, AD-44),
  curriculum node citations, key example, practice question, assessment links
  (mini and/or final, FR-UA-8), tier key, sidebar.
- The tier-page emission logic — walking `Lesson.tiers` against INV-DM-33's
  emptiness test to decide which of the three tier pages print. This logic is
  **shared with Unit Assessment** (SR-4, AD-33's "one rendering rule … in the
  shared tier-page path"); see the dependency note in §4 on its current
  status.
- Edit-view controls for every front-page field, the big-idea binding picker,
  and the sidebar.
- Print-view rendering of the front page and however many tier pages a given
  lesson emits, plus the page-count text (FR-LP-17).
- The Sidebar region (FR-LP-18/19): freeform text, front page only, never
  adds a page.
- Image placement inside tier pages via `image-paste`'s `ImageRef` model
  (FR-LP-13, FR-IMG family).
- Lesson numbering as a citation source for other documents (FR-LP-16) and the
  renumber-on-reorder rule (FR-LP-15, INV-DM-32) as it bears on this
  document's own front-page rendering (the number itself, and citations that
  name it) — the reordering *control* lives on the combined Lessons & Topics
  view (FR-TOP-8), not here; this build renders the consequence, not the
  interaction.
- A4 portrait print fidelity on the `document-shell` chassis (AD-11).
- Persistence of lesson records via the `local-store` client.

**Not changing — the page-count model.** The lesson plan already correctly
prints 1 to 4 A4 portrait pages: a front page, plus one page per populated
tier, in fixed order (FR-LP-7, FR-LP-11, AD-33; AC-LP-8…11). This is settled
product behaviour, pinned by acceptance fixtures, and confirmed directly by
Luke ("Lesson plans, 1 page min but up to 4 pages allowed"). This build spec
implements that model; it does not revisit it.

**Out of scope**
- **Lesson generation** from a selected curriculum node and big idea (FR-LP-9,
  FR-LP-10) and the no-clobber rule over `provenance` (`generated` \|
  `edited` \| `manual`). That is `lesson-plan-generator`'s job — a separate,
  already-named build (wave 3, gated on G-5), not specced here. This build
  assumes a `Lesson` record already exists, however it got there, and renders
  it.
- **Big idea identity editing** — renaming, reordering, reparenting or
  deleting a big idea. That is the Lessons & Topics view's job (AD-44). The
  lesson plan's Big Idea box only ever reads the bound idea's name and lesson
  count, and offers a *binding* picker (which idea this lesson points to) —
  never an identity edit.
- **Curriculum-node coverage editing** — attaching or detaching a big idea
  from a curriculum node (`bigIdea.coverage[]`). That is the Curriculum
  Coverage grid's job (AD-44, FR-BI-10). The lesson plan only reads curriculum
  node citations (`lesson.nodeIds[]`), it never edits coverage.
- The general cross-part traceability UI, reverse-link index, and clickable
  curriculum-code component shared across all six parts — that is
  `traceability-links` (wave 5, AD-32). This build's print-view citations are
  plain text; only its edit-view code rendering depends on that shared
  component (see §4).
- Creating, editing or deleting big ideas, topics, or curriculum nodes
  themselves — those lists are owned by `bigidea-list`, the Lessons & Topics
  view, and `curriculum-editor` respectively.
- Writing image files or the image manifest (`image-paste` owns `images/` and
  the manifest; this build only places an existing `ImageRef`).
- Filesystem access from the browser — every read/write goes through
  `local-store` to the bundle's Python server (AD-13).
- The combined Lessons & Topics view itself (FR-TOP-8/8a) — that view reads
  `lessons[]` to build its outline; this build does not render that view, only
  the transitive topic citation on its own front page (FR-LP-1a).

## 3. Requirements

> **Requirement families.** `FR-LP-n` is the **PRD-level** family for the
> Lesson Plan part ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-LP-1…20 — *what the part is*, FR-LP-14 retired). `FR-LPB-n` below is the
> **build-level** family — *what this build implements* — the same PRD/build
> split `unit-assessment-document.build.spec.md` uses for `FR-UA`/`FR-UAB`
> (and `marking-matrix.build.spec.md` for `FR-MM`/`FR-MMB`). The build family
> is a superset: FR-LP-1/1a/2 → FR-LPB-1, FR-LP-3/4 → FR-LPB-2, FR-LP-5 →
> FR-LPB-3, FR-LP-6/7/7a/8 → FR-LPB-4, FR-LP-11/17 → FR-LPB-5, FR-LP-12 →
> FR-LPB-6, FR-LP-13 → FR-LPB-7, FR-LP-15/16 → FR-LPB-8, FR-LP-18/19 →
> FR-LPB-9, FR-LP-20 → FR-LPB-10. FR-LPB-11 and FR-LPB-12 are build-level
> obligations (shared tier-page logic, persistence) with no single PRD
> counterpart.

- **FR-LPB-1** — Renders the front page's identity fields: lesson number
  (FR-LP-1), topic resolved transitively and printed above the big idea
  (FR-LP-1a, FR-TOP-9), and the Big Idea box showing the bound idea's name
  plus a derived count of lessons in the unit sharing it (FR-LP-2, FR-LP-20).
  The box is **read-only plus a binding picker only** — it never offers an
  identity edit (name, hierarchy, or coverage) for the big idea or the topic
  (AD-44). *(mirrors FR-UAB-6's picker, shared per AD-UAB-3-equivalent — see
  AD-LPB-2)*
- **FR-LPB-2** — Renders the key example and practice question fields
  (FR-LP-3, FR-LP-4) as plain editable text in edit view, plain text in print
  view.
- **FR-LPB-3** — Renders the lesson's assessment links — zero-or-more mini
  assessments and/or the one final assessment (FR-LP-5, FR-UA-8,
  `lesson.assessmentLink`) — as citations naming the assessment, never a raw
  id, in both edit and print view.
- **FR-LPB-4** — Implements the tier-page emission logic: walks `Lesson.tiers`
  (`pass`, `intermediate`, `advanced`) against INV-DM-33's emptiness test and
  emits a tier page only for a non-empty tier, in fixed order (INV-DM-5), each
  carrying its material, student task, workspace lines and image refs
  (FR-LP-6, FR-LP-7, FR-LP-7a, FR-LP-8). This is the **shared** logic named in
  AD-33 ("one rendering rule … in the shared tier-page path") and in
  `unit-assessment-document.build.spec.md`'s coordinate-with note — see
  AD-LPB-1 for how this build treats that sharing.
- **FR-LPB-5** — Renders the lesson plan as one A4 portrait document of 1 to 4
  pages total — front page always, plus however many tier pages FR-LPB-4
  emits — and computes the front page's page-count text ("page 1 of *N*") from
  the actual emitted count, never a hard-coded four (FR-LP-11, FR-LP-17).
- **FR-LPB-6** — Renders, on the front page in print view, human-readable
  citations for everything the lesson connects to: curriculum node codes and
  titles, the topic, the big idea, linked assessments, and a reference to the
  marking matrix — never a raw id (FR-LP-12).
- **FR-LPB-7** — Places images inside tier pages using `image-paste`'s
  `ImageRef` model (`{imageId, x, y, width, height}`), drawn through
  `document-shell`'s image primitive, including its missing-source
  placeholder. Never embeds image data as base64 (FR-LP-13, FR-IMG-4…6,
  FR-DS-9).
- **FR-LPB-8** — Renders the lesson's `number` on the front page and in every
  citation this document contributes to other parts' print views, as the
  number alone, reflecting the unit's current renumbering state on next
  render (FR-LP-15, FR-LP-16, INV-DM-32). This build does not implement the
  reorder control itself — that lives on the combined Lessons & Topics view —
  only the correct display of whatever `number` that control has set.
- **FR-LPB-9** — Renders the optional freeform Sidebar region on the front
  page only, plain text, no images, no bindings (FR-LP-18, AD-36). An empty
  sidebar renders nothing — no heading, no placeholder box (FR-LP-18). Never
  adds a page and never changes FR-LPB-5's page-count text (FR-LP-19).
- **FR-LPB-10** — Displays the Big Idea box's name-plus-count on open, with no
  click or interaction required to reveal them (FR-LP-20). The count is
  computed on load — every lesson in the unit sharing this `bigIdeaId` — never
  stored on the lesson or the big idea.
- **FR-LPB-11** — Prints at fixed **A4 portrait** orientation — not
  user-selectable, a property of the part (AD-11).
- **FR-LPB-12** — Persists every lesson record through the `local-store`
  client only. No direct filesystem access from the browser; all reads and
  writes go through the bundle's Python server (AD-13).
- **FR-LPB-13** — *(Added when `lesson-plan-generator` was specced)* The
  first manual edit to any field on a lesson whose `provenance` is
  `"generated"` flips it to `"edited"` — this build owns that write, since
  it is the only place a teacher edits lesson fields. `lesson-plan-generator`
  reads `provenance` to decide whether its own regenerate action is
  available; it never writes `"edited"` itself.

**Acceptance criteria**

- **AC-LPB-1** — A fixture lesson with **zero** tiers populated prints exactly
  **1 page** — the front page only, reading "page 1 of 1" (AC-LP-8, AC-LP-11).
- **AC-LPB-2** — A fixture lesson with exactly **one** tier populated prints
  exactly **2 pages**, in INV-DM-5's fixed order, reading "page 1 of 2"
  (AC-LP-9, AC-LP-11).
- **AC-LPB-3** — A fixture lesson with **all three** tiers populated prints
  exactly **4 pages**, in fixed order, reading "page 1 of 4" (AC-LP-10,
  AC-LP-11).
- **AC-LPB-4** — Page 1 carries all of FR-LPB-1…3's fields with nothing
  clipped (AC-LP-2).
- **AC-LPB-5** — Opening any lesson's edit view shows its Big Idea box with
  the bound idea's name and lesson count immediately visible, no interaction
  required; a fixture unit where a big idea binds two lessons shows "· 2
  lessons" on both (AC-LP-14).
- **AC-LPB-6** — The Big Idea box's picker changes only `lesson.bigIdeaId`; no
  control on the lesson plan screen writes the big idea's `title`, hierarchy,
  or `coverage[]` (AD-44). Grepping this build's edit-view code for a write to
  any of those three fields returns nothing.
- **AC-LPB-7** — A lesson with sidebar text prints it on the front page only;
  a lesson with no sidebar text shows no sidebar region at all — no empty box,
  no heading. A fixture lesson with all three tiers populated **and** sidebar
  text still prints exactly 4 pages (AC-LP-13).
- **AC-LPB-8** — A lesson's front page shows its topic above its big idea, and
  the topic named matches the topic its big idea is bound to (AC-LP-12,
  AC-TOP-5).
- **AC-LPB-9** — An `ImageRef` placed in a tier page renders in edit view and
  in print view; removing its backing file shows `document-shell`'s
  placeholder; `unit.json` contains no base64 image data.
- **AC-LPB-10** — A physical or PDF-measured print test of the all-three-tiers
  fixture records 4 pages, page box 210 × 297 mm, margins matching
  `document-shell`'s portrait geometry, and the three tier colours matching
  the edit view swatches (AC-SYS-2's method, applied here).
- **AC-LPB-11** — Print-view body type measures at or above the 12pt
  (≈16px@96dpi) floor — this build does not repeat the print artboards' logged
  sub-floor defect (MinorTasks queue row 9; see §6).
- **AC-LPB-12** — The `node:test` suite for the lesson module imports cleanly,
  exercises the happy-path create-and-save, and covers the tier-emission
  guard path (a lesson with a tier whose `material`/`studentTask`/
  `workspaceLines` are blank and `imageRefs[]` empty emits no page for that
  tier) (TEST-2, TEST-7).

## 4. Prerequisites & dependencies

- **Required first:** [`document-shell`](document-shell.build.spec.md) (the
  pagination chassis this renders on — cite, don't restate; see its own
  FR-DS-1…10), [`local-store`](local-store.build.spec.md) (persistence
  client), `bigidea-list` (the list this build's picker binds to and reads
  the lesson-count query from — FR-BI-6), `image-paste` (the `ImageRef` model
  and `images/` manifest this build places but never writes).
- **Coordinate-with:** `unit-assessment-document` — same wave, same tier-page
  shape, same big-idea-picker shape (SR-4). AD-33 states this explicitly:
  "one rendering rule over one tier shape, in the shared tier-page path" —
  whichever of the two builds lands first should extract the tier-page
  emission logic (FR-LPB-4) and the big-idea picker into shared modules the
  other imports, rather than each build carrying its own copy. As of this
  writing **neither build has landed**, so there is no existing shared module
  to import yet — this build spec treats the logic as **to be extracted**
  when whichever build starts implementation first, not as an existing
  dependency to require up front (see AD-LPB-1).
  `lesson-plan-generator` — the sibling build that produces the `Lesson`
  records this build renders; sequenced after this build in the same wave
  (FR-LP-9/10 belong there, not here).
  `traceability-links` (wave 5) — this build prints curriculum-code and
  cross-part citations as **plain text** in print view (FR-LPB-6); it does
  **not** resolve a clickable cross-reference. Only the **edit-view**
  behaviour of a curriculum code — the clickable-in-edit, plain-in-print split
  AD-32 specifies — depends on `traceability-links`' shared code-rendering
  component (FR-TR-12); this build's print path carries no dependency on that
  build at all, the same direction `marking-matrix.build.spec.md` (§4) draws
  for its own assessment-name citations.
  `style-guide` (wave 1) — CSS tokens (AD-13c); cite, don't restate.
- **Not resolved here:** G-5 (do the generators earn their keep — decides
  whether `lesson-plan-generator` ships at all; this build does not depend on
  its outcome, since it renders whatever `Lesson` records exist regardless of
  how they were authored).

**Gate:** work may start once `document-shell`, `local-store`, `bigidea-list`,
`image-paste` and `style-guide` are done. `unit-assessment-document` need not
land first — the coordination in §4 works in either order — but whichever of
the two lands first should flag the extraction point for the other, per
AD-LPB-1.

## 5. Decisions

- **AD-LPB-1** — *Decision:* the tier-page emission logic (FR-LPB-4) is
  specced here as the logic this build owns and must share with
  `unit-assessment-document`, not as an already-existing shared component to
  import. Whichever build's implementation starts first extracts it into a
  common module (e.g. under a shared `app/js/` path both bundles' generators
  draw from, or the build's own module if the two builds ship inside one
  bundle — the exact module boundary is a plan-level, not spec-level, call).
  *Rationale:* AD-33 already states the rule is shared ("the two parts do not
  diverge"); SR-4 requires it not be copy-pasted. Neither sibling build has
  been implemented yet, so there is nothing today to point at as "the
  existing shared module" — pretending otherwise would misdescribe the
  current state of the codebase. *Rejected:* building this lesson plan's
  tier-page logic as a private, lesson-plan-only module now and reconciling
  with Unit Assessment later — invites exactly the drift SR-4 and AD-33 both
  warn against, and risks two subtly different "is this tier empty" checks in
  production.
- **AD-LPB-2** — *Decision:* the big-idea binding picker (part of FR-LPB-1) is
  shared code with `unit-assessment-document`'s own big-idea picker
  (`AD-UAB-3`'s decision, mirrored here) — the same "pick one big idea or
  sub-big idea" interaction, reused rather than reimplemented. *Rationale:*
  `unit-assessment-document.build.spec.md` already commits to this sharing
  from its side (AD-UAB-3); this build spec commits from the lesson-plan
  side so neither build's author has to guess whether the other has agreed.
  *Rejected:* two independently built pickers because the two build specs
  were written separately — the exact failure AD-UAB-3 already names.
- **AD-LPB-3** — *Decision:* the Big Idea box's live name-plus-count display
  (FR-LPB-1, FR-LPB-10) is a **read path only** — on load, it resolves
  `lesson.bigIdeaId` to the current `BigIdea.title` and computes the count via
  FR-BI-6's existing "every lesson bound to this idea" query, scoped to the
  unit. It never writes back to `BigIdea` and never caches a copy of the
  title on the `Lesson` record. *Rationale:* AD-44 draws the boundary — the
  Big Idea box is "a third thing again," a binding-picker plus a reflection,
  never an identity-edit surface; a read-only computed display is the only
  shape that cannot accidentally grow into a second write path for the big
  idea's name. *Rejected:* denormalising the big idea's title onto the lesson
  record for display speed — would create a second, driftable copy of
  `BigIdea.title`, the exact two-sources-of-truth problem INV-DM-12's
  discipline exists to prevent, applied here to a field instead of an edge.
- **AD-LPB-4** — *Decision:* the lesson's `number` and the renumber-on-reorder
  control (INV-DM-32) are **read-only from this build's perspective** — this
  document displays the current number and reflects it correctly in
  citations, but the drag/reorder interaction that changes numbers lives on
  the combined Lessons & Topics view (FR-TOP-8), not on the lesson plan
  screen. *Rationale:* FR-LP-15's own text locates reordering "from the
  combined Lessons & Topics view or elsewhere" but the PRD's retirement of the
  Lessons tab (FR-LP-14 → FR-TOP-8) leaves the Lessons & Topics view as the
  one place a teacher works with the whole lesson sequence at once; scattering
  a second reorder control onto every individual lesson plan screen would
  duplicate that interaction for no benefit and risk a second renumbering
  code path drifting from INV-DM-32's contiguous-from-1 rule. *Rejected:* a
  reorder control on the lesson plan's own front page — technically
  reachable, but duplicates a control the combined view already owns.

**Open questions**

- **OQ-LPB-1** — ✅ **RESOLVED (2026-08-29).** Does the shared tier-page-
  emission module (AD-LPB-1) live as a genuinely shared file both bundles'
  build output import, or as duplicated-but-code-reviewed-identical logic in
  each build's own files, given this project's "no build chain, no bundler"
  constraint (FR-SYS-8)? *Resolved:* a shared vanilla-JS module under a
  common `app/js/` path, imported by both builds' entry points with a plain
  `<script type="module">` import — no bundler needed, since ES modules
  resolve at the browser natively. Revisit only if the two builds end up
  shipping from genuinely separate bundle folders with no shared `app/`
  tree, in which case AD-LPB-1's "or the build's own module" fallback
  applies and the two copies must be kept identical by code review rather
  than by import. Already covered by AD-LPB-1/FR-SYS-8; no new requirement
  needed.
- **OQ-LPB-2** — ✅ **RESOLVED (2026-08-29).** Is the assessment-link picker
  (FR-LPB-3, "+ link another" in the mockup) part of this build or
  `unit-assessment-document`'s? *Resolved:* this build — the control writes
  `lesson.assessmentLink`, a field on `Lesson`, not on `UnitAssessment`;
  symmetric to how `unit-assessment-document`'s FR-UAB-8 reads (never
  writes) the reverse direction. Already covered by FR-LPB-3/FR-UAB-8; no
  new requirement needed.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| The Big Idea box grows a second write path onto `BigIdea.title`/`coverage[]`, e.g. an inline rename added "for convenience" | AD-44's editing-authority split is violated; two screens can now disagree about which one is canonical | AD-LPB-3; AD-44 named explicitly in scope and requirements; code review checks for any write to `BigIdea` fields other than `lesson.bigIdeaId` | AC-LPB-6 |
| Tier-page emission logic (FR-LPB-4) is built twice — once here, once in `unit-assessment-document` — and drifts | Two subtly different "is this tier empty" checks; AD-33's "one rendering rule" and SR-4 both violated | AD-LPB-1; §4 coordinate-with note; whichever build lands first extracts the shared module | Manual check: one shared module imported by both builds, not two copies |
| Big-idea picker built twice (once per wave-3 build) | Two subtly different pickers, doubled maintenance, SR-4 violated | AD-LPB-2, mirroring AD-UAB-3 from the other side | Manual check: one shared module imported by both builds |
| Print body type ships below the 12pt (≈16px@96dpi) floor, repeating the logged defect in the print mockups (`LessonPlanPrint.dc.html` and its siblings currently run 11–13.5px — AD-13c, MinorTasks queue row 9) | A parent- or student-facing printed page with sub-floor type; the defect ships into production instead of being fixed before `style-guide` transcribes its token | This build's print CSS pulls `--font-size-print-*` only after `style-guide` has bumped it to the floor (AD-13c's resolution); this build does not itself set a font-size literal outside the token | AC-LPB-11 |
| Spec IDs or invariant names leak onto the printed or on-screen lesson plan (a stray "FR-LP-7" or "INV-DM-33" left in a label or tooltip) | SR-9 violated — developer-facing text reaches the teacher using the widget | SR-9 cited explicitly here; every requirement above written to name the visible field, never the spec id, as the thing rendered; code review greps rendered strings for spec-id-shaped tokens | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern found in any rendered label, placeholder, or tooltip string |
| Raw ids leak into print view under time pressure | A parent-facing document with a UUID on it | FR-LPB-6; grep the rendered SVG for id-shaped strings | Manual check mirroring AC-UAB-6 |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s own §7). Not
written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-LPB-1…12 demonstrated
- [ ] AC-LPB-1/2/3: fixture prints of 0/1/3 populated tiers measure exactly
      1/2/4 pages respectively, each with the correct page-count text
- [ ] A physical or PDF-measured A4 portrait print test recorded with numbers
      for the all-three-tiers fixture
- [ ] AD-44 compliance demonstrated: no control on the lesson plan screen
      writes `BigIdea.title`, hierarchy, or `coverage[]` — only
      `lesson.bigIdeaId` (AC-LPB-6)
- [ ] Print body type measures at or above the 12pt (≈16px@96dpi) floor
      (AC-LPB-11) — this build does not inherit the logged sub-floor defect
- [ ] No spec id, invariant name, or requirement number ever rendered to the
      teacher using the widget (SR-9)
- [ ] No raw id ever rendered in print view (FR-LPB-6)
- [ ] No base64 image data in `unit.json` (FR-LPB-7)
- [ ] Sidebar renders nothing when empty; never adds a page (AC-LPB-7)
- [ ] Every new file under 150 lines, CSS values from `variables.css` only, no
      `!important` (CSS-1, CSS-2, CSS-5)
- [ ] `node:test` suite passes (TEST-1, TEST-2)
- [ ] Tier-page-emission extraction point flagged for `unit-assessment-document`
      (or vice versa, whichever lands second) per AD-LPB-1

**On completion:** set Status to Done, `git mv` this spec and its plan to
`_Done/`, update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
