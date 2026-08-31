# lessons-and-topics — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 3 |
| **One-liner** | The whole unit laid out sequentially, topic by topic — every lesson and assessment listed beneath its topic, coloured by completion, optionally grouped by date — the one place a teacher sees the unit at a glance and marks it taught. |

---

## 1. Motivation

This build closes a gap surfaced while specccing `bigidea-list`: `AD-44`
names the combined Lessons & Topics view as the sole editing surface for
big-idea/topic name and hierarchy; `FR-TOP-8` through `FR-TOP-14b` describe
a substantial, Luke-requested feature — the whole unit readable top to
bottom, per-item completion, optional scheduling, a grouping toggle, and
its own print output — and `FR-LP-14`'s retirement explicitly folds the old
Lessons tab into this same view. Despite all of that, **no subtask row for
it existed anywhere in `_Builds/_PLAN.md`**. Three already-specced or
already-referenced builds assume it exists: `lesson-plan-document`'s
`AD-LPB-4` locates the lesson reorder/renumber control here rather than on
its own screen; `bigidea-list`'s `AD-BI-1` requires it to call that build's
shared write API once built; `AD-42`'s and `AD-50`'s entire rationale is
written **about** this view. This spec gives all of those forward
references a home.

Luke's own framing, quoted across the arch spec's `AD-38`, `AD-42` and
`AD-50`, is the throughline for this build: *"a combined sequential 'Lessons
and Topics' page that displays topics with lessons ... as a subset, and
assessments as a subset ... at a glance you can see the whole unit laid out
... with the ability for some sort of colour change when completed."*
Everything in scope below serves that one sentence.

## 2. Scope

**In scope**
- The combined view itself: every topic as a heading, in unit order, with
  its lessons and its assessments listed beneath it as one continuous
  outline (FR-TOP-8) — **Topic** grouping mode, the default.
- Placing a lesson via `lesson.bigIdeaId` → big idea [→ parent, if a
  sub-big idea] → topic, and an assessment via its **own** `bigIdeaId`
  (`AD-37`'s independent binding) — each resolved through `bigidea-list`'s
  shared transitive-resolution function (`FR-BIB-17`), never a local walk.
- Print output: A4 portrait, flowing to as many pages as the unit needs, no
  page cap, a page break only between topic sections — never inside a
  lesson or assessment row (FR-TOP-8a).
- The **lesson reorder** interaction — drag or an equivalent keyboard-
  operable control — writing `Lesson.number` for every affected lesson so
  numbers stay unique and contiguous from 1 (INV-DM-32). This is the
  interaction `lesson-plan-document.build.spec.md`'s `AD-LPB-4` explicitly
  locates here.
- The **manual completion flag** — `Lesson.completed`,
  `MiniAssessment.completed`, `UnitAssessment.finalAssessmentCompleted` —
  set directly by the teacher on this view, coloured distinctly from an
  incomplete row (FR-TOP-10).
- The **derived topic status** — not started / in progress / complete,
  computed from what is under each topic, never stored (FR-TOP-11).
- **Optional scheduling**: an independent `date` (ISO) and `lessonPeriod`
  (freeform) on a lesson, a mini assessment, and the final assessment —
  either, both, or neither, never one derived from the other (FR-TOP-12/13,
  INV-DM-44) — and their print rendering (FR-TOP-13a).
- The **grouping toggle** — Topic (default) or Date — in both edit and
  print view, including Date mode's sort-by-date, per-item topic label, and
  trailing "Unscheduled" heading for undated items (FR-TOP-14/14a).
- Rendering the domain glyph(s) `bigidea-list`'s shared function computes
  next to a lesson's big-idea reference — no local glyph logic (mirrors
  `AD-BI-2`).
