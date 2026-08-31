# bigidea-list — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 2 |
| **One-liner** | The unit's second organising axis — a two-level curated big-idea list, the topics layer above it, and the Big Idea Tree screen (markdown outline editor + ASCII print) that arranges both. |

---

## 1. Motivation

Every lesson, crib-sheet section, and Unit Assessment binding points *at* a
big idea (FR-BI-4, FR-CS-2, FR-UA-5) — the big-idea list is the one thing
that must exist before any of wave 3's document builds can render a real
unit. `_PLAN.md`'s own dependency graph names this a **hard edge**:
"`bigidea-list` before `lesson-plan-document`" and "before
`unit-assessment-document`" both, because FR-BI-4 makes the binding
mandatory — a lesson literally cannot be a valid record before the list
exists. `DEPENDENTS.md` filed this as row 12: "a two-level curated list with
mandatory binding from another entity, and derived reverse lookup" — small
in code, but load-bearing in the schema.

This build also closes a second, adjacent gap: `FR-BI-16…20` (the Big Idea
Tree screen, Change AJ) and `FR-TOP-1…7` (the basic topics list, Change P)
both describe capability that has to live somewhere, and neither has a home
of its own in `_PLAN.md`'s wave table. Both belong here — the Big Idea Tree
is explicitly the arranging surface for *this* list (AD-51), and a
top-level big idea cannot even be schema-valid without a topic to bind to
(`topicId` is mandatory, INV-DM-34) — so a `bigidea-list` build that didn't
also stand up a minimal topics list would ship an unsatisfiable invariant.

**A note on scope creep, addressed directly.** `FR-TOP-8` onward — the
combined Lessons & Topics view, its print output, per-item completion
flags, scheduling, and grouping — is a substantial, separate feature with
**no subtask row in `_Builds/_PLAN.md` at all**. This build does not
attempt it (see Scope, Out of scope). That absence is flagged here as a
real gap in the project's own plan, not silently patched by folding the
whole feature into this build — see §6 Risks.

## 2. Scope

**In scope**
- The big-idea list itself: add, rename, reorder, re-parent between levels,
  delete (FR-BI-3), with the two-level cap enforced as a hard data rule
  (FR-BI-2, INV-DM-14).
- The **basic topics list**: add, rename, reorder, delete (FR-TOP-2), and
  the mandatory `topicId` binding on every top-level big idea (FR-TOP-3,
  INV-DM-34) — including the delete-refusal rule when big ideas still
  reference a topic (FR-TOP-7).
- Refusing to delete a big idea or topic that something still points to,
  naming the blocker (FR-BI-8, FR-TOP-7).
