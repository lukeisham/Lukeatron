# coverage-grid — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-19 |
| **Spec** | [coverage-grid.build.spec.md](coverage-grid.build.spec.md) |
| **Wave** | 2 |

## Prerequisites

- `local-store` exists and its load/save/mutate surface is settled.
- `bigidea-list` exists, or its `BigIdea` shape (including `coverage[]` per
  AD-CG-1) is frozen even if the list-management UI isn't built yet.
- The curriculum node model is populated for at least one fixture unit —
  nodes of kind `strand` and `outcome` exist with real `code`/`title` text.
- `style-guide`'s `variables.css` exists with the tokens this build needs
  (colour tokens for the three cell states plus **three distinct gap-kind
  tokens** — taught-but-not-assessed, assessed-but-not-taught, neither —
  spacing, typography).
- The unit's `finalAssessment` / `miniAssessments[]` exist with a
  qualified `coverage[]` per entry (`{nodeId, coverage, note}`), per
  `unit-assessment-document`'s OQ-UAB-1 resolution and this spec's OQ-CG-5.
  If that shape is not yet frozen, this build's assessment-column steps
  (7a–7d below) wait; the big-idea-only steps do not.

## Steps

1. **Build the fixture.** A synthetic unit with ~40 `outcome`-kind nodes
   under several `strand`-kind parents, 6 big ideas (2 carrying sub-ideas),
   one `finalAssessment`, and 3–5 `miniAssessments[]` — each assessment
   carrying a qualified `coverage[]` array — matching the Victorian History
   Levels 9–10 scale Luke described. Include at least one content
   description in each of the four states FR-CG-9 defines (covered,
   taught-but-not-assessed, assessed-but-not-taught, neither). This is the
   test subject for every step below. *(supports AC-CG-1, AC-CG-1a,
   AC-CG-8, AC-CG-13)*
2. **Render the two axes.** Big ideas (with sub-ideas) on one axis, content
   descriptions grouped under strand headers on the other, reading only
   from `local-store`'s loaded unit. *(FR-CG-1, FR-CG-1a)*
3. **Render cell state.** For each (bigIdea, node) pair, look up the big
   idea's `coverage[]` entry for that node and paint empty/full/partial.
   *(FR-CG-2, AD-CG-1)*
4. **Wire the cycle interaction.** Activating a cell advances
   empty → full → partial → empty, writing or removing the `coverage[]`
   entry through `local-store`. *(FR-CG-3)*
5. **Add the dedicated clear action.** A second control (not just cycling)
   that removes a cell's entry outright from any non-empty state.
   *(FR-CG-4)*
6. **Confirm attach/detach needs no navigation.** Verify steps 4–5 already
   cover both halves of the relationship directly in the grid; add any
   missing affordance (e.g. an explicit "attach" control if a bare cycle
   from empty reads ambiguously). *(FR-CG-5)*
7. **Add per-cell notes.** An in-place text control on a covered cell,
   saved through `local-store`, hidden on empty cells. *(FR-CG-6)*
8. **Build reorder.** Click-to-select-then-click-to-place as the primary
   mechanism (AD-CG-2) for repositioning a big idea along its axis, writing
   updated `order` values; layer a native drag enhancement on top once the
   click path works. *(FR-CG-7, OQ-CG-1)*
9. **Build reparent.** The same select-then-place mechanism for moving a
   sub-idea to a different top-level big idea; refuse and message on any
   attempt to nest under another sub-idea. *(FR-CG-8, INV-DM-14)*
10. **Render the assessment column group.** A second column group,
    visually distinct from the big-idea group (header band/divider), one
    column per `finalAssessment` (first) then each `miniAssessments[]`
    entry in order, against the same content-description rows.
    *(FR-CG-15, OQ-CG-5)*
11. **Render assessment cell state.** For each (assessment, node) pair,
    look up that assessment's own `coverage[]` entry for the node and
    paint empty/full/partial using the same cell vocabulary and visuals as
    step 3. *(FR-CG-16)*
12. **Wire assessment cell editing.** Reuse the cycle/clear/note mechanics
    from steps 4–5–7, retargeted so activation writes or removes the
    `coverage[]` entry on **that assessment's own record**
    (`finalAssessment.coverage[]` or the matching `miniAssessments[]`
    entry) — never on the node, never on a big idea. *(FR-CG-17,
    INV-DM-12)*
13. **Compute and render the three gap kinds.** Aggregate each content
    description's coverage across all big ideas AND across all assessments
    on load and on every change to either column group; classify into
    covered / taught-but-not-assessed / assessed-but-not-taught / neither,
    each with its own visual treatment. *(FR-CG-9, AD-CG-5)*
14. **Build the summary line.** A live count of descriptions in each of the
    three gap kinds, recomputed from the same aggregation as step 13 after
    every edit in either column group, displayed without scrolling.
    *(FR-CG-18)*
