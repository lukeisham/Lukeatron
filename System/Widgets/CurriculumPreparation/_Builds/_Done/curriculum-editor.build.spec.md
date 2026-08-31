# curriculum-editor — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 2 |
| **One-liner** | The write surface for the curriculum node tree — add, rename, re-parent, delete, and correct whatever ingest guessed, with the domain-resolution function every other build's glyph rendering depends on. |

---

## 1. Motivation

`FR-CUR-2` calls curriculum editing "a first-class workflow, not a repair
hatch — ingest is best-effort by design, so editing carries real weight."
That weight matters twice over: it is how Luke corrects an imperfect
ingest, and — per `AD-16`'s own threshold — it is **the entire product**
if `G-9` ends up dropping `curriculum-ingest` altogether ("the editor
alone is the product" below roughly 60% accuracy). This build cannot
assume ingest ran first.

It also owns a piece of shared infrastructure several already-specced
builds quietly depend on: `bigidea-list.build.spec.md`'s `FR-BIB-8` (the
domain glyph-set union) is written against "`FR-CUR-13`'s domain values"
without saying which build actually computes a node's domain by walking
its ancestry — that computation belongs here, and this spec settles it.

## 2. Scope

**In scope**
- Node CRUD over the whole tree — root, `strand`, `outcome`, and `task`
  kinds alike: add, rename, re-parent, delete (`FR-CUR-2`). This
  explicitly includes **building a tree from nothing** — every node,
  starting from an empty `nodes[]` — since `G-9` may leave no ingest
  output to edit at all (`FR-CUR-1d`'s generic-profile fallback).
- Editing a node's `code` and `text`, with the ingested `original` always
  snapshotted and never destroyed once an edit is made (`INV-DM-2`).
- Enforcing tree integrity on every mutation — exactly one root, no
  cycles, every non-root `parentId` resolves (`INV-DM-3`) — refusing any
  add/re-parent/delete that would violate it.
- Clearing a node's `confidence` flag automatically on its first edit —
  "once Luke has looked at a node, the parser's opinion of it is stale."
- Owning **node-level domain resolution** (`INV-DM-43`): `domain` is set
  only on `strand` nodes; an `outcome`/`task` node's effective domain is
  derived by walking `parentId` to its nearest ancestor strand, unset if
  none exists — exposed as one shared function.
- Editing a strand's `domain` by hand — the same `edited`/`original`
  discipline as any other ingest-guessed field, since ingest's own domain
  guess is a keyword heuristic flagged `confidence: low` like everything
  else it guesses.
- Editing `curriculum.description` — the orientation prose `FR-CUR-9`
  prints at the head of the curriculum map. This build owns the write;
  `arbor-tree` owns the read/render.
- Editing `curriculum.labels` when the unit uses the generic profile
  (`FR-CUR-1d`) — the display names for `strand`/`outcome`/`task` an
  unsupported curriculum needs, since nothing else in the plan surfaces
  this.
- Persistence of every write above through `local-store` only.

**Out of scope**
- **Ingest itself** — the Python heuristic parser that populates `nodes[]`
  from pasted plain text is `curriculum-ingest`'s job (may be dropped by
  `G-9`). This build edits whatever exists, however it got there.
- **Rendering the tree** — as an SVG horizontal family tree, A4 landscape,
  with coverage/glyph chips — is `arbor-tree`'s job, the same "edit here,
  print there" split `coverage-grid.build.spec.md` already draws for its
  own relationship (§2, "Printing... is `arbor-tree`'s business"). This
  build produces no printable page.
- **Big-idea coverage (`BigIdea.coverage[]`)** — `coverage-grid`'s job.
  This build never reads or writes a big idea.
- **The big-idea list or topics list** — `bigidea-list`'s job entirely.
- **Lesson-to-node binding (`lesson.nodeIds[]`)** — `lesson-plan-document`/
  `lesson-plan-generator`'s job. This build only guarantees a node exists
  and is resolvable for such a binding to point at.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (AD-13).

## 3. Requirements

> **Requirement family.** `FR-CUR-n` is the **PRD-level** family — the
> curriculum map's "Map" half (`FR-CUR-2`; ingest, `FR-CUR-1…1f`, and
> print/render, `FR-CUR-3…13`, belong to `curriculum-ingest` and
> `arbor-tree` respectively). `FR-CEB-n` below is the **build-level**
> family, the same PRD/build split every other build in this folder uses.

- **FR-CEB-1** — Adds, renames, re-parents and deletes any node —
  `strand`, `outcome`, or `task` — including building a complete tree from
  an empty `nodes[]` (`FR-CUR-2`, `FR-CUR-1d`).