- Any add/rename/reorder/reparent/delete action this view offers on a big
  idea or topic — calling `bigidea-list`'s shared write API, never a local
  reimplementation (fulfilling `bigidea-list`'s own `AD-BI-1`).

**Out of scope**
- **Creating, renaming, or deleting** a lesson or an assessment outright —
  `lesson-plan-generator` and `unit-assessment-document` own creation; this
  view lists, reorders (lessons only, FR-LP-15), completes, and schedules
  what already exists.
- **Any lesson or assessment content** — tiers, key example, practice
  question, scores, coverage links. This view reads `number`, the topic/
  big-idea chain, `completed`, `date`, `lessonPeriod`, and a display name
  only; it writes only the last three of those.
- **Big idea / topic identity editing beyond what `AD-BI-1` already
  commits both screens to** — the actual add/rename/reorder/reparent/
  delete logic lives in `bigidea-list`; this build is a second **caller**
  of that API, not a second implementation (see §5).
- **Curriculum-node coverage** on a big idea, a topic, or an assessment —
  `coverage-grid`'s job. This view never reads or writes `coverage[]`
  directly; the derived topic status (FR-TOP-11) is computed from
  completion flags only, never from coverage.
- **The Big Idea Tree screen** — `bigidea-list`'s own markdown-outline
  arranging surface (`FR-BI-16…20`). This build offers reorder/reparent as
  a second caller of the same shared API, not a second outline editor.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (AD-13).
- Being counted as the widget's seventh part — explicitly ruled out by
  `AD-42`/`FR-TOP-8b`: no schema-backed singular object of its own, no
  `AC-SYS-6`-style cardinality test. `FR-SYS-2`'s "six parts" is unaffected
  by this build.

## 3. Requirements

> **Requirement family.** `FR-TOP-n` is the **PRD-level** family
> ([PRD](../_Spikes/CurriculumPreparation/CurriculumPreparation-prd.spec.md),
> FR-TOP-8…14b — `FR-TOP-1…7`, the basic topics list, belongs to
> `bigidea-list`, not this build). `FR-LTB-n` below is the **build-level**
> family, the same PRD/build split every other build in this folder uses.

- **FR-LTB-1** — Renders every topic as a heading, in unit order, with its
  lessons and assessments listed beneath it as one continuous outline —
  Topic grouping mode, the default (FR-TOP-8).
- **FR-LTB-2** — Places a lesson via the shared transitive resolution
  (`FR-BIB-17`) and an assessment via its own `bigIdeaId` (`AD-37`) —
  independently; no assessment collapses onto one topic just because it
  once shared a document-level binding (FR-TOP-8).
- **FR-LTB-3** — Prints A4 portrait, flowing to as many pages as the unit
  needs, with no page cap — a page break falls between topic sections where
  one is needed, never inside a lesson or assessment row (FR-TOP-8a).
- **FR-LTB-4** — Is **not** counted among the widget's six parts — no
  cardinality invariant, no `AC-SYS-6`-style duplicate-object test (FR-TOP-8b,
  AD-42).
- **FR-LTB-5** — Owns the **lesson reorder** interaction **in Topic
  grouping mode**: dragging a lesson (or its keyboard-operable equivalent)
  to a new position renumbers every affected lesson so `number`s stay
  unique and contiguous from 1 (FR-LP-15, INV-DM-32). This is the one and
  only place a lesson's `number` is written from an interactive reorder —
  `lesson-plan-document` displays the number, it never writes it
  (AD-LPB-4). Date grouping mode's own drag interaction is a separate,
  `date`-writing behaviour — see FR-LTB-18…21.
- **FR-LTB-6** — A lesson, a mini assessment, and the final assessment each
  carry a manual, boolean **completion flag**, set directly here — never
  derived from `number`, a date, or tier content. Touches nothing else: no
  tier, score, or citation reads it (FR-TOP-10).
- **FR-LTB-7** — A completed row renders with a colour distinct from an
  incomplete one — the same visual treatment (a filled/hollow status dot
  plus a tinted row background) applied identically to a lesson row and an
  assessment row (FR-TOP-10, AD-LTB-2).
- **FR-LTB-8** — Computes a topic's own status — **not started**, **in
  progress**, or **complete** — from whether every lesson and assessment
  under it (FR-LTB-1's placement) is individually complete, derived fresh
  on every render, never stored (FR-TOP-11).
- **FR-LTB-9** — A lesson, a mini assessment, and the final assessment each
  carry an optional ISO `date` and an independent optional freeform
  `lessonPeriod`, entered here — either, both, or neither; neither is ever
  derived from the other (FR-TOP-12, FR-TOP-13, INV-DM-44).
- **FR-LTB-10** — Both fields print, when set, beside the item they belong
  to, exactly as edit view shows; an unset field renders **nothing** — no
  empty field, no placeholder — the same convention `FR-LP-19` already
  gives the lesson-plan sidebar (FR-TOP-13a).
- **FR-LTB-11** — A **grouping toggle** — Topic (default) or Date — is
  available in both edit view and print view (FR-TOP-14).
- **FR-LTB-12** — Grouped by **Date**, every lesson and assessment sorts
  into date order under a heading for its `date`; items sharing no date
  collect under one trailing **"Unscheduled"** heading, in unit order; each
  item carries its own topic as an in-row label rather than a section
  heading (FR-TOP-14a).
- **FR-LTB-13** — Switching grouping mode changes **only** layout — heading
  and order. Completion colouring (FR-LTB-7), derived topic status
  (FR-LTB-8, shown only in Topic mode), tiers, scores, and citations are
  identical in both modes for the same fixture (FR-TOP-14b).
- **FR-LTB-14** — Renders the domain glyph(s) `bigidea-list`'s shared
  function (`FR-BIB-8`) computes, next to each lesson's big-idea reference.
  This build computes no glyph logic of its own (mirrors `AD-BI-2`).
- **FR-LTB-15** — Any add/rename/reorder/reparent/delete action this view
  offers on a big idea or topic calls `bigidea-list`'s shared write API
  (`FR-BIB-1`, `FR-BIB-3`) — this build implements no independent
  validation path, fulfilling `bigidea-list`'s own `AD-BI-1` from this
  build's side (AD-LTB-1).
- **FR-LTB-16** — Persists every write through `local-store` only. No
  direct filesystem access from the browser (AD-13).
- **FR-LTB-17** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library (FR-SYS-8, AD-13a).
- **FR-LTB-18** — Owns a second **lesson reorder** interaction **in Date
  grouping mode**, available alongside Topic mode's own (FR-LTB-5), and
  driven by a different write path: dragging a lesson (or its
  keyboard-operable equivalent) to a new position writes a new `date` onto
  **only the dragged lesson** — never its `number`, and never any other
  lesson's `date`. Dropping the lesson under an existing date heading sets
  its `date` to that heading's date, joining that day's group (resolves
  `OQ-LTB-1`; see AD-LTB-5).
- **FR-LTB-19** — The lessons and assessments already sitting under the
  date heading the drag lands on are **not displaced** — none of their
  `date` fields change, and none are renumbered. Their relative order
  within the shared date is unaffected by the drag; FR-LTB-12's existing
  in-group tie-break (unit order) continues to apply, now including the
  newly-joined item.
- **FR-LTB-20** — Dropping a lesson **before the first dated heading**
  sets its `date` to that first heading's date (joining the earliest
  existing date-group, never inventing an earlier date); dropping it
  **after the last dated heading and before "Unscheduled"** sets its
  `date` to the last heading's date, joining the latest existing
  date-group. Dropping a lesson **into the trailing "Unscheduled"
  heading** clears its `date` to unset.
- **FR-LTB-21** — An **undated** lesson may be dragged into a dated
  position exactly as a dated one can: it adopts the target date-group's
  date under FR-LTB-18's rule, becoming a dated lesson. Date mode's drag
  interaction never refuses a source item for lacking a `date`.

**Acceptance criteria**

- **AC-LTB-1** — A fixture unit with three topics, eight lessons, and three
  assessments lists every topic in unit order, each heading its own lessons
  and assessments sorted by lesson number within the topic (AC-TOP-6).
- **AC-LTB-2** — Two mini assessments bound to big ideas under different
  topics appear under their own, different topics — not both collapsed onto
  one (AC-TOP-9).
- **AC-LTB-3** — Marking a lesson complete changes only that row's colour
  and `Lesson.completed`; every other field on the lesson is untouched
  (AC-TOP-7).
- **AC-LTB-4** — A topic with every lesson and assessment under it marked
  complete shows as complete; one with none shows as not started; one with
  a mix shows as in progress — all three visibly distinct (AC-TOP-8).
- **AC-LTB-5** — A fixture unit large enough to exceed one A4 page prints as
  multiple pages, with no page inside a topic's content silently dropped
  and no page break falling inside a lesson or assessment row (AC-TOP-10).
- **AC-LTB-6** — A fixture with one complete lesson, one incomplete lesson,
  and one mixed topic prints identical completion colouring and derived
  topic status to what edit view shows (AC-TOP-11).
- **AC-LTB-7** — A lesson with a date set, one with a period set, one with
  both, and one with neither all save and reopen with those exact fields
  intact; the two fields never overwrite or derive one another (AC-TOP-12).
- **AC-LTB-8** — Grouped by Topic, a lesson's date and period (when set)
  print beside it; a lesson with neither shows no date/period text at all
  (AC-TOP-13).
- **AC-LTB-9** — Grouped by Date, a fixture with lessons from two different
  topics interleaves correctly by date, each still labelled with its own
  topic in-row; every undated item, regardless of topic, appears once,
  together, under one trailing "Unscheduled" heading (AC-TOP-14).
- **AC-LTB-10** — Toggling between Topic and Date grouping, in edit view
  and print view, changes only heading/ordering — completion colour, tier
  content, scores and citations are identical in both modes for the same
  fixture (AC-TOP-15).
- **AC-LTB-11** — Reordering a lesson from position 3 to position 1 in a
  five-lesson fixture renumbers all five lessons to stay unique and
  contiguous from 1; every citation elsewhere in the unit reflects the new
  numbers on next render.
- **AC-LTB-12** — Grepping this build for a big-idea/topic add, rename,
  reorder, reparent, or delete implementation independent of
  `bigidea-list`'s shared write API returns nothing (proving test for
  AD-LTB-1).
