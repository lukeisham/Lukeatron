# arbor-tree — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-22 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 2 |
| **One-liner** | The curriculum map itself — a horizontal family tree, A4 landscape, root at the left fanning right, carrying the big-idea list and three independent coverage chip types on the same page. |

---

## 1. Motivation

This is the widget's **Part 1** — the printed document `curriculum-editor`
has no rendering path for. `AD-22` already settled the split precisely:
"the on-screen editor for `coverage[]` is a coverage grid... the print view
instead renders coverage as chips attached to their nodes on the existing
arbor tree." Five separate PRD changes (D, I, P, AH, and the original spec)
each added one more thing this one tree has to show — big-idea coverage,
assessment coverage, topic coverage, domain glyphs, lesson coverage — and
none of the previous four already-specced parts render any of them; this
build is where all five converge onto one page.

`DEPENDENTS.md` flags this build's layout algorithm as the project's other
genuinely novel piece of work, alongside `curriculum-ingest`'s parser: "a
horizontal family tree with no overlaps at print size." `_Notes/JS_suggestions.md`
already recorded the house guidance for it — freeze the layout as one pure,
thoroughly-tested function, and reach for a vendored implementation only if
writing one from scratch proves genuinely error-prone. This spec is written
against that guidance directly.

## 2. Scope

**In scope**
- Rendering the unit's curriculum tree — `strand`, `outcome`, `task` nodes
  — as a **horizontal family tree**: root at the left, descendants fanning
  right (`FR-CUR-3`).
- **A4 landscape** print output and an HTML view of the same tree
  (`FR-CUR-6`).
- Every node's `code` and `title`, shown **verbatim** from the source
  (`FR-CUR-5`, `INV-DM-2`).
- **Lesson coverage**: which nodes have at least one lesson serving them,
  which have none — derived fresh from `lesson.nodeIds[]` on every render,
  never stored (`FR-CUR-7`, `INV-DM-12`).
- Carrying the unit's **big-idea list** on the same page as the tree, so
  both organising axes are visible at once (`FR-CUR-8`).
- The curriculum's `description` prose, when set, rendered prominently at
  the head of the map — this build renders it; `curriculum-editor` owns
  the write (`FR-CUR-9`).
- **Three independent print-view chip types** on a node: big-idea coverage
  (full/partial, `FR-CUR-10`), assessment coverage (full/partial,
  `FR-CUR-11`), and topic coverage (full/partial, `FR-CUR-12`) — any
  combination of the three, shown or absent independently.
- The **domain glyph** — pencil for skill, notebook for knowledge, none
  when unset — preceding every rendered node code, sourced from
  `curriculum-editor`'s shared resolution function (`FR-CUR-13`).
- Rendering as SVG, viewing as HTML — consistent with every other part
  (`FR-SYS-2`, `FR-SYS-3`).

**Out of scope**
- **Editing anything.** No node CRUD, no big-idea CRUD, no coverage
  attach/detach of any kind. This build is a pure renderer over data three
  other builds own (`curriculum-editor`, `bigidea-list`, `coverage-grid`).
- **The coverage grid** — the editing surface for `bigIdea.coverage[]` —
  is `coverage-grid`'s own screen (`AD-22`). This build only reads what
  that grid (and the equivalent assessment/topic coverage edits) writes.
- **Node-level domain resolution logic** — `curriculum-editor`'s `FR-CEB-5`
  owns the ancestor-strand walk; this build calls it, never reimplements
  it (mirrors `AD-BI-2`'s established pattern).
- **The tree-layout algorithm as a general-purpose library** — the tidy-
  tree function this build produces is this project's own, frozen,
  unit-tested code (`_Notes/JS_suggestions.md`), not a package.
- Filesystem access of any kind — that is `bundle-server`, reached only
  through `local-store` (`AD-13`).

## 3. Requirements

> **Requirement family.** `FR-CUR-n` is the **PRD-level** family — the
> curriculum map's "Map" render half (`FR-CUR-3`, `FR-CUR-5…13`; ingest,
> `FR-CUR-1…1f`, and node editing, `FR-CUR-2`, belong to `curriculum-ingest`
> and `curriculum-editor` respectively). `FR-ATB-n` below is the
> **build-level** family, the same PRD/build split every other build in
> this folder uses.