- The `coverage[]` field's **schema and write API** on `BigIdea` (and its
  topic-level counterpart, `Topic.coverage[]`) — the field this build owns
  and `coverage-grid` edits (AD-CG-1). This build does not render a
  coverage-editing UI of any kind (that is `coverage-grid`'s screen).
- FR-BI-6/FR-TOP-5: the query surface answering "every lesson bound to this
  big idea" and "every big idea bound to this topic," including the
  zero-result case (a big idea or topic with nothing under it).
- FR-BI-15: the **domain glyph-set derivation** — union of `FR-CUR-13`'s
  domain values across a big idea's own `coverage[]` — exposed as one
  shared function every consumer (this build's own list, `coverage-grid`,
  `arbor-tree`, `lesson-plan-document`, `crib-sheet`, and eventually
  Lessons & Topics) calls rather than reimplements.
- The **Big Idea Tree** screen (FR-BI-16…20, AD-51): setup mode's
  markdown-style outline editor (line = big idea/sub-big idea, indentation
  = `parentId`, line order = `order`), print mode's ASCII/monospace
  connector tree, and the one-click copy-to-clipboard control on both
  modes.
- The two-level cap's **editing-time enforcement**: a third indentation
  level is refused and flagged inline, never silently flattened or dropped
  (FR-BI-18).
- Persistence of every write above through `local-store` only.

**Out of scope**
- **The coverage grid itself** — `coverage-grid` (already specced, wave 2)
  owns the grid UI, the full/partial cycling interaction, and the gap
  states (FR-BI-10…14). This build supplies the field it edits and nothing
  more.
- **Curriculum node creation or editing** — `curriculum-editor` /
  `curriculum-ingest`'s job. This build only ever reads a node's `code` and
  `domain` (via FR-BI-15) to compute a glyph; it never writes a node.
- **Lesson creation or the lesson-side binding control** —
  `lesson-plan-document` / `lesson-plan-generator`'s job. This build
  exposes the list a lesson's picker reads from, never the picker itself.
- **The combined Lessons & Topics view** (FR-TOP-8 through FR-TOP-14b) —
  per-item completion flags, scheduling (date/lesson-period), grouping-by-
  date, and the whole view's own print output. This is a separate,
  currently unspecced, currently unlisted subtask — see §6.
- **Arbor tree's chip rendering** — `arbor-tree`'s job; this build only
  guarantees the big-idea data (including the derived glyph set) that
  build reads.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (AD-13).

## 3. Requirements

> **Requirement families.** `FR-BI-n` and `FR-TOP-n` are the **PRD-level**
> families (big-idea list and topics respectively). `FR-BIB-n` below is the
> **build-level** family, the same PRD/build split every other build in this
> folder uses.

- **FR-BIB-1** — Big ideas: add, rename, reorder, re-parent between levels,
  delete — enforcing the **exactly-two-levels** cap as a hard rule, never a
  soft warning (FR-BI-1…3, INV-DM-14).
- **FR-BIB-2** — Deleting a big idea **refuses** if any lesson is bound to
  it (`lesson.bigIdeaId`) or any topic-coverage/crib-sheet-section still
  references it, naming every blocker (FR-BI-8).
- **FR-BIB-3** — Topics: add, rename, reorder, delete — a flat, ordered list
  (FR-TOP-1, FR-TOP-2).
- **FR-BIB-4** — Every top-level big idea (`parentId: null`) carries a
  mandatory `topicId`; a sub-big idea carries none of its own and inherits
  its parent's transitively (FR-TOP-3, INV-DM-34). A top-level big idea
  cannot be saved without one.
- **FR-BIB-5** — Deleting a topic **refuses** if any top-level big idea
  still carries its id, naming every blocker (FR-TOP-7) — the same refusal
  shape as FR-BIB-2.
- **FR-BIB-6** — Owns the `coverage[]` field's **schema and write API** on
  both `BigIdea` and `Topic` — `{ nodeId, coverage: "full" | "partial",
  note }`, matching `coverage-grid`'s own `AD-CG-1` decision exactly. This
  build implements no UI for editing it; `coverage-grid` is the only
  caller.
- **FR-BIB-7** — Exposes "every lesson bound to this big idea" (FR-BI-6)
  and "every big idea bound to this topic" (FR-TOP-5), each including the
  explicit zero-result state — never a silent empty list indistinguishable
  from "not loaded yet."
- **FR-BIB-8** — Computes a big idea's **domain glyph set** — the union of
  `FR-CUR-13`'s `domain` values across every node in its own `coverage[]`:
  none, one, or both — as one shared, derived (never stored) function
  (FR-BI-15, INV-DM-12). A node's own effective domain is resolved by
  `curriculum-editor`'s `FR-CEB-5` (walking to the nearest ancestor
  strand) — this function calls that one rather than re-walking node
  ancestry itself. Every other build that renders a big idea's title
  calls this function rather than recomputing it (AD-BI-2).
- **FR-BIB-9** — The **Big Idea Tree**, setup mode: a plain markdown-style
  outline — one line per big idea/sub-big idea, `- Title`, one level of
  indentation nesting a sub-big idea under the nearest preceding
  unindented line. Editing the outline writes `BigIdea.order` (line
  position) and `BigIdea.parentId` (indentation) directly — no new field
  (FR-BI-16, AD-51).
- **FR-BIB-10** — A doubly-indented line (a third level) is **refused**,
  flagged inline at the offending line — never silently flattened to two
  levels, never silently dropped (FR-BI-18, INV-DM-14).