- **AC-LTB-13** — Domain glyphs rendered on this view match `AC-BI-10`'s
  existing fixture exactly, sourced from `bigidea-list`'s shared function
  alone.

## 4. Prerequisites & dependencies

- **Required first:** [`bigidea-list`](bigidea-list.build.spec.md) — the
  topics list, the big-idea list, the shared write API this build's
  editing actions must call (`AD-BI-1`), the domain-glyph function
  (`FR-BIB-8`), and the topic-resolution function (`FR-BIB-17`) this build
  depends on directly; [`document-shell`](document-shell.build.spec.md) —
  the A4 portrait, unbounded-page print chassis (mirrors `resources-page`'s
  own no-cap print model); [`local-store`](local-store.build.spec.md) — the
  only persistence path; [`style-guide`](style-guide.build.spec.md) — CSS
  tokens for completion colouring, status colours, and the date/period
  pills (`--acc`/`--accbg` and the Category-accent set, `AD-13c`). The
  `Lesson`, `MiniAssessment`, and `UnitAssessment` schemas — including
  `completed`, `date`, `lessonPeriod` and their final-assessment-named
  equivalents — must be frozen; they already are, per the current data
  model spec, independent of whether `lesson-plan-document` or
  `unit-assessment-document` have themselves been built.
- **Choose-one:** none.
- **Coordinate-with:** [`lesson-plan-document`](lesson-plan-document.build.spec.md)
  — this build owns the lesson-reorder/renumber interaction its own
  `AD-LPB-4` explicitly excludes from the lesson plan screen; both builds
  call `bigidea-list`'s shared topic-resolution function (`FR-BIB-17`)
  rather than each walking the chain independently. `unit-assessment-document`
  — not yet specced, but this build reads and writes its
  `finalAssessmentCompleted`/`finalAssessmentDate`/`finalAssessmentPeriod`
  fields and each `MiniAssessment`'s equivalents; whichever build lands
  second should confirm field-name agreement against this spec, the same
  posture `coverage-grid`'s own `OQ-CG-5` already takes toward that build.
  `marking-matrix` — no direct dependency; both are wave 4/3 siblings
  reading `unit-assessment-document`'s entities independently.
