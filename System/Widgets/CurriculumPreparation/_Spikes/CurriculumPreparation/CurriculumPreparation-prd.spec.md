# CurriculumPreparation — Product Requirements

| Field | Value |
|---|---|
| **Type** | Supporting spec (PRD) |
| **Date** | 2026-08-20 (rev 15 — Changes AA/AB) |
| **Status** | Draft — awaiting Luke's review |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

Requirements are numbered by part and are the traceability targets for every
build spec and plan step in `_Builds/`. A build spec that satisfies no FR here
does not belong in this project.

---

## FR-SYS — System-wide

- **FR-SYS-1** — The bundle runs **offline**: no network request ever leaves the
  machine, no CDN, no external font. *(Rev 4: this no longer means "no server" —
  each bundle runs its own localhost `serve.py`. See FR-BND-3.)*
- **FR-SYS-2** — Each of the six parts renders as **SVG**. *(Rev 5: Change E
  adds the Unit Assessment as a fifth part of the widget — FR-UA — printed
  ordinally as Part 3; see AD-23. Rev 5 also folds in Change H, which adds
  the Resources page as a sixth part — FR-RES — printed ordinally as Part 6;
  see AD-25. Rev 11: Change V makes the combined Lessons & Topics view
  print-capable too, also as SVG (FR-TOP-8a) — it is **not** a seventh part
  under this requirement; see FR-TOP-8b and AD-42.)*
- **FR-SYS-3** — Each part can be **saved and viewed as either a PDF or an
  HTML page**. Data entry happens **only** on the HTML page.
- **FR-SYS-4** — Printing any part produces **true-size A4** output: correct
  page count, no clipping, no scale drift.
- **FR-SYS-4a** — Each part prints in its own **orientation**:

  | Part | Orientation |
  |---|---|
  | Curriculum map | **A4 landscape** |
  | Lesson plan | **A4 portrait** |
  | Unit Assessment | **A4 portrait** — same rule as the lesson plan (AD-11, AD-23) |
  | Marking matrix | **either — user's choice, remembered on the matrix** |
  | Crib sheet | **either — user's choice, remembered** |
  | Resources page | **A4 portrait — fixed, not user-selectable** (FR-RES-7, AD-25) |
  | Lessons & Topics view *(New — Change V)* | **A4 portrait — fixed, not user-selectable**, same rule as the lesson plan (FR-TOP-8a, AD-42) — **not counted among the six parts** below |

  Six parts, **three distinct orientation values** (landscape, portrait,
  either) — the arithmetic is unchanged from the four-part model because the
  Unit Assessment reuses the lesson plan's fixed portrait rather than adding a
  fourth value (Change E/G; AD-23), and the Resources page does the same
  rather than adding a fifth (Change H; AD-25). *(Change V footnote: the
  combined Lessons & Topics view is now also print-capable — FR-TOP-8, FR-TOP-8a
  — but is deliberately excluded from this "six parts" count and from
  FR-SYS-11's cardinality clause below. It carries no schema-backed singular
  object of its own — it is a derived rendering over `lessons[]`, `topics[]`,
  `bigIdeas[]` and `unitAssessment`, the same class of thing as the big-idea
  list overlay on the curriculum map (FR-CUR-8) — so there is nothing for an
  `AC-SYS-6`-style "two of them is invalid" test to check. See AD-42 for the
  full reasoning, including the rejected seventh-part alternative.)*

- **FR-SYS-5** — All state for a unit lives in its **bundle folder** — which the
  user can save, move, copy, back up and re-open (FR-BND).
- **FR-SYS-6** — The three tiers are **Green = Pass, Blue = Intermediate,
  Orange = Advanced**, everywhere, with no per-document override.
- **FR-SYS-7** — Nothing is auto-sent, auto-published, or auto-uploaded. The
  tool writes to the local filesystem only, on explicit user action.
- **FR-SYS-8** — Built from **Python and vanilla JS only** — no framework, no
  package manager, no build chain, no dependency beyond the Python standard
  library. *(AD-13; SR-2, PY-1, JS-7)*
- **FR-SYS-9** — Targets **Chrome on macOS**. Other browsers are not a
  requirement, though nothing in the design excludes them. *(gate G-4 closed)*
- **FR-SYS-10** — Every file complies with the **Vibe Coding Rules**
  (`Memory/Long-Term/Coding/vibe-coding-rules.md`). *(AD-13a)*