- **FR-BIB-11** — A big idea with **no** sub-big ideas renders as a bare
  line, no tree connector, in both setup and print mode. Connectors appear
  for a big idea only once it has one or more sub-big ideas nested under it
  — an unarranged list therefore reads as a plain list, never a
  one-branch-per-line tree (FR-BI-17).
- **FR-BIB-12** — The Big Idea Tree, **print mode**: renders the same list
  as an ASCII/monospace connector tree (`├──`, `└──`, `│`), A4 portrait,
  fixed orientation, reflecting the exact order and nesting setup mode last
  saved (FR-BI-19, AD-11).
- **FR-BIB-13** — Both setup mode and print mode carry a **one-click
  copy-to-clipboard** control that copies exactly the text on screen — the
  editable outline in setup, the connector tree in print. Screen chrome
  only; excluded from the physical print/PDF output (FR-BI-20,
  `navigator.clipboard.writeText()`, no dependency).
- **FR-BIB-14** — The outline editor writes **only** `title`, `order` and
  `parentId`. A big idea's optional `text` elaboration and its
  `coverage[]`/`topicId` bindings are never editable inline in the outline
  — they stay on this build's own per-item detail surface (a click-to-
  expand panel), resolving AD-51's own flagged assumption in the direction
  that assumption already recommended.
- **FR-BIB-15** — Persists every write above through the `local-store`
  client only. No direct filesystem access from the browser (AD-13).
- **FR-BIB-16** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library (FR-SYS-8, AD-13a).
- **FR-BIB-17** — Exposes the **lesson → topic transitive resolution**
  (`lesson.bigIdeaId` → `BigIdea` [→ its parent, if a sub-big idea] →
  `topicId` → `Topic`, AD-35) as one shared function, the same
  never-stored, never-duplicated discipline FR-BIB-8 already applies to the
  domain glyph set (INV-DM-12). `lesson-plan-document` (`FR-LPB-1`'s topic
  display, already specced) and the future `lessons-and-topics` build both
  call this function rather than each walking the chain independently
  (AD-BI-5).
- **FR-BIB-18** — The per-item detail panel (`AD-BI-3`'s home for `text`,
  `coverage[]` display, and `topicId`) opens as an **inline click-to-expand
  row inside the Big Idea Tree screen** — clicking a big idea's line
  expands the panel directly beneath it, in place; there is no modal and no
  separate side panel. Only one row is expanded at a time; clicking another
  row's line collapses the first and expands the new one (`OQ-BI-1`,
  `AD-BI-6`).

**Acceptance criteria**

- **AC-BIB-1** — A big idea with three sub-big ideas renders on the Big
  Idea Tree and survives save → reopen (AC-BI-1).
- **AC-BIB-2** — Attempting a third nesting level in the outline is refused
  with an inline flag at that line — the outline is not silently
  re-indented and the invalid line is not silently dropped (AC-BI-4,
  AC-BI-12).
- **AC-BIB-3** — Deleting a big idea bound to two lessons is refused,
  naming both lessons (AC-BI-5).
- **AC-BIB-4** — A top-level big idea cannot be created or saved without a
  `topicId` (AC-TOP-2).
- **AC-BIB-5** — Deleting a topic that big ideas are still bound to is
  refused, naming every blocking big idea (AC-TOP-3).
- **AC-BIB-6** — A topic with three big ideas bound to it shows all three
  via FR-BIB-7's query surface (AC-TOP-1).
- **AC-BIB-7** — A fixture outline with two big ideas carrying sub-big
  ideas and three carrying none renders exactly two branched trees and
  three bare lines in setup mode, and identically as ASCII connectors in
  print mode (AC-BI-11).
- **AC-BIB-8** — Clicking Copy in setup view places the exact outline text
  on the clipboard; clicking Copy in print view places the exact rendered
  ASCII tree text on the clipboard — verified by pasting each into a
  plain-text field (AC-BI-13).