- **Not resolved here:** whether `lesson-plan-generator` (still gated on
  G-5) or `unit-assessment-document`'s own creation flow are the only
  entry points that can add a lesson/assessment for this view to display —
  this build assumes whatever exists, however it got there, the same
  posture `lesson-plan-document`'s own §4 takes toward `lesson-plan-generator`.

**Gate:** work may start once `bigidea-list`, `document-shell`,
`local-store` and `style-guide` are each specced and their interfaces —
critically, `bigidea-list`'s shared write API, glyph function, and topic-
resolution function — are settled. None of the four has landed as of this
writing.

## 5. Decisions

- **AD-LTB-1** — *Decision:* every add/rename/reorder/reparent/delete
  action this view offers on a big idea or topic calls `bigidea-list`'s
  shared write API; this build implements no independent version of any of
  them. *Rationale:* this is the build-side half of the commitment
  `bigidea-list`'s own `AD-BI-1` already states from its side — the same
  "commit from both sides so neither build's author has to guess" pattern
  `AD-LPB-2`/`AD-UAB-3` already establish for the shared big-idea picker.
  Two independently-coded validation paths onto the same fields is exactly
  the drift `AD-44`'s original "exactly one editing surface" rule existed
  to prevent, and Luke's "both can write" answer only holds up safely if
  "both write through the same code." *Rejected:* a second, view-local
  implementation of add/rename/reorder/delete "since this view needs its
  own UI anyway" — the UI can differ; the write path underneath it must
  not.