- **FR-SYS-11** — Each part's **cardinality is fixed by the schema**: exactly
  one curriculum map, one big-idea list, one crib sheet, one Unit Assessment
  (holding exactly one final assessment and many mini assessments — FR-UA-2,
  FR-UA-3), one marking matrix (paginated by student — Change F, AD-24), one
  resources page (Change H, AD-25); many lesson plans. *(AD-19, revised by
  AD-23/AD-24/AD-25 — the marking matrix is no longer plural at the top
  level; see AD-19's Change F note.)*

**Acceptance**
- **AC-SYS-1** — With the network disabled, a unit folder opens, edits, and
  prints end-to-end.
- **AC-SYS-2** — A printed lesson plan measured against an A4 sheet matches on
  page count and margins.
- **AC-SYS-3** — Curriculum map prints 297 × 210 mm (landscape); lesson plan
  210 × 297 mm (portrait); matrix and crib sheet print correctly in whichever
  orientation was chosen.
- **AC-SYS-4** — `pip list` is irrelevant: every script runs on a stock Python 3
  with no installs.
- **AC-SYS-5** — No framework, bundler, package manifest or vendored library
  appears anywhere in a bundle.
- **AC-SYS-6** — A unit file containing two crib sheets, two big-idea lists,
  two curriculum roots, or two resources pages is refused as invalid.
  *(Extended — Change H.)*

---

## FR-BND — The unit bundle

The deliverable is not one app that opens unit folders. It is a **template**
plus a **generator skill** that stamps out complete, independent bundles.

- **FR-BND-1** — A **`!NewUnit` skill** creates a new unit bundle from the
  template, at a path Luke chooses, with the unit's identity filled in.
- **FR-BND-2** — A bundle is **self-contained**: its own server, scripts,
  style guide, CSS, documentation and data. Nothing outside the folder is
  needed to run it.
- **FR-BND-3** — A bundle carries its **own tiny Python server** (`serve.py`)
  and a **double-click `.command` launcher**, matching the existing Lukeatron
  viewers. *(AD-5, SR-6)*
- **FR-BND-4** — The server **binds `127.0.0.1` only** and is **hard-scoped to
  its own bundle root**: every resolved path that escapes the root is refused.
  It never reads or writes `Memory/`. *(AD-13b)*
- **FR-BND-5** — A bundle can be **moved, copied or archived** and still runs —
  from another folder, another disk, or a path containing spaces.
- **FR-BND-6** — Two bundles can run **at the same time** without colliding on
  a port.
- **FR-BND-7** — A bundle records **which template version generated it**
  (`generatedFrom`), so a stale bundle can be identified later.
- **FR-BND-8** — A bundle carries its **own `README.md`**, documenting
  architecture, navigation and life-cycle — never a walkthrough of the code.
  *(SR-7)*
- **FR-BND-9** — A bundle carries its **own StyleGuide and `variables.css`**;
  no CSS file hardcodes a value that belongs in a token. *(CSS-1, CSS-2)*
- **FR-BND-10** — A bundle carries its **own `tests/`**, runnable with stdlib
  `unittest`. *(TEST-1, TEST-3)*
- **FR-BND-11** — *(New — Change X)* `variables.css` is **transcribed from the
  mockup-established token table**, not redesigned — colours, radius, borders
  and font stack all come from the values already decided and reviewed across
  `_Mockups/` rev 1–11. *(AD-13c, CSS-2)*

**Acceptance**
- **AC-BND-1** — `!NewUnit` produces a bundle that starts and saves, with no
  manual step beyond running the launcher.
- **AC-BND-2** — The bundle copied to `/tmp/a b c/` still starts, saves and
  prints.
- **AC-BND-3** — A request for `../../../etc/passwd` (and its encoded variants)
  is **refused**; a legitimate request inside the root **passes**. *(TEST-7 —
  both directions, or the build is not done.)*
- **AC-BND-4** — The server refuses connections from anything but localhost.
- **AC-BND-5** — Two bundles run simultaneously on different ports.
- **AC-BND-6** — `python3 -m unittest` passes inside a fresh bundle.
- **AC-BND-7** — Every colour, radius and border value in `variables.css` matches
  AD-13c's table exactly; a grep for a hardcoded hex outside `variables.css` returns
  nothing. *(FR-BND-11, CSS-2)*

---

## FR-CUR — Part 1 · Curriculum map

### Ingest

- **FR-CUR-1** — The user drops **plain text** into an **ingest spot**; a
  **Python script digests it** into the canonical unit structure and writes it
  into the right place in `unit.json`. *(AD-16; gate G-1 closed)*
- **FR-CUR-1a** — Ingest is explicitly **best-effort**. It must be *roughly*
  right, not exactly right — Luke corrects and re-arranges afterwards in the
  editor. An ingest that produces a usable starting point beats one that
  refuses ambiguous input.
- **FR-CUR-1b** — Where the parser is unsure, it **marks the node as
  low-confidence** rather than guessing silently, so Luke knows where to look
  first.
- **FR-CUR-1c** — Import works for **more than one kind of curriculum**. Each
  is described by a named **curriculum profile** — a declarative adapter
  carrying its field mapping, its own vocabulary for node kinds, and its
  attribution. *(AD-10)*
- **FR-CUR-1d** — A **generic profile** always exists: structure the text by
  hand against the canonical model. Any curriculum can be brought in even with
  no bespoke adapter.
- **FR-CUR-1e** — The unit records **which profile it was imported under**, and
  the source's name, version and attribution. *(AD-8)*
- **FR-CUR-1f** — Ingest **never destroys existing work**. Re-running it on a
  unit that already has lessons either merges additively or writes to a
  separate staging area for review.

### Map

- **FR-CUR-2** — The user can **edit curriculum details** after ingest: add,
  rename, re-parent, and delete outcomes and tasks; edit codes and text. This
  is a first-class workflow, not a repair hatch — ingest is best-effort by
  design, so editing carries real weight.
- **FR-CUR-3** — The unit's tasks and outcomes render as an **arbor tree — a
  horizontal family tree** — root at the left, descendants fanning right.
- **FR-CUR-4** — The scope is **one unit**, not a year.
- **FR-CUR-5** — Every node carries the curriculum's own **name and
  identifying number/code**, preserved verbatim from the source.
- **FR-CUR-6** — The curriculum map document prints to **A4 landscape** and
  views as HTML.
- **FR-CUR-7** — The map shows **lesson coverage**: which nodes have at least
  one lesson serving them, and which have none. *(Distinct from big-idea
  coverage, FR-CUR-10 — the two are different relationships and both render.)*
- **FR-CUR-8** — The curriculum map document **also carries the unit's
  big-idea list** (FR-BI), so the two organising axes are visible on one page.
- **FR-CUR-9** — Where the curriculum supplies orientation prose for the
  teacher (`curriculum.description` — e.g. the Victorian Curriculum's
  "Description" field), it renders **prominently at the head of the
  curriculum map**, above the tree. It is **excluded** from the lesson plan,
  marking matrix, and crib sheet — it orients the teacher to the map, it is
  not lesson content. The field is curriculum-agnostic (INV-DM-10): any
  profile may populate it, none requires it.
- **FR-CUR-10** — A curriculum node covered by one or more big ideas renders
  those big ideas as **chips attached to the node on the arbor tree**, in
  print view (Change D; AD-22, AD-11). Full and partial coverage (FR-BI-7) show
  distinctly, and each chip cites its big idea in human-readable form
  (FR-TR-6, AD-12).
- **FR-CUR-11** — *(New — Change I)* The print view arbor tree carries a
  **second, distinct chip type** showing **assessed coverage** — full/partial,
  per `unitAssessment.coverage[]` (FR-UA-6) and every upgraded
  `miniAssessment.coverage[]` (AD-27) — beside the existing big-idea coverage
  chip (FR-CUR-10). Same node, **two independent chips**, each citing its own
  source in human-readable form (FR-TR-6, AD-28) — a node can show a
  big-idea chip, an assessment chip, both, or neither.
- **FR-CUR-12** — *(New — Change P)* The print view arbor tree carries a
  **third, distinct chip type** showing **topic coverage** — full/partial,
  per `topic.coverage[]` (FR-TOP-6, AD-35) — beside the existing big-idea
  chip (FR-CUR-10) and assessment chip (FR-CUR-11). A node can show any
  combination of the three chips independently, each citing its own topic in
  human-readable form (FR-TR-6). Topic coverage is **shown**, not folded
  into the taught/assessed gap comparison (FR-BI-12) — a topic's claimed
  coverage is a separate, independently viewable statement, not a third term
  in that comparison (AD-35).

**Acceptance**
- **AC-CUR-1** — A real plain-text paste ingests and renders as a horizontal
  tree, with every node showing its source code.
- **AC-CUR-2** — Ingest accuracy is measured and recorded as a percentage.
- **AC-CUR-3** — Low-confidence nodes are visibly distinguishable.
- **AC-CUR-4** — An edit to a node's text survives save → reopen.
- **AC-CUR-5** — Re-parenting a task updates the tree without corrupting the
  unit file.
- **AC-CUR-6** — Two curricula from different jurisdictions both ingest and
  render, each showing its own source codes and vocabulary.
- **AC-CUR-7** — An uncovered node is visibly distinguishable from a covered
  one, in edit view and in print view.
- **AC-CUR-8** — Re-running ingest on a unit with lessons destroys nothing.
- **AC-CUR-9** — A curriculum with a `description` renders it at the top of
  the map; the same text does not appear on any lesson plan, matrix, or crib
  sheet page.
- **AC-CUR-10** — A print view curriculum map shows a big-idea chip on every
  node it covers, full and partial coverage visually distinct, and a node
  with no big-idea coverage visibly bare.
- **AC-CUR-11** — *(New — Change I)* A print view node shows a big-idea coverage
  chip and an assessment coverage chip **independently**: a node fully taught
  but unassessed shows only the taught chip; a node assessed but untaught
  shows only the assessed chip; a node both shows both.
- **AC-CUR-12** — *(New — Change P)* A print view node covered by a topic, with
  no big-idea or assessment coverage of its own, shows **only** the topic
  chip — confirming the three chip types render independently of one
  another.

---

## FR-BI — Cross-cutting · The big-idea list

The unit's **second organising axis**, alongside the curriculum tree. The
curriculum tree is the authority's structure; the big-idea list is Luke's.

- **FR-BI-1** — Each unit has a **big-idea list**, separate from and parallel
  to the curriculum node tree.
- **FR-BI-2** — A big idea may be broken into **sub-big ideas**. The list is
  **exactly two levels deep** — big idea, sub-big idea, no deeper.
- **FR-BI-3** — The list is **editable**: add, rename, re-order, re-parent
  between levels, and delete.
- **FR-BI-4** — **Every lesson is bound to exactly one** big idea *or* sub-big
  idea from the list. A lesson without one is invalid.
- **FR-BI-5** — **One big idea may be spread across many lessons** — the
  binding is many-lessons-to-one-idea.
- **FR-BI-6** — From a big idea, the user can see **every lesson that serves
  it** — and see when none does.
- **FR-BI-7** — A big idea may optionally link to the **curriculum nodes** it
  serves via a qualified `coverage[]` array (Change C; AD-21), tying the two
  axes together without forcing it. Each link states whether the big idea
  **wholly** or **only partly** satisfies that node — the two axes are tied
  together with a distinction Luke can act on, not a bare yes/no. The edge
  stays **forward-stored on the big idea**; the reverse — which big ideas, if
  any, cover a given node — is **derived**, never stored (INV-DM-12,
  unchanged by this change).
- **FR-BI-8** — Deleting a big idea that lessons are bound to is **refused**,
  naming the blocking lessons — it never silently orphans a lesson.
- **FR-BI-9** — A big idea may cover **many** curriculum nodes, and a
  curriculum node may be covered by **many** big ideas — `coverage[]` is
  many-to-many. *(A different plural from FR-BI-5: FR-BI-5 is one big idea
  spread across many lessons; this is one big idea's coverage spread across
  many nodes, and one node served by many big ideas.)*
- **FR-BI-10** — The unit provides a **coverage grid** as the edit view
  for `coverage[]` (Change D; AD-22): big ideas on one axis, curriculum
  content descriptions on the other, each cell empty / full / partial. The
  grid must show gaps at a glance, support attaching and detaching a big idea
  from a node directly on the grid, support reordering/moving big ideas, and
  stay legible with roughly forty content descriptions on one axis. Acting
  from the grid may edit from either the big-idea or the node direction, but
  storage stays canonical on `bigIdea.coverage[]` (AD-22).
- **FR-BI-11** — *(New — Change I)* The coverage grid (FR-BI-10) additionally
  renders, against the **same list of content descriptions**, whether each is
  **assessed** — derived by walking `unitAssessment.coverage[]` and every
  `miniAssessment.coverage[]` (the qualified shape Change I upgrades mini
  assessments to — AD-27) — alongside the existing **taught** axis
  (`bigIdea.coverage[]`). Both axes render together, on the same view, against
  the same nodes — not as two separate grids a teacher has to cross-reference.
- **FR-BI-12** — *(New — Change I)* Three gap states are named and shown
  **distinctly** — never merged into one generic "gap" flag:
  - **taught but not assessed** — a content description some big idea covers
    that no assessment (final or mini) touches;
  - **assessed but not taught** — a content description an assessment covers
    that no big idea claims;
  - **neither** — covered by nothing at all.

  Each renders as its own visibly distinguishable state on the grid.
- **FR-BI-13** — *(New — Change I)* All three gap states in FR-BI-12 are
  **derived**, walked fresh on load from `bigIdea.coverage[]`,
  `unitAssessment.coverage[]` and every `miniAssessment.coverage[]` — no new
  stored reverse edge is added for any of them, on either axis. INV-DM-12
  stays intact: this is a computed comparison of two already-derived indices,
  not a third one.
- **FR-BI-14** — *(New — Change P)* The coverage grid (FR-BI-10) gains a
  **third column group** — topics × the same content descriptions — using
  the same qualified vocabulary and the same empty/full/partial cell
  convention as the existing big-idea (taught) and assessment (assessed)
  groups. Storage stays canonical on `topic.coverage[]` (AD-35), the same
  "grid edits, entity stores" split AD-22 already establishes. **This third
  group does not participate in FR-BI-12's gap-state comparison** — topic
  coverage renders alongside taught and assessed coverage for reference, not
  as a third input into the taught/assessed gap logic (AD-35).

**Acceptance**
- **AC-BI-1** — A big idea with three sub-big ideas renders on the curriculum
  map and survives save → reopen.
- **AC-BI-2** — A lesson cannot be created or saved without a big-idea binding.
- **AC-BI-3** — Two lessons bound to the same big idea both appear in that idea's
  lesson list.
- **AC-BI-4** — Attempting a third nesting level is refused.
- **AC-BI-5** — Deleting a bound big idea is refused with the blocking lessons
  named.
- **AC-BI-6** — A big idea's coverage set to `full` on one node and `partial`
  on another renders each distinctly, on the grid and on the print view map.
- **AC-BI-7** — A coverage grid holding 8 big ideas and 40 content
  descriptions stays legible and scrollable; toggling a cell updates the
  print view chip on next render, and a node column with no `full`/`partial`
  cell reads as a visible gap.
- **AC-BI-8** — *(New — Change I)* A grid showing one content description
  covered by a big idea only, one covered by an assessment only, and one
  covered by neither, renders each of the three FR-BI-12 gap states
  distinctly — on the grid and on the print view map.
- **AC-BI-9** — *(New — Change P)* A coverage grid with topic coverage set on
  a content description that carries no big-idea or assessment coverage
  shows the topic column filled and the taught/assessed gap state for that
  node **unchanged** — confirming topic coverage does not feed FR-BI-12.

> **Ordering consequence:** because FR-BI-4 makes the binding mandatory, the
> big-idea list must exist before any lesson can. `bigidea-list` therefore
> precedes `lesson-plan-document` in the build waves — this is a hard edge, not
> a preference.

---

## FR-TOP — Cross-cutting · Topics

*(New in this revision — Change P. The top tier of axis 2 (the teaching
structure), sitting above the big-idea list: a topic groups big ideas the
way a big idea groups lessons, and bridges the curriculum's skill/knowledge
requirements to that grouping via its own coverage links. See AD-35 for the
full rationale, including why this is an extension of axis 2 rather than a
third axis. Extended — Change S: the standalone Topics view and the Lessons
tab merge into one combined Lessons & Topics view, and lessons/assessments
gain a manual completion flag. See AD-37, AD-38.)*

- **FR-TOP-1** — Each unit has a **topics list** — a flat, ordered
  collection, separate from and layered above the big-idea list (FR-BI-1).
- **FR-TOP-2** — The list is **editable**: add, rename, re-order, and delete.
- **FR-TOP-3** — **Every top-level big idea is bound to exactly one topic.**
  A sub-big idea carries no topic binding of its own — it inherits its
  parent's. A top-level big idea without a topic is invalid. *(INV-DM-34)*
- **FR-TOP-4** — **One topic may group many big ideas** — the binding is
  many-big-ideas-to-one-topic, the same shape FR-BI-5 already gives
  big-idea-to-lesson.
- **FR-TOP-5** — From a topic, the user can see **every big idea bound to
  it** — and, transitively, every lesson under those big ideas.
- **FR-TOP-6** — A topic may optionally link to the **curriculum nodes** it
  serves via its own qualified `coverage[]` array (AD-35), reusing the exact
  shape and two-value enum `BigIdea.coverage[]` already uses (AD-21). This
  storage is **independent** of whatever the topic's big ideas individually
  link — a topic may claim coverage none of its big ideas assert yet.
- **FR-TOP-7** — Deleting a topic that big ideas are still bound to is
  **refused**, naming the blocking big ideas — the same refusal pattern as
  FR-BI-8.
- **FR-TOP-8** — *(REWRITTEN — Change S; print capability added — Change V)*
  The app provides a **combined Lessons & Topics view** laying the whole unit
  out **sequentially down the page**: every topic as a heading, in order,
  with its lessons and its assessments listed beneath it as one continuous
  outline. A lesson's place is `lesson.bigIdeaId` → big idea [→ its parent,
  if a sub-big idea] → topic (the same chain FR-TOP-9 uses); a final or mini
  assessment's place is its own `bigIdeaId` → topic (FR-UA-5, FR-UA-13) — no
  assessment collapses onto one topic just because it once shared a
  document-level binding (AD-37). **This single view replaces both the
  standalone Topics view and the Lessons tab** (FR-LP-14, retired below) —
  Luke: *"a combined sequential 'Lessons and Topics' page that displays
  topics with lessons ... as a subset, and assessments as a subset ... at a
  glance you can see the whole unit laid out."* ~~screen-only, never printed
  as its own document~~ — **this restriction is reversed under Change V**:
  Luke has since asked for the same view as a printed document. See FR-TOP-8a
  for what printing it means, and AD-42 for why this does not make it a
  seventh part of the widget.