- **FR-ATB-1** — Lays out the tree as a **horizontal tidy tree** — root at
  the left, children fanning right, no node overlap at realistic scale (a
  Victorian History-sized unit: ~2 strands, ~15 outcomes, several tasks
  each) — as one pure, frozen, unit-tested layout function (`FR-CUR-3`,
  `Q-4`).
- **FR-ATB-2** — Prints **A4 landscape**; views identically as HTML on
  screen — the one part of the widget with fixed landscape orientation,
  never user-selectable (`FR-CUR-6`, `AD-11`).
- **FR-ATB-3** — Renders every node's `code` and `title` verbatim — never
  reformatted, truncated, or re-cased (`FR-CUR-5`, `INV-DM-2`).
- **FR-ATB-4** — Computes **lesson coverage** per node — walking every
  `lesson.nodeIds[]` fresh on load, grouping by `nodeId` — and renders a
  covered node distinctly from an uncovered one, visible in both edit-
  view HTML and print view (`FR-CUR-7`, `INV-DM-12`).
- **FR-ATB-5** — Renders the unit's big-idea list on the same page as the
  tree, in whatever compact form keeps both legible together at the
  realistic scale `Q-4` measures (`FR-CUR-8`).
- **FR-ATB-6** — Renders `curriculum.description`, when set, prominently
  at the head of the map, above the tree; renders nothing when unset — no
  empty header box (`FR-CUR-9`, mirrors `FR-LP-19`'s "unset renders
  nothing" convention).
- **FR-ATB-7** — Renders a **big-idea coverage chip** on any node covered
  by one or more big ideas, full and partial visually distinct, citing
  the covering big idea(s) by name (`FR-CUR-10`, `FR-TR-6`, `AD-12`).
- **FR-ATB-8** — Renders an **assessment coverage chip**, independently of
  `FR-ATB-7`, on any node covered by the final assessment or a mini
  assessment (`unitAssessment.coverage[]` / `miniAssessment.coverage[]`),
  full/partial distinct, citing the covering assessment(s) by name
  (`FR-CUR-11`).
- **FR-ATB-9** — Renders a **topic coverage chip**, independently of
  `FR-ATB-7`/`FR-ATB-8`, on any node covered by a topic
  (`topic.coverage[]`), full/partial distinct, citing the covering
  topic(s) by name (`FR-CUR-12`). This chip is **display only** — it does
  not feed `FR-BI-12`'s taught/assessed gap comparison (`AD-35`).
- **FR-ATB-10** — Renders the **domain glyph** — pencil (skill), notebook
  (knowledge), or none (unset) — immediately before every rendered node
  code, sourced from `curriculum-editor`'s `FR-CEB-5` function. This build
  computes no domain logic of its own (`FR-CUR-13`, mirrors `AD-CEB-3`).
- **FR-ATB-11** — Persists nothing — this build is read-only over
  `local-store`'s already-loaded unit; it makes no write call of its own.
- **FR-ATB-12** — Uses **vanilla JS only** — no framework, no bundler, no
  package manager, no third-party library, including the tidy-tree layout
  itself (`FR-SYS-8`, `AD-13a`).
- **FR-ATB-13** — Renders the big-idea list (`FR-ATB-5`) as a **compact side
  panel beside the tree**, not a strip below it — using landscape's extra
  width and keeping the tree's own vertical run uninterrupted (`FR-CUR-8`,
  `OQ-ATB-1`, `AD-ATB-5`).

**Acceptance criteria**