- **AC-BIB-9** — A fixture big idea whose `coverage[]` touches only a
  skill-domain node shows the pencil glyph; one touching only a
  knowledge-domain node shows the notebook glyph; one touching both shows
  both. Editing `coverage[]` to drop the only knowledge-domain node removes
  the notebook glyph on next render, with nothing written to the big idea
  itself (AC-BI-10).
- **AC-BIB-10** — A fixture unit with two big ideas bound to the same topic
  and one topic with none shows the populated topic listing both and the
  empty topic showing an explicit zero-result state, not a blank.
- **AC-BIB-11** — Grepping this build for any write to `coverage[]` outside
  the shared write API named in FR-BIB-6 returns nothing — confirming
  `coverage-grid` is the only UI caller.
- **AC-BIB-12** — Grepping every other wave-2/3/4 build for a
  glyph-derivation implementation independent of FR-BIB-8's shared function
  returns nothing (proving test for AD-BI-2).
- **AC-BIB-13** — Grepping `lesson-plan-document` and `lessons-and-topics`
  for a lesson→topic resolution independent of FR-BIB-17's shared function
  returns nothing (proving test for AD-BI-5).

## 4. Prerequisites & dependencies

- **Required first:** [`document-shell`](document-shell.build.spec.md) —
  the A4 portrait print chassis the Big Idea Tree's print mode renders on;
  [`local-store`](local-store.build.spec.md) — the only persistence path;
  [`style-guide`](style-guide.build.spec.md) — CSS tokens for the outline
  editor and the connector-tree print typography. Curriculum node data
  (`code`, `domain`) must exist for FR-BIB-8's glyph derivation to have
  anything to compute from — via `curriculum-editor` or `curriculum-ingest`,
  whichever G-9 leaves standing; this build degrades gracefully (no glyphs
  shown) if neither has run yet.
- **Choose-one:** none. G-9 (build the ingest at all) is a project-level
  gate this build does not resolve or depend on — it reads whatever nodes
  already exist, the same posture `coverage-grid`'s own OQ-CG-4 takes.
- **Coordinate-with:** [`coverage-grid`](coverage-grid.build.spec.md) — the
  sole consumer of FR-BIB-6's `coverage[]` write API; the two builds must
  agree on the `{nodeId, coverage, note}` shape exactly (already aligned
  via `AD-CG-1`). `arbor-tree` — reads this build's big-idea list and
  FR-BIB-8's glyph function for its chip rendering; coordinate rather than
  interleave (`_PLAN.md`'s own note: "`coverage-grid` after `bigidea-list`
  ... it coordinates with `arbor-tree`, which renders the same links as
  printed chips — shared vocabulary, so sequence them rather than
  interleave"). `lesson-plan-document`, `unit-assessment-document`,
  `crib-sheet` — each reads this build's list for its own big-idea picker
  and glyph rendering; none writes back to a big idea's identity (AD-44's
  amendment, below). The future, currently unspecced **Lessons & Topics**
  view — required, once it is specced and built, to call this build's
  shared write API (FR-BIB-1/3) rather than reimplement add/rename/
  reorder/reparent/delete independently (AD-BI-1).

**Gate:** work may start once `document-shell`, `local-store` and
`style-guide` are each specced and their interfaces are settled. Curriculum
node population is not a hard gate — FR-BIB-8's glyph rendering simply has
nothing to show until nodes exist.

## 5. Decisions

- **AD-BI-1** — *Decision:* this build exposes **one shared write API** —
  add / rename / reorder / reparent / delete for big ideas, and the
  equivalent for topics — including FR-BI-8/FR-TOP-7's refuse-if-referenced
  checks and INV-DM-14's two-level cap. **Every** editing surface, present
  (the Big Idea Tree, FR-BIB-9) or future (the Lessons & Topics view),
  calls this API rather than validating independently. *Rationale:* this
  is the resolution the arch spec's `AD-44` amendment (2026-08-22) records
  — Luke's direct answer was that both the Big Idea Tree and the eventual
  Lessons & Topics view may write big-idea/topic identity, with no
  exclusivity between them — but two independently-coded validation paths
  is exactly the drift risk `AD-44` was originally written to prevent, so
  the two screens share one implementation instead of each reinventing
  FR-BI-8's refusal rule and INV-DM-14's cap. *Rejected:* letting the
  future Lessons & Topics build reimplement these operations locally "for
  its own view" — the same failure `AD-44` and `AD-LPB-1` both already
  name for a different pair of builds, applied here to this one.