- **AD-LTB-2** — *Decision:* completion colouring uses **one shared visual
  treatment** — a status dot (filled/tinted when complete, hollow when not)
  plus a tinted row background — applied identically whether the row is a
  lesson or an assessment. *Rationale:* Luke's own ask was "some sort of
  colour change when completed," stated once, about the view as a whole,
  not once per row-kind; a single treatment is also what the existing
  `LessonsAndTopics.dc.html` mockup already implements (`dot()`/`rowBg()`
  helpers shared across its `lesson()` and `assessment()` constructors).
  *Rejected:* a distinct completion treatment per row-kind (e.g. a
  checkmark for lessons, a badge for assessments) — invents a second visual
  vocabulary for one fact ("this happened") the mockup already shows
  reading fine as one.
- **AD-LTB-3** — *Decision:* Date-mode's sort key is `date` alone;
  `lessonPeriod` never participates in ordering, even when a `date` is
  absent. *Rationale:* `AD-50` already rejects deriving structure
  (weekday, period number) from `lessonPeriod`'s freeform text — sorting by
  it would require exactly the parsing that rejection forecloses. An item
  with a period but no date is, for ordering purposes, simply undated —
  it sorts into the trailing "Unscheduled" heading and still shows its
  period text in-row (`FR-TOP-14a`'s own text already states this
  explicitly; this decision names the sort-key consequence directly).
  *Rejected:* a secondary sort by `lessonPeriod` text within the
  Unscheduled heading — freeform text has no natural chronological order
  ("Mon 3rd P" does not sort meaningfully against "Wed 1st P" as strings),
  so a secondary text sort would look ordered without being ordered.
