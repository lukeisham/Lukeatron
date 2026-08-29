# coverage-grid — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-19 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 2 |
| **One-liner** | A grid edit view mapping big ideas AND the unit's assessments onto content descriptions many-to-many, with a full/partial coverage qualifier per pairing and taught/assessed gaps visible at a glance. |

---

## 1. Motivation

`bigIdeas[]` and the curriculum's content descriptions (`nodes[]` of kind
`outcome`) are two independent axes over the same unit (data model §1b). Luke
needs to see, edit, and audit how they meet — which big idea wholly satisfies
which description, which only partly touches one, and which descriptions
nobody has claimed at all. A list-of-checkboxes view answers "linked or not";
it cannot show *how much*, and at ~40 descriptions it cannot show gaps at a
glance either. A grid, with a coverage qualifier per cell, answers both.

The same question exists on the assessment side, and it is a distinct
question — "is this description TAUGHT?" (big ideas) is not "is this
description ASSESSED?" (the unit's assessments). Luke needs both answered in
one instrument, because the gap that matters pedagogically is not "nothing
covers this" alone — it is specifically *taught but never assessed* and
*assessed but never taught*, each a different kind of problem with a
different fix. A second, separate grid would force Luke to hold one page's
state in his head while reading the other; a second column group in the same
grid, against the same rows, lets both gaps read at a glance.

This is the edit view only. The same relationship prints elsewhere —
big ideas as chips on the arbor tree (landscape) — which is explicitly out of
scope here (§2).

## 2. Scope

**In scope**
- A two-axis grid: big ideas (including sub-big ideas) on one axis, content
  descriptions on the other.
- A **second, visually distinct column group** on the same axis as big
  ideas: the unit's assessments — the one final assessment plus every mini
  assessment — read against the same content-description rows.
- Per-cell coverage state — empty, full, partial — cycling and explicit
  clearing, using the same three-state vocabulary in both column groups.
- Attaching and detaching a big idea from a content description directly in
  the grid, with an optional short note per attachment. The same, for an
  assessment's own coverage link, in the assessment column group.
- Reordering big ideas along their axis, and reparenting a sub-big idea to a
  different top-level big idea, respecting the hard two-level cap
  (INV-DM-14).
- Gap indicators for any content description untouched by one or both
  sides — **three distinct gap kinds**: taught-but-not-assessed,
  assessed-but-not-taught, and neither — plus a summary line counting each.
- Legibility and navigation at realistic scale (~40 descriptions × 3–8 big
  ideas, now plus ~4–6 assessment columns) without the grid becoming
  unusable.
- A keyboard-operable equivalent for every mouse interaction.

**Out of scope**
- **Printing.** Big ideas print as chips on the arbor tree, in landscape —
  that is `arbor-tree`'s business (FR-CUR-6/7/8). This is edit view
  only; it produces no printable page.
- Creating or deleting big ideas or content descriptions outright — that is
  `bigidea-list` (big ideas) and `curriculum-editor` (nodes). This build only
  edits the *relationship* between existing rows on both axes.
- Any curriculum-specific vocabulary or rendering (INV-DM-10) — the grid
  reads `code`/`title`/`text` verbatim and `curriculum.labels` for display
  strings; it invents no curriculum knowledge of its own.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (AD-13).
- Creating, deleting, reordering, or renaming assessments, or editing any
  assessment field other than its own curriculum coverage links —
  that is `unit-assessment-document`'s concern. This grid reads the unit's
  `finalAssessment` / `miniAssessments[]` for their titles and coverage
  links only, and writes only to an assessment's own `coverage[]` array.
- Lessons, marking matrices, crib sheet — every other cross-reference in
  the link graph (data model §1b) is a different build's concern.

## 3. Requirements

- **FR-CG-1** — Renders a grid with content descriptions — curriculum nodes
  of kind `outcome` — on one axis and big ideas, including sub-big ideas, on
  the other; one cell per (bigIdea, node) pair. *(OQ-CG-3)*
- **FR-CG-1a** — Content descriptions are grouped under their parent
  strand's header (nodes of kind `strand`), in the curriculum's own order —
  never re-sorted or re-labelled by this build.
- **FR-CG-2** — Each cell renders exactly one of three states — empty, full,
  partial — read from the owning big idea's `coverage[]` entry for that
  node, if any exists. *(AD-CG-1)*
