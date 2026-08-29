# lesson-plan-generator — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 3 |
| **One-liner** | Pick a curriculum node (or several) and a big idea, generate a draft `Lesson` record from templates — never a model call — then hand it to `lesson-plan-document` to render and modify. |

---

## 1. Motivation

`FR-LP-9`/`FR-LP-10` is the one piece of the lesson plan
`lesson-plan-document.build.spec.md` explicitly carved out for its own
build: "a separate, already-named, not-yet-specced build,
`lesson-plan-generator`... gated on `G-5`." `G-5` itself is already
resolved at the decision-gate level — `_Builds/_PLAN.md`'s own gate table
reads "build them" — so this is not a build waiting on a yes/no from Luke;
it is waiting on a spec. `Q-5` (does generating actually beat drafting
from a blank template?) is the still-open **measurement**, and per
`_Builds/_PLAN.md`'s own note it "runs against a synthetic fixture unit
and [is] agent-runnable now" — this build's own acceptance criteria are
half of how `Q-5` gets answered (the crib sheet's own generation,
`FR-CS-3`/`FR-CSB-2`, is the other half, already covered in
`crib-sheet.build.spec.md`).

**Why this is a separate build when the crib sheet's generation is not.**
`crib-sheet.build.spec.md`'s own `AD-CSB-1` chose to fold crib-sheet
generation into that build rather than split out a
`crib-sheet-generator`, because seeding one section per big idea is a
simple 1:1 copy with no picker, no template composition, and no separate
row in `_PLAN.md`'s dependency graph. Lesson generation is different in
kind: it needs a **picker** (which node(s), which big idea), a
**template-composed draft** (`AD-9`), and — because `_PLAN.md`'s own wave
table already names `lesson-plan-generator` as its own row, sequenced
after `lesson-plan-document` — the split was decided before this spec was
written, not invented by it.

## 2. Scope

**In scope**
- A **picker**: select one or more curriculum nodes (`kind: outcome` or
  `task`) and exactly one big idea or sub-big idea, then generate a draft
  `Lesson` record on confirm (`FR-LP-9`, `FR-LP-10`).
- **Template-driven** composition of `keyExample` and `practiceQuestion` —
  editable starting text drawn from the selected node(s)' own `text` —
  never a model call of any kind (`AD-9`, `FR-SYS-1`).