- **AD-BI-2** — *Decision:* the domain glyph-set derivation (FR-BIB-8) is a
  single shared function, owned by this build, that every other renderer
  of a big idea's title calls. *Rationale:* mirrors `AD-CSB-5`'s identical
  decision in `crib-sheet.build.spec.md` — the union-of-domains computation
  is cross-cutting (curriculum map, arbor tree, lesson plan, crib sheet,
  eventually Lessons & Topics), and a second local copy anywhere risks
  drifting from `FR-BI-15`'s rule the next time a curriculum profile's
  domain values change (AD-49). *Rejected:* each consuming build computing
  its own glyph set from `coverage[]` directly — cheaper to write once,
  more expensive to keep five copies synchronised.
- **AD-BI-3** — *Decision:* the outline editor (FR-BIB-9) writes only
  `title`, `order`, `parentId` — never `text`, `coverage[]`, or `topicId` —
  which stay on this build's own per-item detail panel. *Rationale:*
  resolves `AD-51`'s own "assumption flagged plainly, open to correction"
  note, in the direction that note already recommended: Luke's brief
  ("arrange them") reads as structural arrangement, not full-content
  editing, and a richer per-line outline format (trailing text, inline
  coverage) would need its own parse rule this build spec does not invent
  without being asked. *Rejected:* a richer outline syntax encoding
  `text`/`coverage`/`topicId` inline — technically possible, but invents a
  parse format nobody asked for and turns a fast arranging tool into a
  slow full-editor one.
- **AD-BI-5** — *Decision:* the lesson→topic transitive resolution
  (FR-BIB-17) is owned here, alongside the glyph-set function, rather than
  by `lesson-plan-document` (the first build to actually need it,
  chronologically) or by the future `lessons-and-topics` build (its
  heaviest consumer). *Rationale:* both `BigIdea` and `Topic` are this
  build's own entities — the function is a pure read over data this build
  already owns, and centralising it here keeps `AD-35`'s "derive, don't
  duplicate" rule (INV-DM-12) enforceable by inspection rather than by
  hoping two independently-written builds happen to walk the chain
  identically. `lesson-plan-document.build.spec.md` was written before this
  build existed and could not cite it forward; this decision is the
  retroactive settlement its own FR-LPB-1 needs. *Rejected:* leaving it
  duplicated in each consumer, on the reasoning that "it's just three
  pointer hops" — the same reasoning `AD-LPB-1` already rejected for
  tier-emission logic, which is also "just" a walk over existing data right
  up until two copies quietly diverge.
- **AD-BI-4** — *Decision:* the two-level cap (INV-DM-14) is enforced
  identically whether a big idea is created via the outline (FR-BIB-10) or
  via any future non-outline entry point — one validation function, not
  one check per editing surface. *Rationale:* same shared-validation
  principle as AD-BI-1, applied specifically to the cap since it is the
  one invariant `DEPENDENTS.md` row 12 calls "the load-bearing part."
  *Rejected:* an outline-only check that a hypothetical future bulk-import
  or API-level create could bypass.
- **AD-BI-6** — *Decision:* the per-item detail panel opens **inline,
  click-to-expand, within the Big Idea Tree row** — no modal, no side
  panel — and only one row expands at a time. *Rationale:* Luke direct.
  See `FR-BIB-18`, resolves `OQ-BI-1`. *Rejected:* a modal or separate side
  panel — both would break the outline's fast-arranging feel `AD-BI-3`
  already protects, forcing a context switch away from the tree to view or
  edit one item's detail.

**Open questions**

- **OQ-BI-1** — Does the per-item detail panel (AD-BI-3's home for `text`,
  `coverage[]` display, and `topicId`) live as a click-to-expand row inside
  the Big Idea Tree screen, or as a separate modal/side panel? ✅
  **RESOLVED (2026-08-29) — Luke direct.** Inline click-to-expand in the
  row, no modal, no side panel — see `FR-BIB-18`, `AD-BI-6`.