- **FR-CG-3** — Activating a cell (click, or its keyboard equivalent) cycles
  its state: empty → full → partial → empty, writing or removing the
  corresponding `coverage[]` entry on the big idea as it does. *(FR-CG-11)*
- **FR-CG-4** — A dedicated clear action removes a cell's coverage entry
  outright from any state in one step — distinct from cycling past partial,
  for a direct "take this off" action that doesn't cost two activations.
- **FR-CG-5** — Attaching a big idea to a content description (any
  non-empty state) and detaching it (back to empty) are both reachable
  directly from the grid — no navigation to another edit view for either half
  of the relationship.
- **FR-CG-6** — A cell holding a coverage entry may carry a short free-text
  `note`, editable in place without leaving the grid. *(OQ-CG-2)*
- **FR-CG-7** — Big ideas can be reordered along their axis; a reorder
  updates `order` on every big idea whose position changed. *(OQ-CG-1)*
- **FR-CG-8** — A sub-big idea can be moved to a different **top-level**
  big idea; an attempted move that would nest a sub-idea under another
  sub-idea is refused, enforcing the two-level cap. *(INV-DM-14)*
- **FR-CG-9** *(REVISED — was "any content description with zero coverage
  from any big idea is flagged as a gap")* — Every content description is
  classified into exactly one of four states, each visually distinguishable
  at a glance and never merged into a single flag: **covered** (taught by
  at least one big idea AND assessed by at least one assessment — no gap);
  **taught-but-not-assessed** (covered by a big idea, zero assessment
  coverage); **assessed-but-not-taught** (covered by an assessment, zero
  big-idea coverage); **neither** (zero coverage from both sides). The
  classification is computed per content description, aggregated across
  every big idea and every assessment, exactly as the prior single-gap
  computation was aggregated across big ideas alone. *(AD-CG-5)*
- **FR-CG-10** *(REVISED — was "~40 descriptions × 3–8 big ideas")* — At
  realistic scale (~40 content descriptions × 3–8 big ideas × ~4–6
  assessments — roughly 12–14 total data columns) the grid stays legible
  and navigable without horizontal scrolling becoming the primary way to
  read it. *(AD-CG-3, FR-CG-19)*
- **FR-CG-11** — Every mouse interaction — cycle, clear, note edit, reorder,
  reparent — has a keyboard-operable equivalent.
- **FR-CG-12** *(REVISED — extended to the assessment column group)* — Reads
  and writes the unit **only** through the `local-store` client; this build
  never calls the bundle server directly and never writes a derived reverse
  index into the data, for either column group. Both a big idea's
  `coverage[]` and an assessment's `coverage[]` are forward edges owned by
  their respective entity; the grid never writes a node-side list of
  covering big ideas or covering assessments — both directions are derived
  fresh on load and after every edit. *(AD-13, INV-DM-12)*
- **FR-CG-13** — Vanilla ES modules only — no framework, no bundler, no
  third-party drag-and-drop library. *(FR-SYS-8, JS-7, AD-CG-2)*
- **FR-CG-14** — CSS uses only tokens from `variables.css`; no hardcoded
  values, no `!important`; one file per component, each under 150 lines.
  *(CSS-1, CSS-2, CSS-5)*

- **FR-CG-15** — Renders a **second column group**, visually distinct from
  the big-idea column group (a header band, divider, or grouping treatment
  that reads as "a different kind of column" without a second grid), for
  the unit's assessments: the one `finalAssessment` plus every entry in
  `miniAssessments[]`, in that fixed order (final first). One column per
  assessment, against the same content-description rows as the big-idea
  group. *(OQ-CG-5)*
- **FR-CG-16** — Each assessment-column cell renders exactly one of the same
  three states as a big-idea cell — empty, full, partial — read from that
  assessment's own qualified `coverage[]` entry
  (`{nodeId, coverage: "full" | "partial", note}`) for the row's node, if
  one exists. Both column groups share one cell vocabulary and one visual
  language, so the grid reads as one instrument, not two bolted together.
  *(mirrors FR-CG-2; OQ-CG-5)*
- **FR-CG-17** — An assessment cell is directly editable in the grid,
  mirroring the big-idea cell's cycle (FR-CG-3), dedicated clear (FR-CG-4),
  attach/detach (FR-CG-5), and in-place note (FR-CG-6) — with one binding
  difference: activating an assessment cell writes or removes the
  corresponding `coverage[]` entry on **that assessment's own record**
  (`finalAssessment.coverage[]` or the matching `miniAssessments[]`
  entry's `coverage[]`), never on the content-description node and never
  on any big idea. This is a forward write onto the assessment, exactly as
  a big-idea cell writes forward onto the big idea (AD-CG-1) — no reverse
  edge is ever stored (INV-DM-12, FR-CG-12).
- **FR-CG-18** — A summary line, visible without scrolling, reports a live
  count of content descriptions in each of the three gap kinds defined by
  FR-CG-9 (taught-but-not-assessed / assessed-but-not-taught / neither),
  recomputed after every edit to any cell in either column group.
- **FR-CG-19** — Each column group (big-idea, assessment) can be collapsed
  to a narrow labelled strip and re-expanded independently of the other,
  without losing per-row gap-kind indicators, which remain visible at the
  row header regardless of either group's collapsed state. *(AD-CG-6)*

**Acceptance criteria**

- **AC-CG-1** — A fixture unit with ~40 outcome-kind nodes and 6 big ideas
  (2 with sub-ideas) renders a grid with both axes fully labelled.
- **AC-CG-1a** — The fixture's strand headers group their content
  descriptions correctly and in curriculum order.
- **AC-CG-2** — Activating an empty cell sets it full; activating again sets
  partial; activating again clears it — each transition confirmed against
  the big idea's `coverage[]` array, not just the pixel.
- **AC-CG-3** — The clear action removes a cell's entry from full or from
  partial in one step.
- **AC-CG-4** — Attaching writes a `coverage[]` entry with a resolvable
  `nodeId`; detaching removes it; both round-trip through a save/reload via
  the `local-store` fixture.
- **AC-CG-5** — Text typed into a cell's note persists after reload.
- **AC-CG-6** — Reordering a big idea (drag, or click-select-then-click)
  updates `order` on the affected big ideas; the new order survives reload.
- **AC-CG-7** — Reparenting a sub-idea to a different top-level big idea
  succeeds; attempting to reparent it under another sub-idea is refused
  with a message naming why.
- **AC-CG-8** *(REVISED — was "one content description has no coverage[]
  entry from any big idea")* — In a fixture where one content description
  has zero big-idea coverage AND zero assessment coverage ("neither"), one
  has big-idea coverage but zero assessment coverage
  ("taught-but-not-assessed"), and one has assessment coverage but zero
  big-idea coverage ("assessed-but-not-taught"), each carries its own
  distinct gap-kind indicator and no other description does; a fourth,
  fully-covered description carries none.
- **AC-CG-9** — A full pass using only keyboard (tab/arrow focus, Enter or
  Space to cycle, a Delete-equivalent to clear) reaches the same end state
  as the equivalent mouse sequence in AC-CG-2 and AC-CG-3.
- **AC-CG-10** — Inspecting network activity during a full interaction pass
  shows calls only into `local-store`'s exported functions — no direct
  `fetch()` to the bundle server from this build's code.
- **AC-CG-11** — Grepping the build's source for a framework, bundler, or
  drag-and-drop package import returns nothing.
- **AC-CG-12** — At the AC-CG-1 fixture scale, a manual review confirms the
  grid is readable without the browser's horizontal scrollbar being the
  primary means of reading a row; every CSS file is under 150 lines and
  free of hardcoded values or `!important`.
- **AC-CG-13** — A fixture unit with one `finalAssessment` and three
  `miniAssessments[]` renders a second column group, visually distinguishable
  from the big-idea group, with one column per assessment (final first, in
  order) against the same rows as AC-CG-1.
- **AC-CG-14** — Activating an assessment cell cycles empty → full →
  partial → empty, each transition confirmed against that assessment's own
  `coverage[]` array (`finalAssessment.coverage[]` or the matching
  `miniAssessments[]` entry) — never against a big idea's or a node's data.
- **AC-CG-15** — After AC-CG-8's fixture, the summary line reports counts
  matching the fixture exactly (one of each gap kind), and updates
  immediately when an edit changes which kind a description falls into
  (e.g. adding assessment coverage to the taught-but-not-assessed row
  moves it to zero-gap and decrements that count).
- **AC-CG-16** — After a save/reload round-trip through the `local-store`
  fixture, inspecting the saved unit shows the edited assessment's
  `coverage[]` entry and no new field anywhere else — no reverse edge on
  the node, no cross-write onto any big idea's `coverage[]`, no
  assessment-side list appearing on a node record.
- **AC-CG-17** — At a widened fixture scale (~40 descriptions × 8 big ideas
  × 5 assessments), collapsing either column group leaves the other's
  cells and every row's gap-kind indicator fully legible; expanding it back
  restores the prior state without a reload.

## 4. Prerequisites & dependencies

- **Required first:** [`local-store`](local-store.build.spec.md) — this
  build's only path to the unit. `bigidea-list` — the big-idea CRUD and
  list conventions this grid's reorder/reparent interactions extend, and the
  source of the `coverage[]` field on `BigIdea` (§ data model, AD-CG-1). The
  curriculum node model must be populated — nodes of kind `outcome`/`strand`
  exist, via `curriculum-editor` or `curriculum-ingest`, whichever G-9
  leaves standing.
- **Choose-one:** none remaining for this build. G-2, G-5 and G-9 are
  project-level gates this build does not resolve or depend on directly;
  where G-9's outcome would change how nodes arrive, this build is
  unaffected — it only reads whatever nodes already exist (OQ-CG-4).
- **Coordinate-with:** [`arbor-tree`](../_Spikes/CurriculumPreparation/DEPENDENTS.md)
  — shares the coverage vocabulary (`full`/`partial`) and the derived
  reverse index (node → covering big ideas). Neither build stores the
  reverse edge (INV-DM-12); both derive it independently from the same
  forward data, so the derivation logic should read identically in both —
  sequence review of the two builds' derivation code rather than letting
  them diverge silently.
  [`unit-assessment-document`](unit-assessment-document.build.spec.md) —
  this build reads `finalAssessment` / `miniAssessments[]` and their
  `coverage[]` links (shape `{nodeId, coverage, note}`, per that build's
  AD-UAB-1/OQ-UAB-1) and writes back into the same `coverage[]` arrays; it
  does not own assessment CRUD. The two builds must agree on field names
  and the qualified-coverage shape — see OQ-CG-5.

**Gate:** work may start when `local-store`'s endpoint shape is settled and
`bigidea-list` exists (or, if built in parallel, once its `BigIdea` shape —
including `coverage[]` — is frozen).

## 5. Decisions

- **AD-CG-1** — *Decision:* coverage is stored **forward, on the big idea**
  — `BigIdea.coverage[]` of `{ nodeId, coverage: "full" | "partial", note }`
  — replacing the plainer `nodeIds[]` sketched in the data-model spec's
  `BigIdea` entry (FR-BI-7). The node side is never written; any
  node → covering-big-ideas view is derived on load. *Rationale:* Luke's own
  call — a bare id list cannot carry the full/partial qualifier the whole
  point of this build depends on, and a second, node-side stored list would
  duplicate the forward edge and risk disagreeing with it (INV-DM-12's
  reasoning applies here as much as to the traceability links). *Rejected:*
  keeping `nodeIds[]` and adding a parallel `coverageQualifiers[]` map
  (two arrays that must stay in lockstep is worse than one that carries
  everything). **Flag:** the data-model spec's `BigIdea.nodeIds[]` row
  should be amended to `coverage[]` by whoever next revises that document —
  this build does not edit `_Spikes/` files.
- **AD-CG-2** — *Decision:* click-to-select-then-click-to-attach/reorder is
  the **primary** interaction for both reordering big ideas and reparenting
  a sub-idea; a hand-rolled pointer-drag is layered on top as an
  enhancement, never the only path. *Rationale:* a 40×8 grid under
  `AD-CG-3`'s sticky-header layout has many small interactive targets close
  together — exactly the condition where a hand-rolled drag (no library,
  per FR-CG-13) is most likely to misfire, and a mouse-only interaction
  would fail FR-CG-11 outright. Select-then-click degrades gracefully to
  keyboard and touch for free. *Rejected:* drag-and-drop as the only
  mechanism; a third-party DnD library (breaks FR-CG-13).
- **AD-CG-3** — *Decision:* legibility at scale comes from **sticky
  headers** (big-idea row/column pinned, content-description axis pinned)
  **plus strand grouping** with collapsible strand sections, not a
  zoomed-out overview or virtualised list. *Rationale:* ~40 rows is well
  within a browser's native rendering budget — virtualisation would be
  over-engineering for the stated scale (SR-3 cuts both ways) — and strand
  grouping reuses the same mental model `arbor-tree` already gives Luke for
  the curriculum axis. *Rejected:* a minimap/zoom control (imprecise for
  clicking a specific cell); virtualised rendering (unneeded complexity at
  this row count).
- **AD-CG-4** — *Decision:* cell writes are **optimistic** — the DOM updates
  immediately on activation, and the change is handed to `local-store`'s
  existing debounced-save path (FR-LS-4) rather than waiting for a server
  round-trip before reflecting the click. *Rationale:* cycling a cell is the
  single most repeated action this screen has; a pessimistic wait-for-save
  UI would make the grid feel laggy at exactly the interaction that needs to
  feel instant. `local-store` already surfaces save failure and
  server-unreachable states independently (FR-LS-10, FR-LS-11), so this
  build does not need to duplicate that machinery. *Rejected:* a
  confirm-then-render write, or a local pending/committed visual distinction
  per cell (adds a fourth cell-state variant nobody asked for).
- **AD-CG-5** — *Decision:* the gap indicator is computed **per content
  description**, aggregated across all big ideas — not per cell. A "gap" is
  "this description has no coverage from anything," shown once on that
  description's row/column header. *Rationale:* in a 40×8 grid most
  individual cells are empty by design; colouring every empty cell as a
  potential gap would be noise. What Luke actually needs to see is which
  whole descriptions nobody has claimed. *Rejected:* per-cell gap styling
  for every empty cell.
- **AD-CG-6** — *Decision:* the wider grid stays legible through
  **independently collapsible column groups** (each of big-idea and
  assessment can collapse to a narrow labelled strip and re-expand), not a
  three-way "taught / assessed / both" toggle that hides one group's data
  entirely. *Rationale:* the requirement driving this whole change is that
  Luke sees both taught-gaps and assessed-gaps in **one instrument** — a
  toggle that switches the grid to show only "taught" or only "assessed"
  re-creates the two-separate-views problem the merged grid exists to
  solve, and would hide exactly the cross-reference (this row is taught
  but not assessed) the summary line (FR-CG-18) exists to surface.
  Collapsing narrows a group's footprint without removing its gap
  contribution from the row-level indicator, which stays visible either
  way (FR-CG-19). *Rejected:* a three-way view toggle (defeats the "one
  instrument" requirement); always-expanded with no collapse at all
  (untested at the ~12–14 column width this change adds, risking AC-CG-12's
  legibility bar).

**Open questions**

- **OQ-CG-1** — Does reordering a top-level big idea carry its sub-ideas
  with it as a block, or do sibling groups reorder independently? ✅
  **RESOLVED (2026-08-29).** A top-level move carries its own sub-ideas as
  a block; sub-ideas otherwise reorder only within their current parent's
  group — see `FR-CG-7`.
- **OQ-CG-2** — Does a cell's `note` need a length cap? ✅ **RESOLVED
  (2026-08-29).** No hard cap — no sibling free-text field in the data
  model (e.g. `lesson.bigIdeaNote`) carries one either — see `FR-CG-6`.
- **OQ-CG-3** — Should `task`-kind nodes (elaborations under an outcome)
  also appear as grid rows, or only `outcome`-kind nodes? ✅ **RESOLVED
  (2026-08-29).** `outcome`-kind only — a task is illustrative detail
  beneath a content description, not a separately coverable unit, and this
  keeps the row count near the ~40 Luke described rather than several
  times that — see `FR-CG-1`.
- **OQ-CG-4** — `bigidea-list` is not yet specced (`_Builds/_PLAN.md` marks
  it "○ Not specced"), so this spec is written ahead of its formal
  dependency. ✅ **RESOLVED (2026-08-29).** This spec proceeds now against
  the data model's `BigIdea` shape (as amended by `AD-CG-1`); implementation
  still waits on `bigidea-list` actually existing, per the existing wave-2
  dependency graph — this build adds no new gate of its own.
- **OQ-CG-5** — `unit-assessment-document` (wave 3) is where
  `MiniAssessment`'s coverage links are defined; as of this writing that
  build's own OQ-UAB-1 records them settling on the qualified shape
  `{nodeId, coverage: "full" | "partial", note}` (matching `BigIdea.coverage[]`
  per AD-CG-1), superseding an earlier bare `nodeIds[]` sketch. ✅
  **RESOLVED (2026-08-29).** Assessment coverage links use the qualified
  shape `{nodeId, coverage, note}`, as settled by `unit-assessment-document`
  — this spec is written against that shape for both
  `finalAssessment.coverage[]` and every `miniAssessments[]` entry's
  `coverage[]` (`FR-CG-16`/`FR-CG-17`). If `unit-assessment-document` lands
  with a different shape before this build starts, reconcile before
  implementation; this build adds no new gate of its own beyond that
  existing wave-3 dependency.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| 40×8 grid becomes unreadable without constant horizontal scrolling | The edit view fails the one job it exists for | Sticky headers + strand grouping (AD-CG-3) | AC-CG-12 |
| Hand-rolled pointer drag misfires or is mouse-only | Reorder/reparent breaks for keyboard and touch users, fails FR-CG-11 | Click-to-select-then-click is the primary path; drag is an enhancement (AD-CG-2) | AC-CG-6, AC-CG-7, AC-CG-9 |
| Cycling and clearing conflated in the UI | Detaching a full attachment costs two clicks and confuses "I meant to clear this" with "I meant partial" | Dedicated clear action distinct from the cycle (FR-CG-4) | AC-CG-3 |
| Grid derives and caches a node-side reverse index that drifts from the forward `coverage[]` data | Two sources of truth disagree — the exact failure class INV-DM-12 exists to forbid | Reverse view computed fresh on load, never stored (FR-CG-12) | gate test, both directions |
| A sub-idea gets reparented under another sub-idea | Three-level nesting corrupts the two-level invariant (INV-DM-14) | Reparent target restricted to top-level big ideas at the UI edge | gate test, both directions; AC-CG-7 |
| Optimistic cell write races the debounced autosave and a later click silently overwrites an earlier one before it saved | A recorded coverage change is lost without Luke noticing | Rely on `local-store`'s existing debounce + loading/error-state contract (AD-CG-4, FR-LS-4, FR-LS-10) rather than a second ad hoc save path | AC-CG-5, cross-checked against `local-store`'s AC-LS-4 |
| `arbor-tree` derives the same reverse index differently | The curriculum map and this grid disagree about which nodes are covered | Named coordinate-with; shared vocabulary reviewed across both builds | manual cross-review at both builds' completion |
| The three gap kinds get collapsed back into one flag under implementation pressure | Luke can no longer tell "nobody teaches this" from "somebody teaches it but nobody assesses it" — the entire point of this change is lost | FR-CG-9 names all three explicitly with distinct visual treatment; AC-CG-8 fixture requires all three present simultaneously | AC-CG-8, AC-CG-15 |
| An assessment cell edit writes onto a node or a big idea instead of the assessment's own record | A second reverse edge appears exactly where INV-DM-12 forbids one, on the newly-added axis | FR-CG-17 names the write target explicitly; forward-only write mirrors AD-CG-1's big-idea pattern | gate test, both directions; AC-CG-16 |
| Twelve-to-fourteen data columns push the grid past AC-CG-12's legibility bar | The edit view fails the one job it exists for, now on both axes | AD-CG-6 collapsible column groups; FR-CG-10 revised scale target | AC-CG-12, AC-CG-17 |

## 7. Plan

See [`coverage-grid.plan.md`](coverage-grid.plan.md).

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-CG-1…17 demonstrated
- [ ] **TEST-7 gate tests exist and pass in both directions** for: the
      derived-not-stored reverse index (INV-DM-12, both the big-idea and the
      assessment column groups) and the two-level reparent cap (INV-DM-14)
- [ ] Smoke tests per TEST-2: each module imports cleanly, happy path
      (cycle a cell, reorder, reparent) produces the right output, one guard
      path (illegal reparent) behaves
- [ ] Every `fetch`-equivalent goes through `local-store`; no direct network
      call from this build's code (AC-CG-10)
- [ ] Zero third-party dependencies; vanilla ES modules only (AC-CG-11)
- [ ] Every CSS file under 150 lines, tokens only, no `!important`
      (AC-CG-12)
- [ ] No `innerHTML` used on unit content (JS-6)
- [ ] Full keyboard pass reaches the same end state as the mouse pass
      (AC-CG-9)
- [ ] Reviewed against `bigidea-list`'s conventions for consistency (SR-6)

**On completion:** set Status to Done, `git mv` this spec and its plan to
`_Done/`, update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