- **AD-LTB-4** — *Decision:* the derived topic status (`FR-LTB-8`) is
  computed over **every** lesson and assessment placed under a topic by
  `FR-LTB-2`'s resolution — never scoped to only the items currently
  visible under the active grouping mode. *Rationale:* `FR-TOP-14b`
  already states switching grouping mode must not change the derived topic
  status; the only way to guarantee that is to compute it from the full,
  grouping-independent placement, then simply choose whether to *display*
  it (Topic mode shows it as a heading; Date mode omits the heading
  entirely per `FR-TOP-14b`'s own text, since Date mode has no topic
  headings to carry it). *Rejected:* recomputing status per grouping mode
  from whatever subset that mode currently renders — would risk exactly
  the drift `FR-TOP-14b`'s acceptance criterion (`AC-TOP-15`) exists to
  catch.
- **AD-LTB-5** — *Decision (reverses the OQ-LTB-1 default at Luke's direct
  instruction, 2026-08-29).* This spec originally defaulted to **Topic
  mode only** for lesson-reorder — Date mode's visual position reflects
  `date`/`lessonPeriod`, not `number`, so a drag there is ambiguous about
  which field it means to change, and the triage recommendation was to
  leave Date mode read/complete/schedule-only for ordering. Luke decided
  against that recommendation: drag-to-reorder must work in **both**
  modes. *Resolution:* rather than trying to make a Date-mode drag write
  `number` (which would fight `date`'s own ordering the moment the two
  disagree) or interpolate a fractional/derived date between two
  neighbours (which invents scheduling data nobody entered), Date mode's
  drag is scoped to **only the dragged lesson's own `date`**, set to
  match the date-group it is dropped into (FR-LTB-18…21). No other
  lesson's `date` or `number` is ever touched by a Date-mode drag — it is
  a "move this lesson into this date-group" gesture, not a fine-grained
  ordinal reorder, which keeps it perfectly safe to run alongside Topic
  mode's own `number`-renumbering drag (FR-LTB-5) without the two write
  paths ever contending over the same field. *Rejected:* renumbering
  `number` from a Date-mode drag (two orderings would silently disagree
  the moment lessons aren't already date-sorted); shifting displaced
  lessons' own dates to make room (a calendar date is not a fungible slot
  the way an ordinal position is — moving someone else's scheduled date
  as a side effect of an unrelated drag is exactly the kind of surprising
  write this project's "flag, don't hide" and no-silent-side-effect
  conventions rule out); interpolating a synthetic date strictly between
  two neighbours (often impossible at day granularity, and invents a
  schedule commitment Luke never made).

**Open questions**

- **OQ-LTB-1** — ✅ **RESOLVED (2026-08-29) — Luke direct.** Is the
  lesson-reorder control (`FR-LTB-5`) available in both Topic and Date
  grouping modes, or only in Topic mode (where a lesson's position
  visually corresponds to its `number`)? This spec's own default, recorded
  below for the record, had been **Topic mode only** — in Date mode,
  visual position reflects `date`/`lessonPeriod`, not `number`, so a
  drag-to-reorder gesture there would be ambiguous about which field it
  intends to change. *Luke's resolution, against that default:*
  drag-to-reorder is available in **both** Topic and Date grouping modes.
  Date mode's drag does not touch `number`; it rewrites only the dragged
  lesson's own `date`, joining the date-group it is dropped on, and never
  displaces any other item's `date`. Spec'd in full as new
  **FR-LTB-18…21**, with the reversal and its rejected alternatives
  recorded in new **AD-LTB-5**.
  <br><br>*Original default text, retained for the record:* Topic mode
  only — in Date mode, visual position reflects `date`/`lessonPeriod`, not
  `number`, so a drag-to-reorder gesture there would be ambiguous about
  which field it intends to change. Reordering `number` stays a
  Topic-mode action; Date mode is read/complete/schedule only for the
  ordering axis.
