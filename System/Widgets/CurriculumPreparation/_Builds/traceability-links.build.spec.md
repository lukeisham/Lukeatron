# traceability-links — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-23 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 5 (final — depends on every part but `resources-page`) |
| **One-liner** | The shared, derived reverse-link index (INV-DM-12) and the one shared clickable-code component (AD-32) that wire every already-built part's plain citations into a walkable, navigable web — the last build in the project, because there is nothing to wire until everything else exists. |

---

## 1. Motivation

Cross-part traceability (FR-TR) is "not new data — it is the existing
reference fields read in both directions" (datamodel §1b). Every forward
reference this build needs is already stored by an earlier build
(`lesson.nodeIds[]`, `lesson.bigIdeaId`, `lesson.assessmentLink`,
`criterion.assessmentIds[]`, and the rest of datamodel §1b's table); each of
those builds already renders its own plain-text citation (FR-TR-6, AD-12).
This build's job is the two things that could not exist until every part
did: the **reverse indices** those citations' targets need to be walked, and
the **one shared code-rendering component** (FR-TR-10…12, AD-32) that turns
a curriculum code, wherever it appears, into a click-to-navigate control in
edit view and plain text in print. It is named last in every ordering this
project keeps — `_PLAN.md`'s dependency graph: "all parts → traceability-links"
— because navigation between documents cannot be built before the documents
exist.

## 2. Scope

**In scope**
- A shared, importable **reverse-link index module**, rebuilt fresh from the
  loaded unit on every load, never persisted (INV-DM-12) — covering every
  genuinely cross-part derived relationship in datamodel §1b's table: node →
  lessons (lesson coverage), unit assessment (final/mini) → lessons, big
  idea → lessons, topic → big ideas, lesson → topic.
- The **shared code-rendering component** (FR-TR-10…12) — one module every
  consuming part imports — replacing the ad hoc, non-navigable code
  rendering each earlier build shipped before this one landed.
- Code-click navigation: scroll-to and highlight the target row on the
  coverage view, plus a back affordance to the exact document and position
  clicked from (FR-TR-11).
- Making the plain citations every earlier build already renders (FR-TR-6,
  AD-12) **navigable** in edit view, in both directions, without a reload
  (FR-TR-7).
- The one cross-part gap this couldn't be shown until every part existed: a
  mini or final assessment that no lesson references (FR-TR-8, AC-TR-5).
- The deletion-refusal check spanning assessments and lessons (AC-TR-6),
  coordinating with `unit-assessment-document`'s own delete logic rather than
  reimplementing it.

**Out of scope**
- The coverage grid's own within-grid gap cells (FR-BI-10…14, the taught /
  assessed / neither three-state comparison) — already `coverage-grid`'s
  build, wave 2. This build reads that result where needed; it does not
  recompute it.
- The arbor tree's own three independent coverage chips (FR-CUR-10…12) —
  already `arbor-tree`'s build, wave 2; this build only supplies the shared
  code component those chips' node-code labels use, not the chips
  themselves.
- `resources-page` — deliberately outside the link graph entirely (FR-RES-6,
  AD-26). This build adds no row, no check, no citation for it.
- Any new stored data or reverse edge. INV-DM-12 is absolute — every
  function this build writes reads existing forward references and computes
  a view; nothing is written back to `unit.json`.
- CSV export, print pagination, or any other document-specific rendering
  concern already owned by another build.

## 3. Requirements

- **FR-TRB-1** — A single, importable **reverse-link index module**,
  rebuilt fresh from the loaded unit on every load, never persisted
  (INV-DM-12), exposing one lookup per genuinely cross-part derived row in
  datamodel §1b's table: node → lessons, unit assessment (final/mini) →
  lessons, big idea → lessons, topic → big ideas, lesson → topic.
- **FR-TRB-2** — A **shared code-rendering component** — one module,
  imported by every part that renders a curriculum content-description code
  (lesson plan, Unit Assessment, crib sheet, marking matrix, arbor tree,
  coverage grid) — replacing whatever ad hoc plain-text rendering each of
  those builds shipped before this one landed. *(FR-TR-12, SR-4)*
- **FR-TRB-3** — In edit view, a code rendered through FR-TRB-2 is a
  **clickable control** that navigates to the curriculum map's coverage
  view, **scrolled to and highlighting** the target content description's
  row. *(FR-TR-10, AD-32)*
- **FR-TRB-4** — A code-click navigation carries a **back affordance**
  returning to the exact document and scroll position the user clicked
  from. *(FR-TR-11, AD-32)*
- **FR-TRB-5** — In print view, the same code renders as **plain text** — no
  underline, no colour, not clickable — identical to how every other
  citation already prints under AD-12. *(FR-TR-10, AD-32)*