- Assigning the new lesson the **next contiguous number** — this build
  only ever **appends**; it never reorders an existing lesson's `number`
  (`INV-DM-32`; reordering is `lessons-and-topics`' `FR-LTB-5`).
- Setting `provenance: "generated"` on create.
- A **regenerate** action, available only while a lesson's `provenance` is
  still exactly `"generated"` — re-running the picker against that same
  lesson, replacing `nodeIds[]`, `bigIdeaId`, `keyExample`, and
  `practiceQuestion` wholesale. Unavailable the moment the lesson has been
  manually touched (`FR-LP-9`'s no-clobber rule).
- Persistence of the created/regenerated `Lesson` through `local-store`
  only.

**Out of scope**
- **Rendering** the generated lesson — front page, tier pages, print
  output, every field's edit-view control. Entirely
  `lesson-plan-document`'s job; this build produces a valid `Lesson`
  record and hands off.
- **Editing** an existing lesson's `tiers`, `sidebar`, `assessmentLink`,
  or `imageRefs[]` — `lesson-plan-document`'s job. This build never sets
  any of these beyond leaving them empty on create (`FR-LPG-6`).
- **Flipping `provenance` to `"edited"`** — `lesson-plan-document`'s own
  `FR-LPB-13` owns that write, the moment a teacher manually changes
  anything on the lesson. This build only ever reads `provenance` to
  decide whether regeneration is available.
- **Reordering an existing lesson's `number`** — `lessons-and-topics`'
  `FR-LTB-5`. This build only assigns the initial number on create.
- **Creating curriculum nodes or big ideas** — `curriculum-editor` and
  `bigidea-list`'s jobs respectively. This build only reads what already
  exists to populate its picker.
- **A model call of any kind, online or local** — explicitly forbidden by
  `AD-9` and `FR-SYS-1`. Nothing in this build makes a network request
  beyond its own `local-store` save.
- **A reusable-fragment or snippet library.** `AD-9`'s text mentions
  "Luke's own reusable fragments" alongside templates, but no schema field
  or storage location for such a library exists anywhere in the data
  model or PRD. Building one now would be inventing a feature ahead of a
  concrete request — see `OQ-LPG-2`.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (`AD-13`).

## 3. Requirements

> **Requirement family.** `FR-LP-n` is the **PRD-level** family — `FR-LP-9`
> and `FR-LP-10` specifically belong to this build; every other `FR-LP-n`
> belongs to `lesson-plan-document`. `FR-LPG-n` below is the **build-level**
> family, the same PRD/build split every other build in this folder uses.

- **FR-LPG-1** — Presents a picker over the unit's curriculum tree
  (`curriculum-editor`'s data) and big-idea list (`bigidea-list`'s data):
  one or more nodes, exactly one big idea or sub-big idea, both mandatory
  before generation can proceed (`FR-LP-9`, `FR-LP-10`, mirrors
  `INV-DM-15`'s required-binding standard).
- **FR-LPG-2** — On confirm, creates a new `Lesson` record appended with
  the **next contiguous number** in the unit — this build never writes to
  an existing lesson's `number` (`INV-DM-32`, `FR-LP-15`).
- **FR-LPG-3** — Sets `nodeIds[]` from the selected node(s) and
  `bigIdeaId` from the selected big idea on the new record.
- **FR-LPG-4** — Sets `provenance: "generated"` on create; never sets
  `"edited"` or `"manual"` — those transitions belong to
  `lesson-plan-document` (`FR-LPB-13`) and to a teacher-authored lesson
  created outside this build's picker, respectively.
- **FR-LPG-5** — Composes `keyExample` and `practiceQuestion` as
  **editable starting text**, quoted or lightly adapted from the selected
  node(s)' own `text` — never a model-generated composition, never left
  blank with no indication of what the field is for (`AD-9`, `FR-SYS-1`).
- **FR-LPG-6** — Leaves `tiers`, `sidebar`, `assessmentLink`, and
  `imageRefs[]` **empty** on generation — no template guess for content
  this specific to actual teaching (mirrors `OQ-12`'s "no big-idea tier
  hints feeding generation in v1" default).
- **FR-LPG-7** — Offers a **regenerate** action only on a lesson whose
  `provenance` is still exactly `"generated"` — re-running `FR-LPG-1`'s
  picker against that lesson and replacing `nodeIds[]`, `bigIdeaId`,
  `keyExample`, and `practiceQuestion` wholesale. The action is
  **unavailable**, not merely a confirm-guarded overwrite, on any lesson
  whose `provenance` is `"edited"` or `"manual"` (`FR-LP-9`'s no-clobber
  rule, enforced at the coarse, whole-lesson `provenance` granularity the
  schema actually provides — `AD-LPG-1`).
- **FR-LPG-8** — Makes **no network call and no model call** of any kind —
  a pure, offline, template composition (`AD-9`, `FR-SYS-1`).
- **FR-LPG-9** — Persists every created or regenerated lesson through the
  `local-store` client only. No direct filesystem access from the browser
  (`AD-13`).
- **FR-LPG-10** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library (`FR-SYS-8`, `AD-13a`).
- **FR-LPG-11** — When generation is triggered from **multiple** selected
  nodes, composes `keyExample` and `practiceQuestion` by **concatenating**
  each selected node's own text, each portion clearly separated by that
  node's code — never composing from only the first-selected node
  (resolves `OQ-LPG-3`).

**Acceptance criteria**

- **AC-LPG-1** — Generating from one fixture node and one fixture big idea
  produces a valid `Lesson` with `nodeIds[]`, `bigIdeaId`, a non-blank
  `keyExample`, a non-blank `practiceQuestion`, `provenance: "generated"`,
  empty `tiers`/`sidebar`/`assessmentLink`/`imageRefs[]`, and the next
  contiguous `number` after the unit's existing lessons.
- **AC-LPG-2** — Generating a second lesson from a different node/big-idea
  pair appends `number` contiguously after the first — never reusing or
  skipping a number.
- **AC-LPG-3** — Attempting to generate with no node selected, or no big
  idea selected, is refused — the action is unavailable, not merely
  producing an incomplete record.
- **AC-LPG-4** — Regenerating a fixture lesson still at `provenance:
  "generated"` replaces `nodeIds[]`, `bigIdeaId`, `keyExample`, and
  `practiceQuestion` per the new picker selection; `number` is unchanged.
- **AC-LPG-5** — A fixture lesson manually edited (any single field
  change, `provenance` now `"edited"`) shows no regenerate control at all
  — grepping the rendered UI for a regenerate affordance on that fixture
  returns nothing.
- **AC-LPG-6** — A fixture lesson generated from a node containing
  distinctive fixture text shows that text (verbatim or lightly adapted,
  never paraphrased beyond recognition) inside `keyExample` or
  `practiceQuestion` — confirming composition is template-driven, not
  invented from nothing.
- **AC-LPG-7** (gate test) — With the network disabled and every request
  logged, generating and regenerating a lesson produces **zero outbound
  requests** beyond the same-origin `local-store` save call.
- **AC-LPG-8** — Grepping this build for any API call, prompt string, or
  model-client import returns nothing (`AD-9`'s no-AI rule, proving test).

## 4. Prerequisites & dependencies

- **Required first:** [`lesson-plan-document`](lesson-plan-document.build.spec.md)
  — the renderer this build's output feeds, and the owner of the
  `provenance: "edited"` transition this build reads (`FR-LPB-13`);
  [`bigidea-list`](bigidea-list.build.spec.md) — the big-idea picker data
  and, per `AD-LPB-2`'s existing commitment, the **same shared big-idea
  picker component** `lesson-plan-document` and `unit-assessment-document`
  already use — this build is a third caller of it, not a fourth
  implementation; [`curriculum-editor`](curriculum-editor.build.spec.md)
  — the node-picker data; [`local-store`](local-store.build.spec.md) — the
  only persistence path.
- **Choose-one:** `G-5` — **already resolved** ("build them," per
  `_Builds/_PLAN.md`'s gate table). `Q-5` (the ergonomics measurement) is
  not a blocking gate — per `_Builds/_PLAN.md`'s own note it is
  agent-runnable now, and this build's acceptance criteria are how it gets
  answered for the lesson plan.
- **Coordinate-with:** `lesson-plan-document` — sequenced **after** it in
  the same wave, per that build's own §4 ("`lesson-plan-generator`... the
  sibling build that produces the `Lesson` records this build renders;
  sequenced after this build in the same wave"). This build renders
  nothing itself and depends on `lesson-plan-document`'s field shapes
  being settled first.

**Gate:** work may start once `lesson-plan-document`, `bigidea-list`,
`curriculum-editor` and `local-store` are each specced and their
interfaces — critically, the shared big-idea picker component (`AD-LPB-2`)
and the `provenance` field's transition ownership (`FR-LPB-13`) — are
settled.

## 5. Decisions

- **AD-LPG-1** — *Decision:* regeneration (`FR-LPG-7`) is gated on the
  lesson's single, whole-record `provenance` field being exactly
  `"generated"` — never a per-field edited-tracking scheme. *Rationale:*
  `Lesson.provenance` is one coarse enum (`generated` \| `edited` \|
  `manual`), unlike the crib sheet's per-section tracking (`FR-CSB-2`
  checks each section's own edited state independently) — the schema this
  build actually has only supports an all-or-nothing answer to "has this
  been touched," so regeneration must be all-or-nothing too: available
  while untouched, unavailable the instant anything changes. *Rejected:*
  adding per-field edited flags to `Lesson` to support partial
  regeneration (e.g. "regenerate just the practice question") — a schema
  change this spec has no request to make, and one that would duplicate
  the crib sheet's already-established per-section pattern for a document
  whose data model was deliberately built coarser.
- **AD-LPG-2** — *Decision:* this build has **no path** that overwrites a
  `"edited"` or `"manual"` lesson's fields — not a confirm dialog, not a
  "force regenerate" override. *Rationale:* `FR-LP-9`'s no-clobber rule is
  satisfied more reliably by removing the dangerous action entirely than
  by gating it behind a warning a teacher might click through without
  reading — the same "never silently cut" instinct this project applies
  elsewhere (`AD-15`, `AD-17`, `AD-51`) extended here to "never offer the
  cut at all" once the safety condition (`provenance: "generated"`) no
  longer holds. *Rejected:* a "regenerate anyway" override behind a
  confirmation — technically satisfies "not silent," but keeps a loaded
  action on screen for exactly the state where using it is always wrong.
- **AD-LPG-3** — *Decision:* `keyExample`/`practiceQuestion` composition
  (`FR-LPG-5`) quotes or lightly adapts the selected node's own `text` —
  it does not attempt paraphrase, summarisation, or question-generation
  beyond simple templating (e.g. wrapping the node's `text` in a fixed
  sentence frame). *Rationale:* `AD-9` forbids any model call, and
  anything beyond simple templating without one would mean hand-written
  natural-language-generation logic — a maintenance burden with no
  offline shortcut, for a field the teacher is expected to rewrite anyway
  (`FR-LP-9`: "a draft to modify"). A close quote of real curriculum text
  is a more honest "starting point" than an invented-sounding
  template sentence pretending to be pedagogical content. *Rejected:* a
  richer template library with multiple sentence frames per node `kind` —
  more polished, but scope beyond what `Q-5`'s ergonomics question
  actually needs answered first; revisit only if the simple version
  measures as not saving real time.

**Open questions**

- **OQ-LPG-1** — ✅ **RESOLVED (2026-08-29).** Can a lesson be generated
  from **zero** node selections, bound only to a big idea (for a lesson
  that doesn't map cleanly onto one curriculum node)? *Resolved:* no —
  `FR-LP-10`'s text names "its curriculum node(s)" as part of what every
  lesson plan carries, and `nodeIds[]` participates in `FR-TR-1`'s
  traceability; a lesson with no node citation would be a real gap in the
  link graph. If Luke wants a node-free lesson, `lesson-plan-document`'s
  own edit view can clear `nodeIds[]` after generation — this build's
  picker keeps the field mandatory at creation time. Already covered by
  FR-LP-10/FR-TR-1; no new requirement needed.
- **OQ-LPG-2** — ✅ **RESOLVED (2026-08-29).** Does `AD-9`'s "reusable
  fragments" ever get built as a real feature — a library of Luke's own
  boilerplate text he can insert into `keyExample`/`practiceQuestion`?
  *Resolved:* not in this build — no schema field or storage location for
  a fragment library exists anywhere in the current data model, and
  inventing one here would be scope this spec has no concrete request to
  fill. If Luke wants this, it is a follow-on change request against this
  build (`_Changes/`), not something to guess the shape of now. No new
  requirement needed — there is nothing to spec until a concrete request
  exists.
- **OQ-LPG-3** — ✅ **RESOLVED (2026-08-29).** Does generating a lesson
  from **multiple** selected nodes compose `keyExample`/`practiceQuestion`
  from all of them (e.g. concatenated), or only the first? *Resolved:*
  concatenated, each node's text clearly separated (e.g. by node code) —
  a teacher who deliberately selected several nodes for one lesson has
  already decided they belong together; silently using only the first
  would discard a signal the picker itself invited. FR-LPG-5 did not
  state this for the multi-node case; see new **FR-LPG-11**.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Regeneration creeps into overwriting an `"edited"` lesson under implementation pressure ("just add a warning dialog") | Violates `FR-LP-9`'s no-clobber rule — a teacher's real edits silently vanish behind a confirm they may not read | AD-LPG-1/AD-LPG-2 state the action is unavailable, not confirm-guarded | AC-LPG-5 |
| A generated lesson's `number` collides with or skips an existing one | `INV-DM-32`'s contiguous-from-1 rule breaks, the same invariant `lessons-and-topics`' own reorder logic depends on | FR-LPG-2 states append-only, next-contiguous assignment | AC-LPG-1, AC-LPG-2 |
| A model call or external API creeps in "just to make the draft better" | Violates `AD-9` and `FR-SYS-1`'s offline guarantee — the one rule this build exists specifically to hold | FR-LPG-8, AD-LPG-3; network-disabled gate test | AC-LPG-7, AC-LPG-8 |
| The big-idea picker gets reimplemented a third time instead of reusing `AD-LPB-2`'s shared component | Three subtly different pickers across `lesson-plan-document`, `unit-assessment-document`, and this build | Required-first note cites `AD-LPB-2` explicitly | Manual check: one shared picker component, three callers |
| `provenance: "edited"` gets written from this build "just to mark that regeneration happened" | Blurs the line `FR-LPB-13` draws — two builds now write the same transition, risking disagreement about what counts as "edited" | FR-LPG-4 states this build never writes `"edited"` | Manual check: grep this build for any write of `provenance` other than `"generated"` |
| Spec IDs or invariant names leak onto the picker UI (a stray "INV-DM-32" in a tooltip) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above names the visible behaviour, never the spec id; code review greps rendered strings | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label or message |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`lesson-plan-document.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-LPG-1…8 demonstrated
- [ ] AC-LPG-4/5: regenerate demonstrated available on an untouched
      fixture and absent on an edited one — both states shown, not just
      the happy path
- [ ] AC-LPG-7 (gate test): zero outbound requests beyond `local-store`'s
      own save call, network disabled
- [ ] AC-LPG-8: no model-client import, API call, or prompt string
      anywhere in this build (grep check)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-LPG-10)
- [ ] Persists only through `local-store`; no direct filesystem access
      from the browser

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