- **OQ-LTB-2** — ✅ **RESOLVED (2026-08-29).** Does the completion flag
  support a bulk "mark all in this topic complete" action, or is it
  strictly per-item? *Resolved:* strictly per-item in v1 — `FR-TOP-10`'s
  text describes a per-lesson/per-assessment flag with no bulk variant
  mentioned; a bulk action is a plausible later convenience, not something
  to build ahead of a request. Already covered by FR-TOP-10/FR-LTB-6; no
  new requirement needed.
- **OQ-LTB-3** — ✅ **RESOLVED (2026-08-29).** When an assessment's
  `bigIdeaId` resolves to a big idea with no `topicId` yet reachable (a
  data state that should not occur once `INV-DM-34` holds, but might
  transiently during editing) — does the item show under an "Unassigned"
  heading, or is it simply excluded from render until the binding
  resolves? *Resolved:* excluded from render with a visible warning badge
  rather than a silent drop — matching this project's "flag, don't hide"
  convention (`FR-TR-8` et al.) — since `INV-DM-34` treats an unresolvable
  `topicId` as an invalid document state that `local-store`'s own
  load-time validation (`FR-LS-3`) should already have refused before
  this view ever renders it. Already covered by FR-TR-8/INV-DM-34/FR-LS-3;
  no new requirement needed.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| This build reimplements big-idea/topic add/rename/reorder/delete locally instead of calling `bigidea-list`'s shared API | Reopens `AD-44`'s original drift risk the moment Luke's "both can write" answer is implemented — the exact failure that answer was supposed to avoid by sharing one write path | AD-LTB-1 states the requirement explicitly; `AC-LTB-12`'s grep check | AC-LTB-12 |
| The lesson-reorder control also gets added to the lesson-plan screen "for convenience," duplicating this build's `FR-LTB-5` | Two renumbering code paths for `INV-DM-32`'s contiguous-from-1 rule, the same class of drift `AD-LPB-4` already named and placed here specifically to prevent | FR-LTB-5 and `AD-LPB-4` cited on both sides; code review of `lesson-plan-document` checks it has no reorder control | Manual check: `lesson-plan-document`'s screen carries no drag/reorder affordance for `Lesson.number` |
| Derived topic status is computed from whatever subset the active grouping mode currently renders, rather than the full placement | Switching grouping mode silently changes a topic's shown status, violating `FR-TOP-14b` | AD-LTB-4 states the computation is grouping-independent | AC-LTB-10 |
| `lessonPeriod` creeps into the Date-mode sort key "just to break ties" | Reopens `AD-50`'s rejected structured-period parsing through the back door of sort order | AD-LTB-3 states `date` is the sole sort key | Manual check: sort comparator reads no field but `date` |
| A missing or unresolvable `topicId` on a placed item causes a silent drop from the rendered outline | A real assessment or lesson goes invisible with no indication anything is wrong — violates this project's "flag, don't hide" convention | OQ-LTB-3's default (flagged, not silently excluded); `local-store`'s own `FR-LS-3` validation is the first line of defence | Manual check: a fixture with a transiently-broken binding renders a visible warning, not a blank |
| Spec IDs or invariant names leak onto the rendered view (a stray "INV-DM-32" in a tooltip) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above names the visible behaviour, never the spec id; code review greps rendered strings | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label or message |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`bigidea-list.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-LTB-1…13 demonstrated
- [ ] AC-LTB-5: a multi-page print test recorded with numbers (page count)
      for a fixture large enough to span multiple pages, with no page break
      inside a row
- [ ] AC-LTB-6/10: print output and grouping-mode switches both leave
      completion colouring and derived topic status unchanged from edit view
- [ ] AC-LTB-11: lesson renumbering demonstrated contiguous-from-1 after a
      reorder, with citations elsewhere confirmed updated on next render
- [ ] AC-LTB-12: no independent big-idea/topic write implementation
      anywhere in this build (grep check)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-LTB-17)
- [ ] Persists only through `local-store`; no direct filesystem access from
      the browser
- [ ] `FR-SYS-2`'s "six parts" count is unaffected — this build adds no
      seventh part, no new cardinality invariant

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