- **FR-TOP-8a** — *(New — Change V)* The combined Lessons & Topics view
  **prints**, in addition to rendering in edit view. It prints **A4
  portrait**, fixed like the lesson plan and Unit Assessment (FR-SYS-4a,
  AD-11) — not user-selectable. It **flows to as many pages as the unit
  needs**, with no page cap (the same no-cap convention as the Resources page,
  FR-RES-7) — a page break falls between topic sections where one is needed,
  never inside a lesson or assessment row. Print carries no new stored data:
  it is a rendering of the same derived outline FR-TOP-8 already builds from
  `lessons[]`, `topics[]`, `bigIdeas[]` and `unitAssessment` — the same
  "derive, don't duplicate" rule INV-DM-12 already applies everywhere else in
  this schema (AD-42). The per-item completion colouring (FR-TOP-10) and the
  per-topic derived status (FR-TOP-11) both render in print exactly as they
  do in edit view, since both are already computed from stored data rather
  than screen-only state.
- **FR-TOP-8b** — *(New — Change V)* The combined Lessons & Topics view is
  **not counted among the widget's six parts** (FR-SYS-2, FR-SYS-11,
  INV-DM-18) despite now printing. It carries no schema-backed singular
  object of its own — no `AC-SYS-6`-style "two of them is invalid" test
  applies to it, because there is nothing stored to duplicate. It is
  cross-cutting, the same category as the big-idea list (FR-BI) and the
  Topics list (FR-TOP-1…7) it already belongs to — a view that happens to
  also be printable, not a seventh document. *(AD-42 records the rejected
  alternative — treating it as a seventh part — and why it was rejected.)*
- **FR-TOP-9** — Every lesson plan's front page shows the lesson's **Topic**,
  resolved transitively (`lesson.bigIdeaId` → big idea [→ its parent, if a
  sub-big idea] → topic), printed **above** the big idea (FR-LP-2) — the
  coarser context before the finer one.
- **FR-TOP-10** — *(New — Change S)* A lesson, a mini assessment, and the
  final assessment each carry a **manual, boolean completion flag**
  (`Lesson.completed`, `MiniAssessment.completed`,
  `UnitAssessment.finalAssessmentCompleted`) — set directly by the teacher,
  **never derived** from `number`, a date, or anything else. On the combined
  view (FR-TOP-8), a completed row renders with a distinct colour from an
  incomplete one. The flag touches nothing else in the schema — no tier,
  score, or citation reads it.
- **FR-TOP-11** — *(New — Change S)* A topic's own completion status is
  **derived, never stored**: **complete** only when every lesson and every
  assessment placed under it (FR-TOP-8) is individually marked complete;
  **not started** when none are; **in progress** otherwise. The three states
  render distinctly, the same three-state discipline FR-BI-12 already uses
  for coverage gaps.

**Acceptance**
- **AC-TOP-1** — A topic with three big ideas bound to it shows all three,
  and their lessons, from the combined Lessons & Topics view.
- **AC-TOP-2** — A top-level big idea cannot be created or saved without a
  topic binding; a sub-big idea has no topic field to fill in at all.
- **AC-TOP-3** — Deleting a topic that big ideas are bound to is refused,
  naming the blocking big ideas.
- **AC-TOP-4** — A topic's coverage set to `full` on one node and `partial`
  on another renders each distinctly, on the grid and on the print view map —
  the same convention already proven for `BigIdea.coverage[]` (AC-BI-6).
- **AC-TOP-5** — A lesson plan's front page shows its topic above its big
  idea.
- **AC-TOP-6** — *(REWRITTEN — Change S)* The combined Lessons & Topics view
  lists every topic in unit order, each heading its own lessons and
  assessments, sorted by lesson number within the topic.
- **AC-TOP-7** — *(New — Change S)* Marking a lesson complete changes only
  that row's colour on the combined view and `Lesson.completed`; every other
  field on the lesson (tiers, scores, citations) is untouched.
- **AC-TOP-8** — *(New — Change S)* A topic with every lesson and assessment
  under it marked complete shows as complete; one with none shows as not
  started; one with a mix shows as in progress — all three visibly distinct.
- **AC-TOP-9** — *(New — Change S)* Two mini assessments under different big
  ideas appear under their own, different topics on the combined view — not
  both collapsed onto whichever topic the Unit Assessment's own `bigIdeaId`
  happens to point at.
- **AC-TOP-10** — *(New — Change V)* A fixture unit with enough topics,
  lessons and assessments to exceed one A4 page prints the combined Lessons &
  Topics view as multiple A4 portrait pages, with no page inside a topic's
  content silently dropped, and no page break falling inside a lesson or
  assessment row.
- **AC-TOP-11** — *(New — Change V)* A fixture with one complete lesson, one
  incomplete lesson, and one topic with a mix of both prints the same
  completion colouring and the same derived topic status (not started / in
  progress / complete) that edit view shows — confirming print is a rendering
  of the same data, not a second, divergent surface.

> **Ordering consequence:** because FR-TOP-3 makes the binding mandatory,
> the topics list must exist before any top-level big idea can. `topics-list`
> therefore precedes `bigidea-list` in the build waves — the same "hard
> edge, not a preference" reasoning AD-14 already established one level
> down.

---

## FR-LP — Part 2 · Lesson plan