- **FR-TRB-6** — Every cross-link a part already renders as a plain citation
  (FR-TR-6, AD-12) becomes **navigable in edit view, in both directions,
  without a reload** — lesson↔node, lesson↔big idea, lesson↔assessment,
  assessment↔matrix, big idea↔lessons. *(FR-TR-1…5a, FR-TR-7)*
- **FR-TRB-7** — A mini or final assessment that **no lesson references** is
  shown, not hidden — flagged visibly on the Unit Assessment document and
  the combined Lessons & Topics view. *(FR-TR-8, AC-TR-5)*
- **FR-TRB-8** — Deleting a mini assessment (or the final assessment) that
  lessons still link to is **refused**, naming the blocking lessons — the
  same refusal pattern FR-BI-8 already establishes, applied to the
  assessment↔lesson edge. *(AC-TR-6; coordinates with
  `unit-assessment-document`'s own delete logic — SR-4)*
- **FR-TRB-9** — No function in this build **stores** a reverse edge, a
  cached index, or any derived value in `unit.json` — every lookup
  recomputes from the existing forward references on each load. *(INV-DM-12)*
- **FR-TRB-10** — The reverse-index module and the code-rendering component
  are each **vanilla JS**, no framework, matching every other consumer in
  the bundle. *(FR-SYS-8, AD-13)*

**Acceptance criteria**

- **AC-TRB-1** — The full web is walkable in edit view, in one continuous
  session: lesson → curriculum node → back to every other lesson covering
  that node; lesson → big idea → its sibling lessons; lesson → Unit
  Assessment component → the marking matrix → back to the Unit Assessment.
  *(AC-TR-1)*
- **AC-TRB-2** — The same relationships are legible in print view — as
  citations, not clicks. *(AC-TR-2)*
- **AC-TRB-3** — Clicking a curriculum code on a lesson plan, in edit view,
  navigates to the coverage view with that content description's row
  scrolled into view and visibly highlighted. *(AC-TR-8)*
- **AC-TRB-4** — From the coverage view reached by a code click, the back
  affordance returns the user to the exact document and scroll position they
  clicked from. *(AC-TR-9)*
- **AC-TRB-5** — The same lesson plan printed to PDF shows the code as plain
  text — not underlined, not coloured, not clickable. *(AC-TR-10)*
- **AC-TRB-6** — A fixture with a mini assessment no lesson references shows
  it visibly flagged, on both the Unit Assessment document and the combined
  Lessons & Topics view. *(AC-TR-5)*
- **AC-TRB-7** — Deleting an assessment lessons still link to is refused,
  naming the blocking lessons; deleting one nothing links to succeeds.
  *(AC-TR-6)*
- **AC-TRB-8** — Grepping every part's source for a hand-rolled
  code-rendering block, rather than an import of the shared component,
  returns nothing once this build lands. *(FR-TR-12, SR-4)*
- **AC-TRB-9** — Reloading the unit produces byte-identical reverse-lookup
  results to before the reload, with nothing written to `unit.json` by any
  function in this build. *(INV-DM-12)*

## 4. Prerequisites & dependencies

- **Required first:** every part-owning build except `resources-page` —
  `curriculum-editor`, `arbor-tree`, `bigidea-list`, `coverage-grid`,
  `lesson-plan-document`, `lesson-plan-generator`, `unit-assessment-document`,
  `lessons-and-topics`, `marking-matrix`, `crib-sheet` — because this build's
  job is wiring navigation *between* documents that must already exist and
  already render their own plain-text citations (AD-12) before there is
  anything to make navigable. *(`_PLAN.md` dependency graph: "all parts →
  `traceability-links`", wave 5)*
- **Choose-one:** none — AD-12 and AD-32 already settle the screen/print
  split and the navigation shape; this build implements, it does not choose.
- **Coordinate-with:** every build named above, individually, for the
  **retrofit** half of this work (FR-TRB-2) — each currently ships its own
  ad hoc, non-navigable code rendering, since their own specs predate this
  one; swapping to the shared component touches their files, not only this
  build's own. `resources-page` is explicitly excluded (FR-RES-6, AD-26) —
  this build adds nothing to or about it.

**Gate:** work may start once every required-first build above is
implemented and verified — this is, by construction, the last build in the
project.

## 5. Decisions

- **AD-TRB-1** — *Decision:* the reverse-link index and the code-rendering
  component are each **one shared module**, not duplicated per consuming
  part. *Rationale:* SR-4 — grep siblings before adding logic; six parts
  already need identical code-click behaviour, and six independent
  implementations is six places a bug (or a future change to AD-32's rule)
  has to be fixed identically. *Rejected:* leaving each part's existing ad
  hoc code rendering in place and only layering click behaviour onto it
  locally — reintroduces exactly the "per-part reimplementation" FR-TR-12
  explicitly rules out.
- **AD-TRB-2** — *Decision:* this build's retrofit of earlier parts is a
  **small, additive change to each** (swap a rendering call for an import),
  not a rewrite. *Rationale:* every earlier build already renders the code
  as plain text somewhere; the retrofit only changes what wraps that text,
  not the data it reads. *Rejected:* reopening each earlier build's own spec
  to relitigate its code-rendering requirement — unnecessary churn when the
  change is genuinely additive.
- **AD-TRB-3** — *Decision:* FR-TRB-7's "assessment no lesson references"
  flag renders on the **Unit Assessment document and the Lessons & Topics
  view**, not a new, seventh screen. *Rationale:* AD-12's own consequence
  clause — gaps are shown on documents that already exist, never as a
  separate "traceability report" artefact (AD-12's Rejected section already
  rules that out generally; this applies that ruling to the one gap FR-TR-8
  names that no earlier build's own view already covers).
- **AD-TRB-4** — *Decision (resolves `OQ-TRB-2`):* the reverse-link index
  module (FR-TRB-1) lives in **its own file** — e.g. `app/js/traceability.js`
  — imported by whichever part needs it, rather than inside
  `document-shell`. *Rationale:* keeps SR-1's "one file, one job" intact
  rather than growing `document-shell` past its content-blind remit
  (FR-DS-8); every consumer already imports shared modules this way
  (mirrors AD-LPB-1's own shared-module pattern).

**Open questions**

- **OQ-TRB-1** — ✅ **RESOLVED (2026-08-29).** Does the retrofit
  (FR-TRB-2/AD-TRB-2) require reopening and re-versioning each of the six
  earlier builds' own `.build.spec.md` files, or is a one-line coordination
  note in each sufficient? *Resolved:* a one-line note in each affected
  file, added when this build lands — consistent with how
  `marking-matrix.build.spec.md` already anticipates this exact swap in
  its own §5, without needing FR-MM-14's own wording changed. A
  coordination-note decision, not a build requirement; no new FR needed.
- **OQ-TRB-2** — ✅ **RESOLVED (2026-08-29).** Where does the reverse-index
  module physically live — inside `document-shell` (since every consumer
  already depends on it), or as its own file this build introduces?
  *Resolved:* its own file (e.g. `app/js/traceability.js`), imported by
  whichever part needs it — keeps SR-1's "one file, one job" intact rather
  than growing `document-shell` past its content-blind remit (FR-DS-8).
  Recorded as new **AD-TRB-4**.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| An earlier build's own ad hoc code rendering survives instead of being retrofitted | FR-TR-12's "one shared component" promise silently fails, and a future change to AD-32's click behaviour has to be found and fixed six times | AD-TRB-1, plus the explicit grep check | AC-TRB-8 |
| The reverse index is accidentally persisted (cached in `unit.json` "for performance") | INV-DM-12 breaks, and the index can now disagree with the forward references it's supposed to mirror | FR-TRB-9 — explicit prohibition, tested by reload | AC-TRB-9 |
| A code-click navigation lands on the coverage view unfocused | The user has to re-find the row by eye in a tree that can hold 40+ nodes — AD-32's own stated reason this matters | FR-TRB-3's explicit scroll-and-highlight requirement | AC-TRB-3 |
| The back affordance returns to the wrong document or the top of the page instead of the exact click position | The user is stranded, teaching them not to click the next code | FR-TRB-4 | AC-TRB-4 |
| A forward reference some earlier build stored turns out unresolvable (a stale id) | This build's reverse index silently drops the edge instead of surfacing the dangling reference INV-DM-4 already forbids | Every lookup function asserts resolvability and surfaces, never swallows, a dangling reference — the same discipline FR-TR-8 already establishes for gaps | AC-TRB-6, extended to a deliberately broken fixture reference |

## 7. Plan

Not yet written — `traceability-links.plan.md` is the next step once this
spec is reviewed, following the same spec-then-plan discipline as every
other build in this project.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-TRB-1…9 demonstrated
- [ ] Grep confirms every consuming part imports the shared code component —
      no hand-rolled code rendering survives (SR-4)
- [ ] A full reload leaves `unit.json` byte-identical, confirming no reverse
      edge was written (INV-DM-12)
- [ ] Each of the six retrofitted builds' own spec carries the coordination
      note (OQ-TRB-1)
- [ ] `resources-page` carries no citation, chip, or link from this build

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