- **OQ-BI-2** — Should reordering topics affect the *default* order big
  ideas render in the Big Idea Tree (grouped by topic) or does the
  outline stay one flat sequence regardless of topic? ✅ **RESOLVED
  (2026-08-29).** One flat sequence — topic reorder does not affect
  big-idea list order. `FR-BI-16` already describes the outline as flat,
  one line per big idea/sub-idea, with no topic grouping.
- **OQ-BI-3** — When a sub-big idea's parent is deleted (refused per
  FR-BIB-2 while lessons are bound, but what about an unbound parent with
  only sub-big ideas under it)? ✅ **RESOLVED (2026-08-29).** Deleting a
  parent with sub-ideas is refused, naming the blockers — never a
  cascading delete, matching this project's "never silently cut"
  convention (AD-17, AD-41, AD-51) applied here to structural deletion.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| The Lessons & Topics view — AD-44's originally sole editing surface for big-idea/topic identity, and the destination FR-TOP-8 onward describes — has no build spec and no row in `_Builds/_PLAN.md`'s wave table | Three wave-3/4 builds (`lesson-plan-document`'s topic display, this build's own FR-BIB-7 query surface, and the whole FR-TOP-8…14b feature) point at a screen that currently exists nowhere in the plan | Flagged explicitly here and in the arch-spec amendment to AD-44; not silently absorbed into this build's scope | Manual check: a future `_Builds/_PLAN.md` revision adds a `lessons-and-topics` subtask row before FR-TOP-8's requirements are implemented anywhere |
| A future Lessons & Topics build reimplements add/rename/reorder/reparent/delete independently instead of calling this build's shared API | Two validation paths drift — the exact failure `AD-44` was written to prevent, now reopened by Luke's "both can write" answer | AD-BI-1 states the shared-API requirement explicitly; code review of that future build checks for it | AC-BIB-11-style grep, re-run against that build once it exists |
| The outline editor's parse rule silently grows beyond `title`/`order`/`parentId` (e.g. someone adds "just a trailing note" to the line format) | Reopens AD-51's flagged assumption without a decision behind it; the outline becomes a second, undocumented write path onto fields the per-item panel already owns | AD-BI-3 states the boundary explicitly; code review checks the outline parser touches no field outside the three named | Manual check: outline parser's write set inspected against AD-BI-3's list |
| Domain-glyph logic gets a second implementation in a sibling build under time pressure | Two glyph rules drift (the same class of risk `AD-LPB-1` and `AD-CSB-5` both already name for their own pairs of builds) | AD-BI-2; this build is the one place the function is allowed to be defined | AC-BIB-12 |
| A doubly-indented outline line is silently flattened rather than refused, quietly changing a big idea's structure without the author noticing | Violates the project's standing "flag, don't silently fix" rule (AD-17, AD-41, AD-51) and could misfile a sub-big idea under the wrong parent unnoticed | FR-BIB-10 states the refusal explicitly; AD-51's own rejected-alternatives list already names this failure mode | AC-BIB-2 |
| Spec IDs or invariant names leak onto the Big Idea Tree screen (a stray "INV-DM-14" in a validation message) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above names the visible behaviour, never the spec id; code review greps rendered strings | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label or message |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`crib-sheet.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-BIB-1…12 demonstrated
- [ ] AC-BIB-2: a third indentation level is refused and flagged inline, not
      silently corrected
- [ ] AC-BIB-3/5: delete-refusal names every blocker, for both big ideas and
      topics
- [ ] AC-BIB-9: glyph rendering matches AC-BI-10's fixture exactly, computed
      by one shared function
- [ ] AC-BIB-11/12: no second `coverage[]` write path, no second glyph-
      derivation implementation, anywhere in the codebase (grep checks)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-BIB-16)
- [ ] Persists only through `local-store`; no direct filesystem access from
      the browser
- [ ] The missing Lessons & Topics subtask gap (§6) reported to Luke, not
      silently left unflagged

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