- **AC-ATB-1** — A fixture tree of ~2 strands, ~15 outcomes and several
  tasks each lays out with **zero node overlap**, at print size, in
  landscape (`AC-CUR-1`, `Q-4`'s own measurement).
- **AC-ATB-2** — Every rendered node shows its verbatim source code —
  spot-checked against three fixture nodes with unusual formatting (e.g.
  embedded punctuation) to confirm no silent reformatting (`AC-CUR-1`).
- **AC-ATB-3** — A fixture with one covered and one uncovered node renders
  each visibly distinct, in edit view and print view (`AC-CUR-7`).
- **AC-ATB-4** — A fixture with a `description` set renders it at the head
  of the map; the same fixture's lesson plan, matrix, and crib sheet pages
  show no trace of it (`AC-CUR-9`, cross-checked against the already-
  specced sibling builds' own print output).
- **AC-ATB-5** — A fixture node covered `full` by one big idea and
  `partial` by another renders both chips distinctly; a node with no
  big-idea coverage renders visibly bare (`AC-CUR-10`).
- **AC-ATB-6** — A fixture node fully taught but unassessed shows only the
  taught chip; one assessed but untaught shows only the assessed chip; one
  both shows both — independently (`AC-CUR-11`).
- **AC-ATB-7** — A fixture node covered by a topic, with no big-idea or
  assessment coverage of its own, shows **only** the topic chip (`AC-CUR-12`).
- **AC-ATB-8** — A skill-domain node's code shows the pencil glyph, a
  knowledge-domain node's shows the notebook glyph, both on this build's
  tree — matching the same fixture `AC-CUR-13`/`AC-BI-10` already use on
  every other surface (`AC-CUR-13`).
- **AC-ATB-9** — Grepping this build for a domain-resolution walk
  independent of `curriculum-editor`'s `FR-CEB-5` returns nothing.
- **AC-ATB-10** — A physical or PDF-measured print test of the `AC-ATB-1`
  fixture records zero overlap, page box 297 × 210 mm (A4 landscape), and
  print body type at or above the 12pt (≈16px@96dpi) floor.

## 4. Prerequisites & dependencies

- **Required first:** [`curriculum-editor`](curriculum-editor.build.spec.md)
  — the node tree this build renders and its `FR-CEB-5` domain-resolution
  function; [`bigidea-list`](bigidea-list.build.spec.md) — the big-idea
  list `FR-ATB-5` renders and the `coverage[]` data `FR-ATB-7` reads;
  [`document-shell`](document-shell.build.spec.md) — the A4 landscape
  print chassis; [`local-store`](local-store.build.spec.md) — the read-
  only source of the already-loaded unit; [`style-guide`](style-guide.build.spec.md)
  — CSS tokens for node cards, chip colours, and glyphs (the Category-
  accent set and tier-adjacent tokens `AD-13c` already settles).
- **Choose-one:** none remaining. `G-9` (build the ingest at all) does not
  gate this build — it renders whatever `nodes[]` exists, from ingest or
  from `curriculum-editor`'s own manual entry path.
- **Coordinate-with:** `coverage-grid` — shares the coverage vocabulary
  (`full`/`partial`) and independently derives the same node→covering-
  big-ideas reverse index; per `_PLAN.md`'s own note, sequence rather than
  interleave the two builds' derivation code so they read identically.
  `unit-assessment-document` — not yet specced, but `FR-ATB-8` reads its
  `finalAssessment`/`miniAssessments[]` coverage links; confirm field-name
  agreement once that build lands, the same posture `coverage-grid`'s own
  `OQ-CG-5` already takes. `bigidea-list` — also the sole other caller,
  besides this build, of `curriculum-editor`'s domain-resolution function.

**Gate:** work may start once `curriculum-editor`, `bigidea-list`,
`document-shell`, `local-store` and `style-guide` are each specced and
their interfaces are settled. `Q-4` (tree layout legibility) is not a
Luke-dependent gate — per `_Builds/_PLAN.md`'s own note it "runs against a
synthetic fixture unit and is agent-runnable now" — `AC-ATB-1`/`AC-ATB-10`
are exactly how this build's acceptance tests answer it.

## 5. Decisions

- **AD-ATB-1** — *Decision:* the tidy-tree layout is written as **one
  pure function** — nodes and edges in, positioned rectangles out — kept
  under 150 lines (`CSS-1`-style discipline extended to JS), unit-tested
  against the fixture unit's real shape, and **frozen** once it passes: no
  further tuning without a new fixture that fails it first. *Rationale:*
  `_Notes/JS_suggestions.md`'s own guidance for this exact algorithm —
  "one pure function, thoroughly unit-tested against the fixture, never
  touched again" — written specifically because this is the project's one
  genuinely novel layout problem (`DEPENDENTS.md` row 3), and the house
  fallback (a small vendored tidy-tree snippet, provenance documented) is
  explicitly a last resort, only "if writing it from scratch proves
  error-prone." *Rejected:* reaching for a vendored tidy-tree
  implementation up front — skips the fixture-driven "does the simple
  version actually fail" step the project's own notes ask for first.
- **AD-ATB-2** — *Decision:* lesson coverage (`FR-ATB-4`) is a derived
  reverse index — walked fresh from every `lesson.nodeIds[]` on load,
  grouped by `nodeId` — never a stored per-node flag. *Rationale:* the
  same "derive, don't duplicate" discipline `INV-DM-12` applies to every
  other reverse edge in this schema, applied here to node→lessons instead
  of node→big-ideas. A stored flag would need updating on every lesson
  edit anywhere in the unit, a second source of truth for a fact three
  lines of derivation already answers correctly. *Rejected:* a cached
  `node.coveredByLessons` field, maintained incrementally — the same
  drift risk `AD-IMP-3` already rejects for the image-reference count, one
  layer over.
- **AD-ATB-3** — *Decision:* the three coverage chip types (big-idea,
  assessment, topic) are **visually and semantically independent** — each
  rendered by its own check against its own source array, never merged
  into one combined "covered" indicator or a single named state.
  *Rationale:* `AC-CUR-11`/`AC-CUR-12` both require a node to show any
  subset of the three chips — this is a different shape from `FR-BI-12`'s
  three *mutually exclusive* named gap states (taught/assessed/neither):
  here a node can show zero, one, two, or all three chips at once, so a
  single-state model would be actively wrong, not just a simplification.
  *Rejected:* collapsing to `FR-BI-12`'s three-state model for
  consistency with the coverage grid's gap display — would silently drop
  the topic chip's independence, which `AD-35` explicitly requires stay
  outside that comparison.
- **AD-ATB-4** — *Decision:* domain glyphs (`FR-ATB-10`) call
  `curriculum-editor`'s `FR-CEB-5` function; this build implements no
  ancestor-strand walk of its own. *Rationale:* identical reasoning to
  `AD-CEB-3` and `AD-BI-2` — a walk this cheap to write is exactly the
  kind two independent implementations quietly diverge on, and
  `curriculum-editor` is the natural, single owner since it owns `Node`
  itself. *Rejected:* implementing the walk here first, since this build
  is the first to actually need it rendered — the same inversion
  `AD-CEB-3` already rejects, a rendering build becoming the data-layer
  owner by accident of build order.
- **AD-ATB-5** — *Decision:* the big-idea list renders as a **side panel**
  beside the tree, not a strip below it, running the full height of the
  landscape page alongside the tree's horizontal fan. *Rationale:* Luke
  direct — landscape's extra width is there to be used, and a side panel
  keeps the tree's own vertical run intact rather than competing with it
  for space below. See `FR-ATB-13`, resolves `OQ-ATB-1`. *Rejected:* a
  strip below the tree — would compress the tree's usable vertical space
  on a unit with several tiers of descendants, the opposite of what
  `Q-4`'s legibility measurement is protecting.

**Open questions**

- **OQ-ATB-1** — Does the big-idea list (`FR-ATB-5`) render as a compact
  side panel beside the tree, or a strip below it? ✅ **RESOLVED
  (2026-08-29) — Luke direct.** A side panel beside the tree, using
  landscape's extra width and keeping the tree's own vertical run intact
  — see `FR-ATB-13`, `AD-ATB-5`.
- **OQ-ATB-2** — When a node carries all three coverage chips plus a
  domain glyph, does card width grow to fit, or do chips wrap/stack?
  ✅ **RESOLVED (2026-08-29).** Chips wrap onto a second line within a
  fixed-width card; the card does not grow — `AD-ATB-1`'s frozen tidy-
  tree layout assumes a stable node footprint, and a growing card would
  perturb its spacing calculations.
- **OQ-ATB-3** — Does the HTML edit-view tree support pan/zoom for a unit
  large enough to exceed the viewport, or does it rely on browser scroll
  alone? ✅ **RESOLVED (2026-08-29).** Browser scroll alone — no custom
  pan/zoom control, matching `FR-SYS-8`'s no-framework constraint and
  this project's general bias against building infrastructure a browser
  already provides.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| The tidy-tree layout overlaps nodes at realistic scale (the project's one genuinely novel algorithm, per `DEPENDENTS.md` row 3) | An illegible, unprintable curriculum map — the build's entire purpose fails | AD-ATB-1's fixture-first, freeze-once-passing discipline; vendoring considered only as a documented last resort | AC-ATB-1, AC-ATB-10 |
| Domain-glyph or lesson-coverage logic gets reimplemented locally instead of calling the shared functions | Drift between this build and `curriculum-editor`/`coverage-grid` — the same class of risk `AD-CEB-3`, `AD-BI-2`, `AD-BI-5` already name for their own pairs of builds | AD-ATB-2, AD-ATB-4 | AC-ATB-9 |
| The three coverage chips collapse into one merged indicator under implementation pressure ("simpler to render one badge") | Silently violates `AC-CUR-11`/`AC-CUR-12` and `AD-35`'s explicit topic-chip independence | AD-ATB-3 states the independence requirement explicitly | AC-ATB-6, AC-ATB-7 |
| Print body type ships below the 12pt (≈16px@96dpi) floor — the same recurring defect class already logged for the print mockups elsewhere (MinorTasks queue row 9, flagged in `lesson-plan-document.build.spec.md` and `crib-sheet.build.spec.md`) | A printed curriculum map with sub-floor type ships into production | This build's print CSS pulls `--font-size-print-*` only after `style-guide` has bumped it to the floor | AC-ATB-10 |
| Spec IDs or invariant names leak onto the rendered map (a stray "FR-CUR-10" in a chip tooltip) | SR-9 violated — developer-facing text reaches the teacher | Every requirement above names the visible behaviour, never the spec id; code review greps rendered strings | Manual check: no `FR-`, `AD-`, `AC-`, `INV-DM-` pattern in any rendered label or tooltip |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`curriculum-editor.build.spec.md`'s own §7). Not written yet.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-ATB-1…10 demonstrated
- [ ] AC-ATB-1/10: zero node overlap demonstrated and physically/PDF-
      measured at realistic fixture scale, in landscape
- [ ] AC-ATB-6/7: all three coverage chip combinations demonstrated
      independently, including a node with only the topic chip
- [ ] AC-ATB-9: no independent domain-resolution or lesson-coverage walk
      anywhere outside this build's calls into the shared functions (grep
      check)
- [ ] No spec id, invariant name, or requirement number ever rendered to
      the teacher using the widget (SR-9)
- [ ] Zero third-party dependencies; vanilla ES modules only (JS-7,
      FR-ATB-12) — including the tidy-tree layout itself
- [ ] Print body type measures at or above the 12pt (≈16px@96dpi) floor
- [ ] Makes no write call — read-only over `local-store`'s loaded unit

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