The lesson plan is an **A4 portrait document of one to four pages** — the
front page always prints; each tier page prints only if that tier has
content. *(REWRITTEN — Change N: previously always exactly four pages. See
FR-LP-7/7a and [AD-33](CurriculumPreparation.arch.spec.md#ad-33--lesson-plan-tier-pages-print-only-when-populated-the-schemas-three-tiers-stay-mandatory).
The three-tier invariant itself is unchanged — INV-DM-1, AD-7 — only which of
a lesson's pages happen to print.)*

### Page 1 — front page

- **FR-LP-1** — Shows the **name and number** from the relevant part of the
  curriculum (the node(s) the lesson hangs off — FR-CUR-5).
- **FR-LP-1a** — *(New — Change P)* Shows the lesson's **Topic**, resolved
  transitively through its big idea (FR-TOP-9), printed **above** the big
  idea (FR-LP-2) — the coarser context first. A big idea always resolves to
  a topic under FR-TOP-3, so this is never blank in practice.
- **FR-LP-2** — Shows the lesson's **big idea** — the title of the bound big
  idea or sub-big idea (FR-BI-4), plus an optional lesson-specific gloss.
- **FR-LP-3** — Shows the **key example**.
- **FR-LP-4** — Shows the **practice question**.
- **FR-LP-5** — Shows a section for **how the lesson connects to the unit
  assessments**.
- **FR-LP-6** — Shows the **tier key** (Green/Blue/Orange) introducing pages 2–4.

### Pages 2–4 — tiered work

- **FR-LP-7** — *(REWRITTEN — Change N)* When present, tier pages print in
  **fixed order** — **Green · Pass** before **Blue · Intermediate** before
  **Orange · Advanced**, one tier per page, colour-coded — regardless of
  which subset of the three is present (INV-DM-5 unchanged). A tier page is
  **emitted only if that tier has content** (FR-LP-7a); an empty tier prints
  no page at all, never a blank one.
- **FR-LP-7a** — *(New — Change N)* A tier is **empty** — and its page is not
  emitted — exactly per [INV-DM-33](CurriculumPreparation-datamodel.spec.md#2-invariants)'s
  criterion. The `Lesson.tiers` object in the schema **always carries all
  three fixed keys** — `pass`, `intermediate`, `advanced` (INV-DM-1,
  INV-DM-25, unchanged). Emptiness is a property of a tier's **content**, not
  of whether its key exists in the schema — this does **not** make tiers
  optional in the data model
  ([AD-33](CurriculumPreparation.arch.spec.md#ad-33--lesson-plan-tier-pages-print-only-when-populated-the-schemas-three-tiers-stay-mandatory)).
- **FR-LP-8** — Each tier page carries **space for the relevant work** at that
  tier: the material, the student-facing task, and room to write. *(Unchanged
  by Change N — applies to whichever tier pages FR-LP-7 emits.)*

### Behaviour

- **FR-LP-9** — A lesson plan can be **generated as a draft** from a selected
  curriculum node and big idea, then **modified**. Generation never overwrites
  edits made after it.
- **FR-LP-10** — A unit holds **many lesson plans**; each names its curriculum
  node(s) and its big idea.
- **FR-LP-11** — *(REWRITTEN — Change N)* The plan prints to a **1-to-4-page
  A4 portrait PDF** — the front page plus zero to three tier pages, per
  FR-LP-7 — and views as HTML.
- **FR-LP-12** — The front page carries, as printed text, the **citations** of
  everything the lesson connects to: curriculum node codes and titles, its
  topic, its big idea, its linked assessments (mini and/or final — FR-UA-8),
  and a reference to the marking matrix. *(REWRITTEN — Change F: "the marking
  grid" is now singular per unit, not per lesson. REWRITTEN — Change P: adds
  the topic citation, FR-TOP-9.)*
- **FR-LP-13** — Any page may carry **pasted images** (FR-IMG).
- ~~**FR-LP-14** — The Lessons tab provides a lesson index/list view~~
  **RETIRED — Change S.** A separate Lessons tab no longer exists; the
  combined Lessons & Topics view (FR-TOP-8) is now the one place every
  lesson's `number`, topic and big idea are listed. Every acceptance
  criterion this FR carried (AC-LP-5) moved to AC-TOP-6. *(FR-LP-15…17 below
  are unaffected — `Lesson.number` and its renumbering rule don't depend on
  which screen displays them.)*
- **FR-LP-15** — A lesson's `number` **is** the unit's teaching order. When
  lessons are **reordered** (from the combined Lessons & Topics view or
  elsewhere), numbers **renumber automatically** to stay unique and
  contiguous from 1 (INV-DM-32) — Luke never hand-edits a number to resolve a
  clash or a gap.
- **FR-LP-16** — Lesson numbers are what **print view citations use** to refer to
  a lesson from another document — the curriculum map's coverage chips, the
  Unit Assessment, the marking matrix. This is not a new mechanism: FR-TR-6
  and AD-12 already specify that cross-links render as human-readable
  citations, and "lesson numbers" is what that already means for a lesson —
  the number **alone**, never paired with a title a lesson doesn't have.
  Recorded here only so the combined Lessons & Topics view (FR-TOP-8) is
  understood as the place those numbers are authored, not as a second
  citation scheme.
- **FR-LP-17** — *(New — Change N)* The front page's print view page-count text
  (e.g. "page 1 of *N*") reflects the **actual number of pages the lesson
  emits** (FR-LP-7), never a hard-coded four. A lesson with no tiers reads
  "page 1 of 1"; one tier reads "page 1 of 2"; all three tiers reads "page 1
  of 4".
- **FR-LP-18** — *(New — Change Q)* The front page carries an optional
  freeform **Sidebar** region for miscellaneous notes — catch-up work,
  tangents, or leftover work carried over from another lesson. Plain text
  only: no images, no curriculum/big-idea/topic binding (AD-36). An empty
  sidebar renders **nothing** — no heading, no placeholder.
- **FR-LP-19** — *(New — Change Q)* The Sidebar prints on the **front page
  only**, when non-empty (OQ-DM-16). It never adds a page of its own and
  never changes FR-LP-17's page-count text.
- **FR-LP-20** — *(New — Change Y)* On the lesson plan **edit view**, the
  Big Idea box **always displays** the lesson's bound big idea — name plus
  a count of how many lessons in this unit share that same big idea (e.g.
  "Contested memory · 2 lessons") — never a hidden or empty-looking state.
  Reverses rev 9's mockup default of a collapsed/closed-looking box: closed
  meant "not pre-expanded into the full picker" (still correct, and
  unchanged by this FR — see rev 9's note), not "not shown." The box's
  picker, when invoked to *change* the binding, may still expand to list
  every big idea; the current binding and its count are never hidden behind
  that interaction. The count is derived (FR-BI-6's existing "every lesson
  bound to this idea" query, scoped to the current unit), not stored.

**Acceptance**
- **AC-LP-1** — A generated plan with all three tiers populated prints as
  exactly 4 A4 portrait pages, in tier order, with the correct three colours.
  *(Scope narrowed — Change N: previously every plan; see AC-LP-8…10 for the
  1/2/4-page fixtures.)*
- **AC-LP-2** — Page 1 carries all six of FR-LP-1…6 with nothing clipped.
- **AC-LP-3** — Edits made after generation survive a re-generate.
- **AC-LP-4** — A lesson displays its big idea, and appears under that idea in
  the big-idea list.
- ~~**AC-LP-5** — Opening the Lessons tab shows every lesson as a list~~
  **RETIRED — Change S**, superseded by AC-TOP-6 (the combined Lessons &
  Topics view).
- **AC-LP-6** — *(New — Change L)* Dragging (or otherwise moving) a lesson to
  a new position renumbers every affected lesson so the sequence stays unique
  and contiguous from 1 — no gaps, no duplicate numbers, and the change
  survives save → reopen.
- **AC-LP-7** — *(New — Change L; REWRITTEN — Change R)* A citation printed on
  another document (e.g. the curriculum map, the Unit Assessment) names a
  lesson by its current number **alone** (FR-LP-16); renumbering a lesson
  updates that citation on next render.
- **AC-LP-8** — *(New — Change N)* A fixture lesson with **zero** tiers
  populated prints exactly **1 page** — the front page only.
- **AC-LP-9** — *(New — Change N)* A fixture lesson with exactly **one** tier
  populated prints exactly **2 pages**, in INV-DM-5's fixed order.
- **AC-LP-10** — *(New — Change N)* A fixture lesson with **all three** tiers
  populated prints exactly **4 pages** — matching pre-Change-N behaviour.
- **AC-LP-11** — *(New — Change N)* The front page's page-count text (FR-LP-17)
  matches the actual emitted count for each of the AC-LP-8…10 fixtures — "page
  1 of 1", "page 1 of 2", "page 1 of 4" respectively.
- **AC-LP-12** — *(New — Change P)* A lesson's front page shows its topic
  above its big idea, and the topic named matches the topic its big idea is
  bound to (FR-TOP-3).
- **AC-LP-13** — *(New — Change Q)* A lesson with sidebar text prints it on
  the front page; a lesson with no sidebar text shows no sidebar region at
  all — no empty box, no heading. A fixture lesson with all three tiers
  populated **and** sidebar text still prints exactly 4 pages (AC-LP-10) —
  the sidebar never adds a fifth.
- **AC-LP-14** — *(New — Change Y)* Opening any lesson's edit view shows its
  Big Idea box with the bound idea's name and lesson count immediately
  visible, with no click or interaction required to reveal them. In a
  fixture unit where a big idea binds two lessons, both lessons' boxes read
  "· 2 lessons."

---

## FR-UA — Part 3 · Unit Assessment

*(New in this revision — Change E. A first-class part with its own document,
not a variant of the lesson plan: see AD-23 for the cardinality/links
rationale and the rejected alternative. Placed as Part 3, between the lesson
plan and the marking matrix, because the marking matrix now scores against
the Unit Assessment (Change F) — the same "hard edge, not preference"
ordering AD-14 already established for the big-idea list ahead of the lesson
plan.)*

- **FR-UA-1** — Each unit has **exactly one Unit Assessment** — a first-class
  document in its own right, distinct from the lesson plan. *(AD-23, INV-DM-18)*
- **FR-UA-2** — The Unit Assessment holds **exactly one final assessment**,
  three-tiered — Green/Blue/Orange, Pass/Intermediate/Advanced, the same fixed
  tiers as everywhere else (FR-SYS-6). *(INV-DM-24, INV-DM-25)*
- **FR-UA-3** — The Unit Assessment holds **many mini assessments**, each
  three-tiered in the same way as the final assessment. *(INV-DM-25)*
- **FR-UA-4** — A mini assessment **absorbs the existing thin `Assessment`
  entity**: it carries that entity's `id`, `name` and `weighting` unchanged,
  plus its own three-tiered content. *(REWRITTEN — Change I)* Its node linkage
  is **upgraded from the former entity's bare `nodeIds[]` to the qualified
  `coverage[]` shape** — the same `{ nodeId, coverage, note }` shape FR-UA-6
  already gives the Unit Assessment itself (AD-27). There is no second,
  competing assessment concept anywhere in the schema, and — as of Change I —
  no second coverage-link shape either. *(Extended — Change S: it also
  carries its own big-idea binding — FR-UA-13 — independent of the container
  document's.)*
- **FR-UA-5** — *(NARROWED — Change S)* The Unit Assessment carries a
  **mandatory big-idea binding for its final assessment specifically** — the
  same rule a lesson has under FR-BI-4/INV-DM-15. *(Previously read as
  binding the whole document, final and every mini alike; each mini
  assessment now carries its own — FR-UA-13, AD-37 — so a unit's several
  mini assessments are no longer forced under one shared big idea.)*
- **FR-UA-6** — The Unit Assessment carries **coverage-qualified curriculum
  links**, using the **same `coverage[]` shape** just added to `BigIdea`
  (FR-BI-7, AD-21) — `{ nodeId, coverage: "full" | "partial", note }`. The
  shape is reused, not reinvented.
- **FR-UA-7** — The Unit Assessment **links to everything**: curriculum nodes
  (via `coverage[]`), the big idea it is bound to, the lessons that reference
  it, and the marking matrix that scores it.
- **FR-UA-8** — A **lesson links to zero-or-more mini assessments and/or the
  one final assessment** — never to more than one final assessment, because
  only one exists. *(Luke: "One lesson plan may link to multiple mini
  assessments or link to the one big final unit assessment.")*
- **FR-UA-9** — The Unit Assessment prints to **A4 portrait**, the same rule as
  the lesson plan (AD-11, AD-23) — not landscape like the curriculum map, and
  not user-selectable like the matrix or crib sheet.
- **FR-UA-10** — The Unit Assessment renders as **SVG** and views as **HTML**,
  consistent with every other part (FR-SYS-2, FR-SYS-3).

- **FR-UA-11** — *(New — Change N, resolved 2026-08-19.)* A Unit Assessment
  component — the `finalAssessment` and each `miniAssessment` alike — prints
  as **one to four A4 portrait pages**: a front page always, plus one page per
  tier that has content. An empty tier emits no page, by the same test
  INV-DM-33 defines for a lesson. The schema is unchanged — all three tiers
  remain mandatory (INV-DM-1, INV-DM-25) — and rendering alone is conditional,
  reusing the lesson plan's tier-page path rather than a second
  implementation (SR-4). *(Luke, asked directly: "yes". Closes
  [OQ-19](CurriculumPreparation.arch.spec.md#open-questions); see AD-33.)*
- **FR-UA-12** — *(New — Change N.)* The page-count text on an assessment's
  front page states the actual count — "page 1 of 1", "page 1 of 2", "page 1
  of 4" — never a fixed four, mirroring FR-LP-17.
- **FR-UA-13** — *(New — Change S)* Each **mini assessment** carries its own
  **mandatory big-idea binding** (`miniAssessment.bigIdeaId`) — the same rule
  FR-BI-4/INV-DM-15 gives a lesson, independent of the final assessment's
  binding (FR-UA-5) and of every other mini assessment's. This is what lets
  a unit's several mini assessments place under their own, different topics
  on the combined Lessons & Topics view (FR-TOP-8) rather than all sharing
  whichever one topic the document-level binding used to point at (AD-37).

**Acceptance**
- **AC-UA-1** — A unit file containing two Unit Assessment objects, or two
  final assessments within one, is refused as invalid.
- **AC-UA-2** — A Unit Assessment with three mini assessments, each rendering
  all three tiers, prints without a missing or duplicated tier.
- **AC-UA-7** — *(New — Change N.)* A fixture final assessment with no tier
  content prints exactly 1 page reading "page 1 of 1"; with one tier, 2 pages;
  with all three, 4 pages — tier order unchanged in every case.
- **AC-UA-3** — A lesson can link to two mini assessments and, separately, to
  the final assessment, at the same time.
- **AC-UA-4** — A Unit Assessment cannot be created or saved without a
  big-idea binding for its final assessment; a mini assessment cannot be
  created or saved without its own big-idea binding either (FR-UA-13).
- **AC-UA-5** — A Unit Assessment's coverage set to `full` on one node and
  `partial` on another renders each distinctly, matching the convention
  already proven for `BigIdea.coverage[]` (AC-BI-6).
- **AC-UA-6** — The Unit Assessment prints as A4 portrait pages; a print job
  measured against a real sheet matches on page count and margins (AC-SYS-2's
  method, applied here).
- **AC-UA-8** — *(New — Change S)* Two mini assessments bound to different
  big ideas keep those independent bindings after save → reopen; deleting one
  mini assessment's big idea binding target is refused, naming the blocking
  mini assessment, the same refusal pattern as FR-BI-8.

---

## FR-MM — Part 4 · Marking matrix

*(Change F: the marking matrix is now **singular per unit**, paginated by
student, and scores against the Unit Assessment (FR-UA) rather than
individual lessons. This replaces the previously specced per-(student,
lesson) model — see AD-24 for the rationale and Luke's explicit rejection of
keeping per-lesson matrices alongside it.)*

- **FR-MM-1** — The matrix **reflects the same three tiers** as the Unit
  Assessment it marks (FR-SYS-6).
- **FR-MM-1a** — There is **exactly one matrix template** per unit, defining
  the criteria, tiers and draft scores that every student's page shares. Each
  student's page is a thin **instance** of it, carrying only that student and
  the numbers entered. *(AD-19, revised by AD-24)*
- **FR-MM-2** — The template provides **draft scoring for each tier**,
  pre-filled.
- **FR-MM-3** — That draft scoring is **editable — once, on the template**, and
  the change is reflected by every student page that has not overridden it.
- **FR-MM-4** — There is **exactly one marking matrix per unit**, **paginated
  by student** — one page per student, not one matrix per (student, lesson)
  pair. *(REWRITTEN — Change F; was "individual per student, per lesson".)*
- **FR-MM-4a** — With a class of thirty, there are **thirty student pages**
  within the one matrix — no lesson-level grouping to navigate through.
  *(REWRITTEN — Change F; was "navigates them by lesson, then student".)*
- **FR-MM-5** — **Grades are entered through the HTML page** (FR-SYS-3).
- **FR-MM-6** — The matrix is **saved as a basic spreadsheet** — plain CSV,
  openable in Excel/Numbers/Sheets with no add-in (AD-6).
- **FR-MM-7** — The matrix renders as SVG and prints to A4 in **either
  orientation**, remembered on the matrix.
- **FR-MM-8** — The matrix names, in print view, the **Unit Assessment (final or
  mini, as applicable), big idea and curriculum node(s)** it descends from.
  *(REWRITTEN — Change F; was "the lesson, big idea and curriculum node(s)".)*

### Scope axis — per-assessment vs full-unit *(New — Change T)*

- **FR-MM-9** — The matrix gains a second axis, orthogonal to the existing
  display-mode toggle (FR-MMB-26) and orientation (FR-MM-7): **scope**. Two
  values — **full-unit** (the existing behaviour: every criterion across
  every tier and every assessment, on one page per student) and
  **per-assessment** (only the criteria bound to one selected assessment —
  the final assessment or one specific mini assessment). Both scopes are
  available in **both edit view and print view** (class grid, per-student
  page, and the printed A4 output alike) — Change T does not make
  per-assessment a screen-only convenience. *(Luke: the matrix needs both "a
  per-assessment matrix (marking one assessment on its own) and a full-unit
  matrix (the whole unit aggregated)".)*
- **FR-MM-10** — **Roll-up rule.** A per-assessment matrix's totals are the
  same underlying arithmetic as the full-unit matrix (AD-MMB-5/FR-MMB-29),
  restricted to the criteria bound to that one assessment
  (`criterion.assessmentIds[]`, AD-MMB-3). A criterion bound to more than one
  assessment contributes its **full** mark to each assessment's own
  per-assessment subtotal, but only **once** to the full-unit total — the
  full-unit total is never a sum of the per-assessment subtotals, because
  that would double-count a shared criterion. Only the **full-unit** total is
  pinned to the tiered ceiling (FR-MM-11); a single assessment's own
  per-assessment subtotal is whatever share of the ceiling its bound
  criteria happen to carry, and is **not** separately constrained to any
  round number. *(FR-MMB-33…36, AD-MMB-14/15.)*

### Tiered-ceiling grading model — REVERSES OQ-MMB-8 *(New — Change U)*

*(Change U reverses the marking-matrix build spec's OQ-MMB-8, closed
2026-08-19 as "no normalisation — `maxScore` stays a raw mark, the unit
total is the raw sum." Luke has since explicitly decided otherwise. OQ-MMB-8
itself is left intact in `marking-matrix.build.spec.md` and marked
**superseded**, not deleted or reworded — see that file's §6.)*

- **FR-MM-11** — The full-unit marking matrix's total is **100**, reached by
  three cumulative tier ceilings: **Pass alone → maximum 50**; **Pass +
  Intermediate → maximum 75**; **Pass + Intermediate + Advanced → maximum
  100**. Equivalently, each tier carries a fixed **mark budget** — Pass 50,
  Intermediate +25, Advanced +25 — and a student's tier subtotal can never
  exceed that tier's own budget, by construction, because every criterion in
  a tier is allocated a share of that tier's budget (FR-MM-12) rather than
  an arbitrary teacher-chosen `maxScore`.
- **FR-MM-12** — **Allocation, not rescaling — the coordinating agent's
  reading, flagged as an assumption open to correction (see AD-40).** At
  **setup time** (Default Full mode — the template-editing phase, AD-MMB-13),
  the tool automatically **allocates** each tier's fixed budget across
  however many criteria currently exist in that tier — across whichever
  content descriptions and assessments those criteria happen to bind to —
  so each criterion's `maxScore` is set to its share of the budget, and the
  tier's criteria sum to exactly 50 / 25 / 25. This is allocation of a fixed
  budget among criteria at the point criteria are authored, **not**
  rescaling of a raw mark at grading time — a student's `awardedScore` is
  never divided, multiplied, or normalised after entry; only where each
  criterion's *ceiling* comes from has changed. Because 50, 25 and 25 are
  integers and this project scores in **half marks** throughout, the
  allocation is defined to always land exactly on 0.5 boundaries with no
  remainder lost (FR-MMB-37, INV-DM-38) — verified achievable for any
  criteria count, and demonstrated in the worked example at FR-MMB-37.
  Interactions this requirement resolves rather than glosses over:
  - **AD-MMB-5's "an unmarked criterion counts as zero" is unchanged.** The
    ceiling model changes only where a criterion's `maxScore` comes from
    (typically auto-allocated, occasionally overridden — FR-MM-12a); the
    zero-for-unmarked, full-`maxScore`-in-the-denominator rule for Data
    entry/Part of mode totals is exactly as it was.
  - **"Part of" mode's `possible`** (FR-MMB-30's per-cell `mark/possible`
    fraction) is unchanged in definition: "possible" is still literally that
    criterion's own `maxScore`, whatever value it currently holds — the
    ceiling model changes the typical *source* of that number, not the
    fraction's meaning.
  - **Per-assessment roll-up (FR-MM-10)** is unaffected by allocation: a
    per-assessment subtotal sums whichever allocated (or overridden)
    `maxScore`s its bound criteria carry; only the full-unit total is
    guaranteed to land on 100.
  - **FR-MM-12a** — A criterion's auto-allocated `maxScore` **may be
    manually overridden** in Default Full mode (FR-MMB-28 already permits
    direct editing there). Overriding **opts that criterion out of
    auto-allocation** (`allocationOverridden: true`, INV-DM-39): its
    `maxScore` stays exactly what was typed, and any later re-allocation in
    that tier (triggered by adding or removing a sibling criterion,
    FR-MMB-38) redistributes the tier's budget only across the
    **non-overridden** criteria remaining. If an override pushes a tier's
    total above or below its budget, the tier is shown as **unbalanced** —
    flagged visibly, never silently corrected or blocked — the same
    flag-not-truncate ethos as the crib sheet's page-cap overflow (AD-17).

### Setup print — REVERSES part of AD-MMB-11 *(New — Change W)*

- **FR-MM-13** — Printing is available for **both** matrix activities, not
  only Student data. *(Luke: "I want a clearer distinction in the marking
  matrix between setting the grades mode and entering student data mode.
  Both can be printed.")* Printing while Setup is active produces a
  **blank marking sheet** — every criterion and its allocated ceiling
  (FR-MM-12), grouped by tier, with no student's marks and no student's
  name filled in. Printing while Student data is active is unchanged from
  the existing per-student sheet. *(FR-MMB-43, AD-MMB-19)*

### Print header identity and unit-progress block *(New — Change AD)*

- **FR-MM-14** — The Student-data print sheet's header **identifies the
  sheet instead of counting its position**: it drops any page-number-of-N
  counter and shows the **student's name, the class/unit, and the
  assessment the sheet's criteria belong to** — under full-unit scope
  (FR-MM-9) that third element names the **scope itself** (the sheet covers
  every assessment); under per-assessment scope it names the **selected
  assessment**. *(Luke: "the 'page number of' is odd, pages of what? Make
  that a more useful bit of information.")* The Setup blank sheet (FR-MM-13)
  has no student to name; its header carries the class/unit and "Setup" in
  the identity element's place instead of an empty name field. *(AD-47,
  FR-MMB-44)*
- **FR-MM-15** — The Student-data print sheet gains an **auto-generated
  unit-progress block**: every assessment in the unit (the final assessment
  and all mini assessments), each with this student's own per-assessment
  subtotal (FR-MM-10) or a dash if unmarked, and a **unit total** at the
  bottom computed independently as the tiered-ceiling figure out of 100
  (FR-MM-11/AD-40) — never as a sum of the rows above it. Because a
  criterion may bind to more than one assessment (FR-MM-10), the rows do
  **not** sum to the unit total whenever any criterion is shared; rows and
  total are laid out so they are never read as a column and its sum, with
  no explanatory caption (SR-9). The block appears on the Student-data print
  path only — never on the Setup blank sheet — and always lists every unit
  assessment regardless of which scope is active, since its purpose is
  overall progress alongside whichever single assessment the page is
  narrowed to. *(Luke: "I want a auto-generated total list of assessments
  for the unit and the total score, with the total unit score at the
  bottom. So while the page displays marking criteria for that one specific
  student for that one specific assessment they can also see at a glance
  their overall unit progress.")* *(AD-47, FR-MMB-45)*

**Acceptance**
- **AC-MM-1** — Two students' pages within one unit's matrix export to a
  spreadsheet that opens cleanly in Excel and Numbers. *(REWRITTEN — Change F.)*
- **AC-MM-2** — Editing a tier's draft score changes that student's page and
  nothing else.
- **AC-MM-3** — Entered grades survive save → reopen and appear in the export.
- **AC-MM-4** — The matrix prints correctly in both orientations, and the
  choice survives save → reopen.
- **AC-MM-5** — Editing a draft score on the template changes it across every
  student page, without touching any entered grade.
- **AC-MM-6** — Thirty students are navigable as thirty pages, with no
  flat list of hundreds to scroll — the lesson-keyed navigation problem
  AD-19/OQ-13 raised no longer exists under Change F. *(REWRITTEN — Change F;
  was "thirty students across ten lessons … three hundred".)*
- **AC-MM-7** — *(New — Change T)* Switching a fixture from full-unit scope
  to a per-assessment scope, in both the class grid and a per-student page,
  shows only the criteria bound to the selected assessment, in both edit
  view and print view; switching back restores every criterion.
- **AC-MM-8** — *(New — Change T)* A criterion bound to two assessments
  contributes its full mark to each of their two per-assessment subtotals,
  and exactly once to the full-unit total — the full-unit total is not the
  sum of the two per-assessment subtotals when a shared criterion exists.
- **AC-MM-9** — *(New — Change U)* The worked example at FR-MMB-37 — 3 Pass,
  2 Intermediate and 4 Advanced criteria — allocates to exactly `[17, 16.5,
  16.5]`, `[12.5, 12.5]` and `[6.5, 6.5, 6.0, 6.0]`, summing to 50, 25 and 25
  respectively; a student scoring full marks on the Pass criteria only totals
  50/100; full marks on Pass + Intermediate totals 75/100; full marks on all
  three totals 100/100.
- **AC-MM-10** — *(New — Change U)* Overriding one Advanced-tier criterion's
  `maxScore` by hand, then adding a new Advanced-tier criterion, redistributes
  the Advanced budget only across the two non-overridden criteria (the
  original two 6.5/6.0 criteria plus the new one), leaving the overridden
  criterion's `maxScore` untouched; if the override alone exceeds the tier's
  25-mark budget, the tier renders a visible "unbalanced" flag rather than
  being blocked or silently corrected.
- **AC-MM-11** — *(New — Change W)* Printing while Setup is active shows
  every criterion's allocated ceiling and an empty score cell per
  criterion; no `awardedScore`, student name, or completion state appears
  anywhere on the page. Printing while Student data is active is
  unaffected — identical to AC-MM-4's existing behaviour.
- **AC-MM-12** — *(New — Change AD)* The Student-data print header for a
  full-unit-scope fixture reads the student's name, class/unit, and the
  scope's own label — no page-number-of-N string anywhere; switched to
  per-assessment scope, the same header instead names the selected
  assessment. The Setup blank sheet's header carries the class/unit and
  "Setup" in the same position — no empty name field renders.
- **AC-MM-13** — *(New — Change AD)* A fixture with one criterion bound to
  two of the unit's three assessments (1 final, 2 mini) prints a
  unit-progress block whose three assessment rows sum to **more than 100**
  while the unit total beneath them reads the independently-computed
  tiered-ceiling figure; the block's layout places the total in a visibly
  separate panel from the rows, with no on-page text explaining the
  mismatch. An unmarked assessment's row shows a dash. Switching the print
  scope from full-unit to a single assessment leaves the block listing all
  three assessments unchanged. The block never appears on the Setup blank
  sheet.

---

## FR-CS — Part 5 · Unit crib sheet

- **FR-CS-1** — Each unit has **exactly one crib sheet**: a **1 page A4**
  distillation of the unit. *(AD-19 — singular by schema, not by convention.
  Rev 6: Change K makes the sheet's internal layout a **required two-half
  structure** — see FR-CS-8…10, AD-29, AD-30. Change AC tightens the cap from
  1-or-2 pages to exactly 1 page — see FR-CS-12, AD-46.)*
- **FR-CS-2** — It **integrates the unit's big ideas and sub-big ideas**
  (FR-BI) into a single readable reference.
- **FR-CS-3** — It is generated as a **template** from the big-idea list, then
  freely edited — same generate-then-modify pattern as the lesson plan.
- **FR-CS-4** — It renders as SVG, views as HTML, and prints to A4 PDF in
  **either orientation**.
- **FR-CS-5** — Page count is **exactly 1** *(REVISED — Change AC, was "1 or
  2")* — a crib sheet that would run to a second page is not a crib sheet,
  and the tool says so rather than silently overflowing. See FR-CS-12 for the
  reversal and its rationale.
- **FR-CS-6** — It may carry **pasted images** (FR-IMG).
- **FR-CS-6a** — *(New — Change Z)* Section text supports **Markdown-style
  formatting**: `**bold**`, `*italic*`, and `- bullet` items. Unsupported
  Markdown syntax is treated as literal text. Plain text (no formatting) is
  always allowed (AD-43).
- **FR-CS-7** — It may cite the curriculum nodes and lessons behind each big
  idea (FR-TR-6).
- **FR-CS-8** — *(New — Change K)* The crib sheet is **required** to carry a
  **two-half structure**: an **upper half** and a **lower half**, each an
  ordered run of sections. The two halves are modelled **generically** — each
  section carries a `half` discriminator of exactly two values — never as
  hardcoded curriculum-specific names. The **curriculum profile** supplies the
  human-readable label shown for each half (e.g., for Victorian History v2.0,
  "Historical Concepts and Skills" for the upper half and "Historical
  Knowledge and Understanding" for the lower); a profile that supplies none
  falls back to a generic label. *(AD-29)*
- **FR-CS-9** — **Every crib-sheet section belongs to exactly one half** — a
  section cannot be unassigned and cannot straddle both. Luke assigns the half
  by hand when authoring or editing the section; it is never inferred from the
  big idea's own curriculum coverage. *(AD-29, INV-DM-31)*
- **FR-CS-10** — *(New — Change K; REVISED — Change AC)* FR-CS-5's **1-page
  cap applies to the whole sheet**, not per half. There is **no drawn fold**
  between the two halves *(REVISED — Change AC, was "the fold between the two
  halves is nominal, not fixed")* — the halves are ordered regions on one page
  flow, with no visual divider and no page break between them (a drawn fold
  that could force a page break made no sense once the sheet is capped at one
  page). If the sections assigned to one half would push the sheet past the
  cap, that is flagged exactly as any other overflow is (FR-CS-5, FR-CS-12,
  AD-17) — never silently cut. *(AD-30, amended by AD-46)*
- **FR-CS-11** — *(New — Change Z)* Each crib-sheet section is **individually
  resizable** within the sheet via a `size` field: `"small"` (compact form,
  ~75% height), `"medium"` (default, no size field needed), `"large"`
  (expanded form, ~150% height) — exactly three values, no scale or pixels
  (INV-DM-41, AD-43). Resizing does not auto-shrink or cut content to fit the
  page cap — a resized section that would push the sheet past the 1-page cap
  is **flagged**, matching FR-CS-5's philosophy (AD-43). *(Threshold revised
  — Change AC: was "past 2 pages"; see FR-CS-12.)*
- **FR-CS-12** — *(New — Change AC)* **The crib sheet is capped at exactly 1
  page — never 2.** This **reverses** FR-CS-1's and FR-CS-5's prior "1 or 2
  page" cap. Content that would spill onto a second page is **flagged**, in
  the same place and manner the 1-or-2-page cap was already flagging a third
  page (FR-CS-5, AD-17) — never truncated, never silently spilled to a second
  page. The two-half structure (FR-CS-8, FR-CS-9) is unaffected — sections
  still belong to exactly one half, upper above lower — only the drawn fold
  between them is removed (FR-CS-10) and the overflow threshold halves.
  Orientation (portrait/landscape, FR-SYS-4a) is unaffected. *(AD-46)*

**Acceptance**
- **AC-CS-1** — A crib sheet generates from a unit's big-idea list and prints
  to **exactly 1 A4 page**. *(REVISED — Change AC, was "to 1 or 2 A4 pages".)*
- **AC-CS-2** — Content exceeding **1 page** is flagged, not silently
  truncated or spilled onto page 2. *(REVISED — Change AC, was "exceeding 2
  pages … spilled onto page 3".)*
- **AC-CS-3** — Edits after generation survive a re-generate.
- **AC-CS-4** — Both orientations print correctly.
- **AC-CS-5** — *(New — Change K)* A crib sheet with sections assigned to
  both halves renders the upper half's sections above the lower half's, in
  edit view and print view, each half headed by the curriculum profile's label for it
  (or the generic fallback label when the profile supplies none), **with no
  drawn divider between them** *(REVISED — Change AC: the prior fold line is
  removed; see FR-CS-10, FR-CS-12)*.
- **AC-CS-6** — *(New — Change K; REVISED — Change AC)* A crib sheet whose
  sections would push the combined sheet past **1 page** is flagged —
  regardless of which half the overflowing sections belong to — and neither
  half silently spills onto a second page to hide it. *(Was "past 2 pages …
  neither half silently borrows page space from the other".)*
- **AC-CS-7** — *(New — Change Z; REVISED — Change AC)* A section is resizable
  through three explicit size options (small, medium, large); resizing a
  section to large that causes the sheet to exceed **1 page** surfaces a clear
  overflow flag, not an auto-shrink or silent truncation. *(Was "exceed 2
  pages".)*
- **AC-CS-8** — *(New — Change Z)* A crib-sheet section with formatted text
  (`**bold**`, `*italic*`, `- bullets`) renders the formatting correctly in
  both edit view and print view, and persists across re-generate.
- **AC-CS-9** — *(New — Change Z)* Unsupported Markdown syntax (e.g., headers,
  code blocks, links) in a section's text field is treated as literal text,
  not parsed or escaped specially.
- **AC-CS-10** — *(New — Change AC)* A crib-sheet mockup or rendered preview
  never shows a page-count string other than **"page 1 of 1"** — a mockup or
  render reading "page 1 of 2" (or any count other than 1) is a defect, not a
  valid state. The fold line between halves is never drawn — only an ordered
  boundary between the upper and lower halves' sections, with no dashed line,
  no `page-break-after`, and no visual page-break indicator of any kind.

---

## FR-RES — Part 6 · Resources page

*(New in this revision — Change H. Deliberately the loosest part in the
widget: a flat, ordered list the other five parts are not — see AD-25 for
the part itself and AD-26 for the restraint of leaving it unstructured.)*

- **FR-RES-1** — Each unit has **exactly one resources page**: a **flat,
  ordered list** of items Luke can add to. *(AD-25, INV-DM-18/30)*
- **FR-RES-2** — Each item is **exactly one kind** — `link`, `image`, or
  `text` (INV-DM-29). No tiering, no nesting, no curriculum-node binding, no
  big-idea binding, no coverage links (AD-26).
  - **FR-RES-2a** — A `link` item carries a URL and an optional display
    label.
  - **FR-RES-2b** — An `image` item **reuses the existing pasted-image model
    unchanged** — a real file in `images/`, referenced by id via the existing
    manifest (FR-IMG-2, FR-IMG-3, AD-15). Never a second image path, never
    base64. *(INV-DM-28)*
  - **FR-RES-2c** — A `text` item is a freeform block of text.
- **FR-RES-3** — Every item may carry an **optional note or caption**,
  regardless of kind.
- **FR-RES-4** — Items are **individually addable, editable and deletable**,
  at any time. There is no generate-then-modify step and no template to
  diverge from — unlike the lesson plan and crib sheet (contrast FR-LP-9,
  FR-CS-3), a resources item is authored directly.
- **FR-RES-5** — Items are **reorderable** — an explicit `order` field plus
  move-up/move-down controls, the same keyboard-equivalent convention as the
  coverage grid (OQ-18).
- **FR-RES-6** — The resources page carries **no curriculum-node binding, no
  big-idea binding, and no coverage links** — it is deliberately exempt from
  FR-TR's cross-part traceability and from FR-TR-8's gap-flagging. A resource
  is not accountable to either axis. *(AD-26)*
- **FR-RES-7** — The resources page prints to **A4 portrait** (FR-SYS-4a) and
  **flows to as many pages as its items need** — unlike the crib sheet's hard
  1-page cap *(REVISED — Change AC, was "1-or-2-page cap")* (FR-CS-5,
  FR-CS-12), there is no cap and no overflow warning.
- **FR-RES-8** — The resources page renders as **SVG** and views as **HTML**,
  consistent with every other part (FR-SYS-2, FR-SYS-3).

**Acceptance**
- **AC-RES-1** — A unit file containing two resources page objects is
  refused as invalid.
- **AC-RES-2** — A page holding a link item, an image item, and a text item
  together renders all three kinds distinctly, in edit view and in print view.
- **AC-RES-3** — Reordering an item survives save → reopen, and the print view
  order matches the edit view order.
- **AC-RES-4** — Deleting an item removes it from the page without deleting
  its underlying image file, when it is an image item (same rule as
  AC-IMG-5).
- **AC-RES-5** — A resources page with enough items to span 4 printed pages
  prints all 4 pages, with no cap warning and no truncation.
- **AC-RES-6** — An item with no note prints cleanly with no empty caption
  artifact; an item with a note shows it.

---

## FR-IMG — Cross-cutting · Pasted images

- **FR-IMG-1** — The user can **paste an image from the clipboard** into a
  lesson plan, a crib sheet, or a resources item, on the HTML page.
  *(REWRITTEN — Change H: extended to the resources page, FR-RES-2b.)*
- **FR-IMG-2** — Pasted images are **saved as files in the unit folder**, under
  `images/`. *(AD-15)*
- **FR-IMG-3** — `unit.json` holds a **manifest** of images — id, filename,
  dimensions — and documents reference images by id, never by embedded data.
- **FR-IMG-4** — Images render in the SVG and **print at usable quality**.
- **FR-IMG-5** — An image can be **placed, sized and removed**. No editing
  beyond that.
- **FR-IMG-6** — A **missing image file shows a visible placeholder**, never a
  silent blank — the unit folder can be moved or a file deleted outside the tool.
- **FR-IMG-7** — Deleting an image from a document leaves the file in place; a
  separate explicit action removes orphaned files. *Never delete a file the
  user might still want as a side effect of an edit.*

**Acceptance**
- **AC-IMG-1** — Clipboard paste produces a file in `images/` and renders it
  immediately.
- **AC-IMG-2** — The image re-renders after save → close → reopen.
- **AC-IMG-3** — The image prints legibly in the PDF.
- **AC-IMG-4** — Renaming the image file outside the tool produces a visible
  placeholder, not a blank.
- **AC-IMG-5** — Removing an image from a page does not delete its file.

---

## FR-TR — Cross-cutting · Traceability between the parts

- **FR-TR-1** — From a **lesson plan**, reach the **curriculum node(s)** it
  serves.
- **FR-TR-2** — From the **Unit Assessment** (final or a mini assessment —
  FR-UA), reach the **marking matrix** that scores it; from a **lesson plan**,
  reach the Unit Assessment component(s) it links to (FR-UA-8). *(REWRITTEN —
  Change F: retargeted from lesson↔matrix to assessment↔matrix, per AD-24.)*
- **FR-TR-3** — From a **curriculum node**, see and reach **every lesson
  serving it**, and see at a glance when none does.
- **FR-TR-4** — From the **marking matrix**, reach the **Unit Assessment** it
  scores and, through it, the curriculum node(s) (via `coverage[]`) and big
  idea being assessed. *(REWRITTEN — Change F: retargeted from lesson↔matrix
  to assessment↔matrix, per AD-24.)*
- **FR-TR-5** — The **assessment linkage** participates: lesson → **Unit
  Assessment** (final or mini, FR-UA-8) → the curriculum nodes (via
  `coverage[]`, FR-UA-6) and big idea (FR-UA-5) it covers.
- **FR-TR-5a** — From a **big idea**, reach **every lesson bound to it**
  (FR-BI-6); from a lesson, reach its big idea.
- **FR-TR-6** — **On paper, links become citations.** Every cross-link renders
  as human-readable text — codes, titles, big-idea names, lesson numbers,
  student names — sufficient to find the other document by hand.
- **FR-TR-7** — Links are **navigable in edit view** in the HTML view, in both
  directions, without a reload.
- **FR-TR-8** — A **broken or missing link is shown, not hidden** — an
  outcome no lesson covers, an outcome no big idea covers (the coverage gap
  introduced by Change C — same display convention as FR-CUR-7/FR-CUR-10,
  not a duplicate mechanism), an outcome the Unit Assessment does not cover
  (Change E, via `coverage[]` — same convention again), a big idea with no
  lessons, a mini or final assessment no lesson references. *(REWRITTEN —
  Change E/F: retires "a lesson with no grid" / "a grid whose lesson was
  deleted" — the marking matrix is no longer lesson-scoped, AD-24.)*
- **FR-TR-9** — *(New — Change I)* A content description that is **taught
  but not assessed**, **assessed but not taught**, or covered by **neither**,
  is **shown, not hidden** — extending FR-TR-8's convention to the two-axis
  gap Change I introduces, using the three named states from FR-BI-12.
- **FR-TR-10** — *(New — Change M)* Wherever a curriculum content-description
  **code** is displayed in edit view — a lesson plan, the Unit Assessment, the
  crib sheet, the marking matrix, or any other part — it renders as a
  **clickable control** that navigates to the curriculum map's coverage
  view, focused on that content description's row. This is **edit view
  only**; in print view, the same code renders as **plain text**, exactly as
  [AD-12](CurriculumPreparation.arch.spec.md#ad-12--cross-links-are-derived-on-screen-and-printed-as-citations)
  already specifies for every other cross-link (FR-TR-6) — Change M extends
  AD-12's screen/print split to codes specifically; it is not a second,
  competing rule. *(AD-32)* No new data is stored: the code→row target
  resolves from the existing node id the part already carries (`lesson.nodeIds[]`,
  `unitAssessment.coverage[].nodeId`, `miniAssessment.coverage[].nodeId`,
  `bigIdea.coverage[].nodeId` — [datamodel §1b](CurriculumPreparation-datamodel.spec.md#1b-the-link-graph)).
  No new reverse edge is added; INV-DM-12 is unchanged.
- **FR-TR-11** — *(New — Change M)* A code-click navigation **focuses** the
  target row — scrolled into view and visibly highlighted — and offers a
  **back affordance** returning to the document and position the user
  clicked from. A code on a lesson plan is a lookup, not a destination; the
  user must not be stranded on the coverage view. *(AD-32)*
- **FR-TR-12** — *(New — Change M)* Every part that renders a curriculum code
  (FR-CUR-5) — lesson plan, Unit Assessment, crib sheet, marking matrix, and
  any future part — renders it through **one shared code-rendering
  component**, not a per-part reimplementation (SR-4). Lands in the
  `traceability-links` build, wave 5.

**Acceptance**
- **AC-TR-1** — The full web is walkable in edit view: lesson → curriculum node →
  covering lessons; lesson → big idea → sibling lessons; lesson → Unit
  Assessment component → marking matrix → back to the Unit Assessment.
  *(REWRITTEN — Change F.)*
- **AC-TR-2** — The same relationships are legible in print view.
- **AC-TR-3** — An outcome with no lesson is visibly flagged on the map.
- **AC-TR-4** — A big idea with no lesson is visibly flagged.
- **AC-TR-5** — A mini or final assessment that no lesson references is
  visibly flagged. *(REWRITTEN — Change F; was "a lesson with no marking
  grid".)*
- **AC-TR-6** — Deleting a mini assessment (or the final assessment) that
  lessons still link to is refused, naming the blocking lessons — same
  refusal pattern as FR-BI-8. Deleting a lesson no longer touches the marking
  matrix, since a matrix instance carries no lesson reference (Change F).
  *(REWRITTEN — Change F.)*
- **AC-TR-7** — *(New — Change I)* A taught-but-unassessed content
  description, an assessed-but-untaught one, and one covered by neither, are
  each visibly flagged, **distinctly**, in edit view and in print view.
- **AC-TR-8** — *(New — Change M)* Clicking a curriculum code on a lesson
  plan, in edit view, navigates to the coverage view with that content
  description's row scrolled into view and visibly highlighted.
- **AC-TR-9** — *(New — Change M)* From the coverage view reached by a code
  click, a back affordance returns the user to the exact document and scroll
  position they clicked from.
- **AC-TR-10** — *(New — Change M)* The same lesson plan printed to PDF shows
  the code as plain text — not underlined, not coloured as a link, not
  clickable — confirming AD-12/AD-32's screen/print split holds for codes
  specifically.

---

## FR-GUIDE — Cross-cutting · The final widget guide

*(New in this revision — Change AB. A standalone Markdown reference
document, not a build and not one of the widget's six parts — see AD-45 for
the full rationale, including why an in-app screen was considered and
rejected. Its subject is the "through-themes" — Luke's own term — that no
single FR family states on its own because they only become visible once
several parts are read together.)*

- **FR-GUIDE-1** — The guide's audience is **whoever is using or maintaining
  the built widget** — Luke as the teacher using it, or an agent picking the
  project back up. It answers two questions a part-by-part spec reading does
  not: *if I change X here, what else changes?* and *where do I go to change
  Y?*
- **FR-GUIDE-2** — The guide is a **single Markdown file**, not code, not a
  `.dc.html` artboard, not rendered by `document-shell`, never printed, and
  **not counted among FR-SYS-2's six parts** (AD-45) — it lives at
  `System/Widgets/CurriculumPreparation/WidgetGuide.md`, alongside this
  project's other narrative documents, not inside a unit bundle.
- **FR-GUIDE-3** — The guide's content is organised **by through-theme, not
  by part** — the opposite axis from the PRD/data-model/arch/build specs —
  and must cover, at minimum, every through-theme identified so far:
  1. **Unit-code navigation** — a curriculum code clicked anywhere jumps to
     and highlights its row in Curriculum Coverage, with a back affordance;
     print stays plain text (AD-32, FR-TR-10…12).
  2. **Big idea and Topic editing authority** — which screen owns which
     write, and which appearances are read-only reflections or binding
     pickers rather than identity edits (AD-44's table, reproduced in full).
  3. **The shared visual vocabulary** — tier colours, coverage-cell states
     (full/partial/none), and completion states, as one settled table rather
     than re-derived per screen (AD-13c).
  4. **The six-parts-vs-cross-cutting distinction itself** — why Topics, the
     combined Lessons & Topics view, and traceability links are real,
     documented features that nonetheless don't count toward FR-SYS-2's six
     (AD-42, FR-TOP-8b) — a distinction a first-time reader of the specs
     would otherwise have to reconstruct from four separate decisions.
  5. **Why the marking matrix's unit-progress block doesn't sum to the unit
     total** — a criterion bound to more than one assessment (FR-MM-10) makes
     each assessment's own subtotal correct on its own, but the progress
     block's rows still add to more than the unit total beneath them
     (AD-47). A maintainer who touches the matrix's print layout, the
     assessment-binding rule, or the unit-total calculation, without
     knowing this, could "fix" the rows to sum — which would make each row
     wrong instead.
  A through-theme discovered later is added here the same session it's
  decided, the same discipline this project already applies to `registry.md`.
- **FR-GUIDE-4** — The guide is **kept in sync by hand, on every revision
  that touches a through-theme it documents** — the same standing rule that
  already governs `handoff.md` and `registry.md` for the project itself,
  applied one layer down to the product. A guide that contradicts the specs
  it summarises is worse than no guide, because it is trusted first.
- **FR-GUIDE-5** — The guide opens with a **short index**, near the top of
  the file: one line per through-theme, each line stating which parts that
  theme touches. A reader answers "does this affect me?" from the index
  alone, before reading any theme in full.
- **FR-GUIDE-6** — The guide carries one **change-to-screen map**: a table
  with one row per kind of change a maintainer might make (for example,
  "change a tier colour," "add a through-theme," "change what counts as a
  part"), naming the screen, file, or spec section that change is made in.
  This is a lookup table, not prose — a maintainer scans it instead of
  reading the whole guide to find where to act.
- **FR-GUIDE-7** — The index (FR-GUIDE-5) and the change-to-screen map
  (FR-GUIDE-6) are both **plain Markdown inside `WidgetGuide.md`** — a
  heading, a list, and a table. Neither is a build, a script, generated
  HTML, or a second file. FR-GUIDE-2's "single Markdown file, not code"
  rule applies to them exactly as it applies to the rest of the guide.
- **FR-GUIDE-8** — A guide entry counts as an **essential software
  decision**, and must be included, only if it passes this test: **a
  maintainer who does not know it will make a change that breaks something
  elsewhere, or will re-derive it wrong.** A decision that affects only the
  part that already states it fails this test and stays out of the guide —
  its own FR/AD is the right place for it. The guide never restates every
  AD; each entry names the AD it traces to and states, in one sentence, what
  breaks if a maintainer doesn't know it.

**Acceptance**
- **AC-GUIDE-1** — `WidgetGuide.md` exists, is organised by through-theme
  (FR-GUIDE-3's five, at minimum), and is not organised by FR family.
- **AC-GUIDE-2** — Every claim in the guide traces to a real ID (AD/FR/AC) in
  the PRD, data model, or arch spec — a self-audit checks for guide text with
  no matching ID, the same dangling-reference check already run on every
  spec revision.
- **AC-GUIDE-3** — FR-SYS-2's "six parts" count, checked against the guide's
  own explanation of what counts and what doesn't, agrees with the PRD's own
  statement of the six (no silent seventh-part drift).
- **AC-GUIDE-4** — A revision that adds or changes a through-theme (the next
  one, whatever it turns out to be) updates `WidgetGuide.md` in the same
  pass — checked the same way `registry.md`'s own currency is checked: no
  open revision leaves the guide stale.
- **AC-GUIDE-5** — The guide's index (FR-GUIDE-5) lists every through-theme
  the guide contains, in the same order they appear in the guide, and names
  the parts each one touches. The change-to-screen map (FR-GUIDE-6) names
  only screens, files, or spec sections that actually exist — checked
  against `_Builds/*.build.spec.md` on disk (currently eight: bundle-server,
  coverage-grid, document-shell, local-store, marking-matrix,
  resources-page, style-guide, unit-assessment-document) and against the
  PRD's Traceability table; a row naming a build spec that doesn't exist on
  disk fails this check.
- **AC-GUIDE-6** — Every guide entry traces to an AD and states, in one
  sentence, what a maintainer who doesn't know it would get wrong —
  checked against FR-GUIDE-8's inclusion test. An entry with no
  "what breaks" sentence fails this check.

---

## Traceability

| Part | FRs | Builds that carry them |
|---|---|---|
| System | FR-SYS-1…11 | `document-shell`, `local-store` |
| **Bundle** | **FR-BND-1…10** | **`bundle-template`, `bundle-server`, `style-guide`, `newunit-skill`** |
| Curriculum map | FR-CUR-1…12 | `curriculum-ingest` (Python), `curriculum-editor`, `arbor-tree` |
| **Topics** | **FR-TOP-1…11** *(FR-TOP-8/8a/8b — combined view + print — Change S/V)* | **`topics-list`** *(new — Change P; combined Lessons & Topics view — Change S; print view — Change V)* |
| **Big-idea list** | **FR-BI-1…14** | **`bigidea-list`** |
| Lesson plan | FR-LP-1…20 *(FR-LP-14 retired — Change S, moved to FR-TOP-8; FR-LP-20 — Change Y)* | `lesson-plan-document`, `lesson-plan-generator` |
| **Unit Assessment** | **FR-UA-1…13** | **`unit-assessment-document`** |
| Marking matrix | FR-MM-1…15 *(FR-MM-9…12 — scope axis + tiered-ceiling grading — Change T/U; FR-MM-13 — Setup print — Change W; FR-MM-14/15 — print header identity + unit-progress block — Change AD)* | `marking-matrix`, `csv-export` |
| **Crib sheet** | **FR-CS-1…12** *(FR-CS-6a, FR-CS-11 — resizable/formatted cards — Change Z; FR-CS-12 — 1-page cap reversal — Change AC)* | **`crib-sheet`** |
| **Resources page** | **FR-RES-1…8** | **`resources-page`** *(new — Change H)* |
| **Images** | **FR-IMG-1…7** | **`image-paste`** |
| Traceability | FR-TR-1…12 | `traceability-links` |
| **Final widget guide** | **FR-GUIDE-1…8** | *(no build — standalone document, AD-45)* |

Five ordering facts fall out of this table and are enforced in
[`_PLAN.md`](_PLAN.md):

- **`topics-list` must precede `bigidea-list`** — FR-TOP-3 makes the topic
  binding mandatory for every top-level big idea, so a big idea literally
  cannot exist first. *(New — Change P.)*
- `bigidea-list` **must precede** `lesson-plan-document` — FR-BI-4 makes the
  binding mandatory, so a lesson literally cannot exist first.
- `image-paste` **must precede** `lesson-plan-document`, `crib-sheet`, and
  `resources-page`, all three of which carry images (FR-LP-13, FR-CS-6,
  FR-RES-2b). *(Extended — Change H.)*
- **`unit-assessment-document` must precede `marking-matrix`** — the matrix
  now scores against the Unit Assessment (FR-MM-1, Change F, AD-24), so a
  matrix literally has nothing to score before the Unit Assessment exists.
  *(New in this revision — the same "hard edge" pattern as the big-idea/lesson
  ordering above.)*
- **`resources-page` has no build-order dependency at all** — it binds to
  nothing else in the schema (FR-RES-6, AD-26), so it can build in any wave.
  *(New — Change H; the loosest part in the widget is also the loosest in the
  build graph.)*