15. **Apply sticky headers, strand grouping, and collapsible column
    groups.** Pin the axis headers, group content descriptions under
    collapsible strand sections, add independent collapse/expand for the
    big-idea and assessment column groups (AD-CG-6) that preserves
    row-level gap-kind visibility while collapsed, and manually check the
    step-1 fixture (now ~12–14 data columns) renders without horizontal
    scrolling being the primary way to read a row. *(FR-CG-10, FR-CG-19,
    AD-CG-3, AD-CG-6)*
16. **Wire keyboard equivalents.** Tab/arrow focus across cells and
    controls in both column groups; Enter/Space to cycle; a
    Delete-equivalent to clear; confirmed equivalents for reorder,
    reparent, and column-group collapse/expand. *(FR-CG-11)*
17. **Audit the I/O boundary.** Grep the build's source for any direct
    `fetch`/`XMLHttpRequest` call; confirm every read and write routes
    through `local-store`, and that no reverse index is ever written back
    into the unit for either the big-idea or the assessment column group.
    *(FR-CG-12, INV-DM-12)*
18. **Audit dependencies.** Confirm vanilla ES modules only — no framework,
    bundler, or drag-and-drop package import anywhere in the build.
    *(FR-CG-13)*
19. **Finish the CSS pass.** One file per component, each under 150 lines,
    every value a `variables.css` token (including the three new gap-kind
    tokens), no `!important`. *(FR-CG-14)*
20. **Write the gate tests (TEST-7).** Two tests each for: the
    derived-not-stored reverse index on the big-idea side (a stored
    reverse edge is rejected; a correctly-derived one is accepted); the
    same pair on the assessment side (a stored node-side or big-idea-side
    write from an assessment-cell edit is rejected; a forward write onto
    the assessment's own `coverage[]` is accepted); and the two-level
    reparent cap (a sub-under-sub move is refused; a sub-to-top-level move
    succeeds). *(INV-DM-12, INV-DM-14)*
21. **Write the smoke tests (TEST-2).** Each module imports cleanly; the
    happy path (cycle a big-idea cell, cycle an assessment cell, reorder,
    reparent) produces the right `coverage[]` (on the correct owning
    entity)/`order`/`parentId` output; one guard path (illegal reparent)
    behaves as specified.
22. **Review against `bigidea-list`.** Once it exists, read its
    conventions for big-idea rendering, selection and CRUD, and align this
    build's list-axis code with them rather than inventing a second idiom.
    *(SR-6)*

## Verification

- [ ] **AC-CG-1** — fixture renders both axes fully labelled *(step 2)*
- [ ] **AC-CG-1a** — strand headers group descriptions correctly, in
      curriculum order *(step 2)*
- [ ] **AC-CG-2** — cell cycle empty→full→partial→empty confirmed against
      `coverage[]`, not just pixels *(step 4)*
- [ ] **AC-CG-3** — dedicated clear removes an entry from full or partial in
      one step *(step 5)*
- [ ] **AC-CG-4** — attach/detach round-trip through save/reload *(steps
      4–6)*
- [ ] **AC-CG-5** — a cell note persists after reload *(step 7)*
- [ ] **AC-CG-6** — reorder updates `order`, survives reload *(step 8)*
- [ ] **AC-CG-7** — valid reparent succeeds; sub-under-sub reparent refused
      with a message *(step 9)*
- [ ] **AC-CG-8** — the four-way fixture (neither /
      taught-but-not-assessed / assessed-but-not-taught / covered) each
      carries its own distinct indicator and no other *(step 13)*
- [ ] **AC-CG-9** — full keyboard pass reaches the same end state as the
      mouse pass, across both column groups *(step 16)*
- [ ] **AC-CG-10** — no direct network call outside `local-store` *(step 17)*
- [ ] **AC-CG-11** — no framework/bundler/drag-and-drop import *(step 18)*
- [ ] **AC-CG-12** — legible at fixture scale; CSS files under 150 lines,
      tokens only, no `!important` *(steps 15, 19)*
- [ ] **AC-CG-13** — second column group renders, visually distinct,
      final-then-mini order, against the same rows *(step 10)*
- [ ] **AC-CG-14** — assessment cell cycle confirmed against that
      assessment's own `coverage[]` array *(steps 11–12)*
- [ ] **AC-CG-15** — summary line counts match the fixture and update live
      on edit *(step 14)*
- [ ] **AC-CG-16** — save/reload shows the edited assessment's `coverage[]`
      only — no reverse edge, no cross-write onto a big idea *(step 12, 20)*
- [ ] **AC-CG-17** — collapsing either column group leaves the other and
      every gap-kind indicator legible; expand restores state *(step 15)*
- [ ] TEST-7 gate tests for INV-DM-12 (both column groups) and INV-DM-14,
      both directions *(step 20)*
- [ ] TEST-2 smoke tests for every module *(step 21)*
- [ ] Reviewed against `bigidea-list` conventions *(step 22)*