- **FR-CEB-2** — Editing a node's `code` or `text` sets `edited: true` and
  snapshots the pre-edit values into `original`, which is never
  overwritten by a later edit or a later ingest re-run (`INV-DM-2`,
  `FR-CUR-1f`).
- **FR-CEB-3** — Refuses any add, re-parent, or delete that would break
  tree integrity — more than one root, a cycle, or a non-root node whose
  `parentId` does not resolve (`INV-DM-3`) — naming what the operation
  would have violated.
- **FR-CEB-4** — Clears a node's `confidence` flag automatically the
  moment any field on that specific node is edited — never a manual
  reset, never surviving a real edit (data model's own "cleared on first
  edit" rule).
- **FR-CEB-5** — Exposes node-level **domain resolution** as one shared
  function: reads `domain` directly off a `strand` node; for an
  `outcome`/`task` node, walks `parentId` to the nearest ancestor
  `strand` and reads its `domain`; returns unset if no ancestor strand
  has one set or none exists (`INV-DM-43`). `arbor-tree`'s glyph
  rendering and `bigidea-list`'s `FR-BIB-8` glyph-set union both call
  this function; neither reimplements the walk (AD-CEB-3).
- **FR-CEB-6** — A strand's `domain` (`skill` \| `knowledge` \| unset) is
  editable by hand, under the same `edited`/`original` snapshot rule as
  `code`/`text` (`FR-CEB-2`).
- **FR-CEB-7** — Edits `curriculum.description`, the free-text orientation
  prose rendered only at the head of the curriculum map (`FR-CUR-9`). An
  unset value is valid — the field is optional on every profile.
- **FR-CEB-8** — When the unit's `curriculum.profileId` is the generic
  profile, exposes an edit surface for `curriculum.labels` — the display
  names for `strand`/`outcome`/`task` — so the tree reads in the unit's
  own vocabulary instead of raw `kind` values (`FR-CUR-1d`, `AD-10`).
- **FR-CEB-9** — Deleting a node that any lesson (`lesson.nodeIds[]`), big
  idea (`bigIdea.coverage[]`), topic (`topic.coverage[]`), or assessment
  (`unitAssessment.coverage[]`, `miniAssessment.coverage[]`) still
  references is **refused**, naming every blocking reference — regardless
  of whether the node has descendants (`AD-CEB-2`).
- **FR-CEB-10** — Deleting an unreferenced node with **no** descendants
  removes it outright. Deleting an unreferenced node **with**
  descendants requires an explicit, distinct "delete this and everything
  under it" confirmation before removing the whole subtree (`AD-CEB-2`).
- **FR-CEB-11** — Persists every write through the `local-store` client
  only. No direct filesystem access from the browser (`AD-13`).
- **FR-CEB-12** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library (`FR-SYS-8`, `AD-13a`).
- **FR-CEB-13** — `curriculum.labels` stays editable regardless of
  `curriculum.profileId` — including under a bespoke (non-generic)
  profile that supplied its own label set — so a wrong or misspelled
  label can be corrected without exposing a second, profile-specific edit
  path (`OQ-CEB-3`).

**Acceptance criteria**

- **AC-CEB-1** — Starting from an empty `nodes[]`, adding a root, two
  strands, and three outcomes under each produces a valid tree per
  `INV-DM-3`, with no ingest step involved (`AC-CUR-1`'s editor-only
  path).
- **AC-CEB-2** — An edit to a node's `text` survives save → reopen, with
  `original` still holding the pre-edit value (`AC-CUR-4`).
- **AC-CEB-3** — Re-parenting a task from one outcome to another updates
  the tree without corrupting the unit file or breaking any other node's
  resolvability (`AC-CUR-5`).
- **AC-CEB-4** — Attempting to re-parent a strand under its own descendant
  outcome (a cycle) is refused, with the tree left unchanged.
- **AC-CEB-5** — A fixture node ingested with `confidence: low` shows that
  state visibly (`AC-CUR-3`); editing its `text` clears `confidence` on
  save, and a subsequent ingest re-run does not restore it (`FR-CUR-1f`).
- **AC-CEB-6** — A fixture strand's `domain` set to `skill` resolves
  correctly for every outcome/task beneath it via `FR-CEB-5`'s shared
  function; a fixture outcome under a strand with no `domain` set resolves
  to unset, not a guessed value.
- **AC-CEB-7** — Grepping `arbor-tree` and `bigidea-list` for a
  domain-resolution walk independent of `FR-CEB-5`'s shared function
  returns nothing (proving test for `AD-CEB-3`).
- **AC-CEB-8** — A fixture curriculum with a `description` set renders it
  editable here; clearing the field and saving leaves it unset, not an
  empty string treated as set (`AC-CUR-9`'s editing-side counterpart).
- **AC-CEB-9** — A unit on the generic profile shows an editable
  `curriculum.labels` surface; setting `strand: "Domain"` and saving
  causes every consumer reading `labels.strand` to show "Domain" on next
  render.
- **AC-CEB-10** — Deleting a node referenced by a lesson's `nodeIds[]` is
  refused, naming that lesson; deleting the same node after removing the
  reference succeeds.
- **AC-CEB-11** — Deleting a childless, unreferenced node removes it in
  one action with no confirmation step; deleting a node with two
  descendant outcomes, itself unreferenced, requires the distinct
  cascade-confirmation before removing all three.

## 4. Prerequisites & dependencies

- **Required first:** [`local-store`](local-store.build.spec.md) — this
  build's only persistence path; [`style-guide`](style-guide.build.spec.md)
  — CSS tokens for its own edit-view chrome. `curriculum-ingest`'s output
  **or** wave 1 alone if `G-9` drops it — this build does not require
  ingest to have run, only that if it did, its output is a valid,
  resolvable tree (`INV-DM-3`) to open. Unlike the document-rendering
  builds, this build produces no printable page, so it does **not**
  require `document-shell` — the same posture `coverage-grid.build.spec.md`
  already takes for its own edit-view-only screen.
- **Choose-one:** `G-9` (build the ingest at all) — this build is
  unaffected either way; it reads whatever `nodes[]` exists, empty or
  populated, the same posture `coverage-grid`'s own `OQ-CG-4` takes.
- **Coordinate-with:** [`arbor-tree`](arbor-tree.build.spec.md) — the
  sole renderer of the tree this build writes, and the sole other caller
  of `FR-CEB-5`'s domain-resolution function; sequence rather than
  interleave, the same posture `_PLAN.md` already states for
  `coverage-grid`/`arbor-tree`'s shared coverage vocabulary.
  [`bigidea-list`](bigidea-list.build.spec.md) — its own `FR-BIB-8` glyph-
  set union calls this build's `FR-CEB-5` function rather than
  reimplementing the ancestor-strand walk; `bigidea-list.build.spec.md`
  was written before this build existed and should be read as citing this
  build's `FR-CEB-5` retroactively (mirrors the same forward-citation
  pattern `AD-BI-5` already resolves for `lessons-and-topics`).
  `coverage-grid` — reads this build's node tree for its rows; writes
  nothing back to a node.

**Gate:** work may start once `local-store` and `style-guide` are each
specced and their interfaces are settled. Not gated on `curriculum-ingest`
landing first.

## 5. Decisions

- **AD-CEB-1** — *Decision:* this build supports constructing a complete
  tree from an empty `nodes[]`, not only editing an already-ingested one.
  *Rationale:* `G-9` may drop `curriculum-ingest` entirely if `Q-1`'s
  accuracy comes in low, in which case `AD-16`'s own words apply — "the
  editor alone is the product." A build that assumed ingest always ran
  first would leave that branch of the project with no way to enter a
  curriculum at all. *Rejected:* scoping this build to edit-only and
  treating from-scratch tree construction as a hypothetical future
  extension — the wave table's own prerequisite note ("`curriculum-ingest`
  *or wave 1 if G-9 drops it*") already assumes this capability exists
  now, not later.
- **AD-CEB-2** — *Decision:* node deletion has two independent gates.
  First, **reference**: a node any lesson, big idea, topic, or assessment
  still points at is refused outright, naming every blocker — regardless
  of whether it has descendants. Second, **structure**: an unreferenced
  node with descendants requires one explicit cascade-confirmation
  distinct from a plain delete; an unreferenced, childless node deletes
  immediately. *Rationale:* the reference gate mirrors `FR-BI-8`'s and
  `FR-TOP-7`'s existing refuse-if-referenced precedent, applied to nodes.
  The structure gate is different from either of those, because a
  **tree** — unlike the big-idea or topics list — legitimately needs
  cascade deletion sometimes (removing an over-detailed strand Luke
  ingested by mistake); refusing any node with children outright would
  make correcting an ingest's over-eager structure agonizing, one leaf at
  a time. *Rejected:* silent cascade delete on every node regardless of
  descendants (violates this project's "never silently cut" convention,
  `AD-15`/`AD-17`/`AD-51`); refusing deletion of any node with
  descendants, full stop (technically safest, but makes legitimate
  restructuring after a messy ingest needlessly slow).
- **AD-CEB-3** — *Decision:* node-level domain resolution (`FR-CEB-5`) is
  a single shared function, owned here, that `arbor-tree` and
  `bigidea-list` both call. *Rationale:* mirrors `AD-BI-2`'s and
  `AD-BI-5`'s identical reasoning for the glyph-set union and the
  topic-resolution chain — "just a `parentId` walk" is exactly the kind
  of computation two independently-written call sites quietly diverge on.
  This build owns `Node`, so it is the natural, and now the only, place
  the walk is implemented. *Rejected:* letting `arbor-tree` implement it
  first (it renders glyphs first, chronologically) and having
  `bigidea-list` call into `arbor-tree` for a data-layer computation — an
  inversion that would make a rendering build a dependency of a data
  build, backwards from every other dependency edge in this project.
- **AD-CEB-4** — *Decision:* clearing `confidence` (`FR-CEB-4`) is silent
  and automatic on edit — no confirmation dialog, unlike node deletion.
  *Rationale:* the data model's own text already states the rule ("cleared
  on first edit... the parser's opinion of it is stale") as an inherent
  consequence of editing, not a destructive action in its own right —
  confirming it would treat routine correction (this build's entire
  purpose) as if it were as risky as a cascade delete. *Rejected:* a
  confirmation step on first edit of a low-confidence node — adds friction
  to the build's single most common interaction for no safety benefit,
  since nothing is destroyed (`original` is still snapshotted, `FR-CEB-2`).

**Open questions**

- **OQ-CEB-1** — ✅ **RESOLVED (2026-08-29).** Once `confidence` is cleared
  by an edit, can a later ingest re-run ever re-guess that node's domain or
  structure? *Resolved:* **no** — `FR-CUR-1f`'s "ingest never destroys
  existing work" already forecloses this for every other edited field;
  domain and structure get no exception. This mirrors
  `curriculum-ingest.build.spec.md`'s `OQ-CIB-1`, which asks the same
  question from the ingest side and defaults to the same answer — both
  specs must change together if this is ever revisited.
- **OQ-CEB-2** — ✅ **RESOLVED (2026-08-29).** Does re-parenting a strand
  (moving a large subtree) need a different confirmation than re-parenting
  a single leaf task, given the larger blast radius? *Resolved:* no — the
  same interaction for both; `INV-DM-3`'s cycle check already catches the
  one genuinely dangerous case (a cycle), and a legitimate large re-parent
  is just a bigger version of a small one, not a different kind of risk.
- **OQ-CEB-3** — ✅ **RESOLVED (2026-08-29).** Can `curriculum.labels` be
  edited even when a bespoke (non-generic) profile supplied them, e.g. to
  fix a typo? *Resolved:* yes, regardless of profile — `labels` lives on
  the unit's own `curriculum` object once ingested, and this project's
  bias throughout favours letting Luke correct a wrong value over locking
  a field because a profile "should" already be right. See FR-CEB-13.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Domain resolution gets reimplemented independently in `arbor-tree` or `bigidea-list` | Two ancestor-strand walks drift — the same class of risk `AD-BI-2`/`AD-BI-5` already name for the glyph-set union and topic resolution | AD-CEB-3; this build is the one place the walk is allowed to be defined | AC-CEB-7 |
| A re-parent silently creates a cycle | `INV-DM-3` breaks; `arbor-tree`'s layout algorithm has no defined behaviour on a cyclic graph and may loop or crash | FR-CEB-3 states the refusal explicitly | AC-CEB-4 |
| Node deletion silently cascades, destroying descendants or breaking a lesson/big-idea/assessment reference | Data loss with no warning — the single worst failure mode a curriculum-tree editor can have | AD-CEB-2's two-gate rule; FR-CEB-9/10 state both gates explicitly | AC-CEB-10, AC-CEB-11 |
| `original` gets overwritten by a second edit or a later ingest re-run | `INV-DM-2`'s "never destroyed" guarantee breaks; `FR-CUR-1f`'s re-run safety is compromised | FR-CEB-2 states `original` is snapshotted once and never overwritten | AC-CEB-2, AC-CEB-5 |
| `curriculum.labels` stays write-only-by-ingest, so a generic-profile unit never gets readable vocabulary | Every screen for that unit shows raw `kind` values (`strand`/`outcome`/`task`) instead of the teacher's own terms, defeating `FR-CUR-1d`'s whole point | FR-CEB-8 | AC-CEB-9 |
| Spec IDs or invariant names leak onto the editor screen (a stray "INV-DM-3" in a refusal message) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above names the visible behaviour, never the spec id; code review greps rendered strings | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label or message |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`bigidea-list.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-CEB-1…11 demonstrated
- [ ] AC-CEB-1: a complete tree can be built from nothing, with no ingest
      step involved
- [ ] AC-CEB-4/10/11: cycle refusal and both deletion gates demonstrated
      with fixtures
- [ ] AC-CEB-7: no independent domain-resolution walk anywhere outside
      this build (grep check)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-CEB-12)
- [ ] Persists only through `local-store`; no direct filesystem access
      from the browser

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
