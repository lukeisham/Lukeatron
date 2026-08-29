# curriculum-ingest — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-29 |
| **Status** | Draft — **PROVISIONAL**, contingent on Q-1 (awaiting Luke's review) |
| **Wave** | 2 |
| **One-liner** | The Python script that digests pasted plain-text curriculum into a best-effort `nodes[]` tree, flagging its own guesses so `curriculum-editor` knows where to look first. |

---

> **⚠️ PROVISIONAL SPEC.** This build is written against `G-9`'s "build it"
> default, but `G-9` is not yet closed: it is settled by **`Q-1`**, the
> spike question measuring whether plain-text ingest lands roughly 60% or
> more of nodes at the right depth with the right code/title against the
> real Year 10 History curriculum text (`AD-16`'s own stated threshold —
> "below roughly 60%, correcting costs more than typing"). If Q-1's
> measured accuracy comes in below that threshold, `G-9` closes as **drop
> the ingest** and this spec is retired unbuilt — curriculum nodes are then
> entered entirely by hand through `curriculum-editor`, which already
> supports building a complete tree from an empty `nodes[]`
> (`curriculum-editor.build.spec.md` `AD-CEB-1`) precisely so that branch of
> the project has a path with no ingest at all. This spec exists so the
> build is ready to start the moment Q-1 clears the bar, not so it is
> greenlit now.

## 1. Motivation

`FR-CUR-1` closes `G-1`: curriculum comes in as plain text dropped into an
ingest spot, digested by a Python script into `unit.json`'s canonical
`nodes[]` structure. `AD-16` sets the whole build's posture — "roughly
right, not exactly right" — because pasted curriculum text is always
somewhat malformed (a copy-paste from a PDF or web page) and a parser that
refuses ambiguous input is worse than useless. The value this build adds
over hand-entry is not perfection; it is a usable starting point plus an
honest signal — via `confidence` — of exactly which nodes need a second
look, so correction in `curriculum-editor` is "check the flagged rows,"
not "proofread everything."

That value proposition has a measured price of entry: `Q-1`. This build is
the direct implementation of `AD-16`'s threshold decision, and its spec is
written now, provisionally, so that a "yes" from Q-1 does not sit behind a
second round of spec-writing before code can start.

## 2. Scope

**In scope**
- A stdlib-only Python script (`ingest.py`, per the bundle layout already
  named in the arch spec, `arch.spec.md` line "ingest.py — plain-text
  curriculum digest, AD-16") that reads plain text from a bundle's
  `_ingest/` spot and writes a best-effort `nodes[]` tree into `unit.json`
  (`FR-CUR-1`).
- Heuristic structure detection: indentation depth, numbering patterns
  (e.g. `1.`, `1.2`, `1.2.3`), code-like tokens (e.g. `AC9HH1` \|
  `VCHHC121`-shaped strings), heading shapes (a short bolded/capitalised
  line followed by body text), and blank-line grouping — the same list
  `AD-16` names — combined into one node-kind classification (`strand` \|
  `outcome` \| `task`) and one parent/depth assignment per detected line
  or block.
- Per-node `confidence` scoring (`high` \| `low`) driven by those same
  heuristics, so every guess ingest makes is flagged rather than silent
  (`FR-CUR-1b`).
- `domain` guessing on `strand` nodes only, via the small keyword
  heuristic the data model already names (`"skills"` → `skill`;
  `"knowledge"`/`"understanding"` → `knowledge`; neither → unset),
  flagged `confidence: low` the same way any other guess is
  (data model, `Node.domain`).
- Curriculum profile support: a named, declarative adapter (field mapping,
  node-kind vocabulary, attribution) per known curriculum, **plus the
  generic profile that always exists** and structures any plain text
  against the canonical model with no bespoke adapter (`FR-CUR-1c`,
  `FR-CUR-1d`). This spec's first release ships the generic profile and
  one bespoke profile — Victorian (History) — per `G-6`'s closure
  (`AD-10`, arch `OQ-5`); no other curriculum gets a bespoke profile.
- Recording which profile a unit was imported under, plus the source's
  name, version, and attribution on the unit (`FR-CUR-1e`, `AD-8`).
- Tree-integrity enforcement on the digest's own output before it is
  written: exactly one root, no cycles, every non-root `parentId`
  resolves (`INV-DM-3`) — or the run fails loudly and writes nothing,
  never a partially-broken tree.
- Re-ingest (running the script again on a unit that already has nodes):
  additive merge or a separate staging area for review, never destroying
  existing work (`FR-CUR-1f`) — see `AD-CIB-3` for which of those two this
  build picks and why.
- Being invocable from inside the bundle with no network access and no
  third-party dependency (`FR-SYS-1`, `AD-13`).

**Out of scope**
- **Editing** whatever ingest produces — add, rename, re-parent, delete,
  correcting a low-confidence guess — is `curriculum-editor`'s job
  entirely (`FR-CUR-2`). This build never mutates `nodes[]` a second time
  after its own write; it has no "fix mode."
- **Rendering the tree** as the printed arbor tree — `arbor-tree`'s job.
  This build produces no printable page and touches no HTML.
- **An LLM call to parse the text** — explicitly rejected by `AD-16`
  itself (breaks `FR-SYS-1` offline and `AD-13`'s dependency ban).
- **Any curriculum profile beyond generic + Victorian** — a third bespoke
  profile is future work gated on its own demand, not this build.
- Filesystem access from the browser — this script runs server-side
  inside the bundle's Python half, reached the same way `bundle-server`
  already owns all filesystem I/O (`AD-13`'s tier boundary); this build
  does not reopen that boundary.

## 3. Requirements

> **Requirement family.** `FR-CUR-1…1f` is the **PRD-level** family for
> ingest specifically (`FR-CUR-2` onward belongs to `curriculum-editor`;
> `FR-CUR-3` onward mostly to `arbor-tree`). `FR-CIB-n` below is the
> **build-level** family, the same PRD/build split every other build in
> this folder uses.

- **FR-CIB-1** — Reads plain text from the bundle's `_ingest/` location
  and writes a digested `nodes[]` tree into `unit.json`, offline, using
  only the Python standard library (`FR-CUR-1`, `FR-SYS-1`, `AD-13`).
- **FR-CIB-2** — Classifies each detected line or block into a node
  `kind` (`strand` \| `outcome` \| `task`) and a `parentId` using a
  combination of indentation depth, numbering pattern, code-token shape,
  heading shape, and blank-line grouping (`AD-16`).
- **FR-CIB-3** — Preserves `code` and `title`/`text` **verbatim** from the
  source text for every node it creates — no rewriting, trimming beyond
  whitespace normalisation, or paraphrasing (`FR-CUR-5`, `INV-DM-2`).
- **FR-CIB-4** — Sets `confidence: low` on any node whose kind, parent, or
  code/title split the heuristics could not resolve with reasonable
  certainty; sets `confidence: high` on every other node it creates
  (`FR-CUR-1b`, `AD-16`).
- **FR-CIB-5** — For each `strand` node, guesses `domain` (`skill` \|
  `knowledge` \| unset) from a small keyword match against that strand's
  own title/text, flagging the guess `confidence: low`; never sets
  `domain` on an `outcome`/`task` node (data model `Node.domain`,
  `INV-DM-43`).
- **FR-CIB-6** — Supports more than one named curriculum profile — a
  declarative adapter (field mapping, node-kind vocabulary, attribution)
  — selectable per ingest run, **and** a generic profile that always
  exists and requires no bespoke adapter (`FR-CUR-1c`, `FR-CUR-1d`).
- **FR-CIB-7** — Records on the unit which profile it was imported under,
  and the source's name, version, and attribution (`FR-CUR-1e`, `AD-8`).
- **FR-CIB-8** — Validates its own output against `INV-DM-3` (exactly one
  root, no cycles, every non-root `parentId` resolves) before writing;
  refuses to write and reports the failure rather than persist a broken
  tree (`AD-CIB-2`).
- **FR-CIB-9** — Re-running against a unit that already has `nodes[]`
  **never destroys existing work** — no edited node's `title`/`text`/
  `domain`/`confidence` state is overwritten, and no existing lesson,
  big-idea, topic, or assessment reference is broken (`FR-CUR-1f`,
  `AD-CIB-3`).
- **FR-CIB-10** — Ships exactly two profiles at first release: generic and
  Victorian (History) — no other bespoke profile (`G-6`, `AD-10`, arch
  `OQ-5`).
- **FR-CIB-11** — Zero third-party dependencies; stdlib Python only,
  matching `bundle-server`'s own language constraint (`SR-2`, `PY-1`).

**Acceptance criteria**

- **AC-CIB-1** — Against the real Year 10 History curriculum text (the
  Q-1 fixture), at least ~60% of produced nodes have the right depth
  (kind/parent) and the right `code`/`title` when checked against a
  hand-built reference tree — **this is Q-1's own measurement,
  re-runnable as a regression check** (`AD-16`'s threshold).
- **AC-CIB-2** — Every node the script cannot resolve confidently is
  flagged `confidence: low`; every node checked correct in AC-CIB-1's
  reference comparison is `confidence: high` at a rate no worse than
  Q-1's measured precision (`FR-CUR-1b`).
- **AC-CIB-3** — Running the script on a fixture unit that already has
  hand-edited nodes (`edited: true`, `confidence` cleared) leaves those
  nodes' `title`, `text`, `domain`, and `confidence` untouched after
  re-ingest (`AC-CIB-9` below expands this).
- **AC-CIB-4** — Feeding the script a deliberately malformed fixture that
  would otherwise produce a duplicate root or a cycle causes it to refuse
  the write and report the violated invariant, leaving any prior
  `unit.json` unchanged (`INV-DM-3`).
- **AC-CIB-5** — A generic-profile fixture with no bespoke adapter still
  produces a valid, non-empty tree (`FR-CUR-1d`).
- **AC-CIB-6** — A Victorian-profile fixture produces nodes whose `code`
  values match the source curriculum's own numbering/coding scheme
  verbatim.
- **AC-CIB-7** — The unit's imported-profile record (name, version,
  attribution) is present and correct after ingest under both profiles
  (`FR-CUR-1e`).
- **AC-CIB-8** — A `strand` node whose title contains "skills" resolves
  `domain: skill`, `confidence: low`; a strand with neither keyword
  leaves `domain` unset; no `outcome`/`task` node ever gets a `domain`
  written directly (`FR-CIB-5`).
- **AC-CIB-9** — Re-ingest against a fixture unit with an existing lesson
  bound to a node (`lesson.nodeIds[]`) leaves that binding resolvable —
  the referenced node still exists with the same `id` — after the
  re-ingest completes (`FR-CUR-1f`, `INV-DM-4`).

## 4. Prerequisites & dependencies

- **Required first:** [`bundle-template`](bundle-template.build.spec.md)
  — the `_ingest/` spot and `unit.json` location this script reads from
  and writes to must exist. This build has no dependency on any other
  wave-2 build; it is the first wave-2 build to run, per `_PLAN.md`'s
  dependency graph (`curriculum-ingest` → `curriculum-editor` →
  `arbor-tree`).
- **Gating (content, not spec):** [`Q-1`](../_Spikes/CurriculumPreparation/CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)
  — the real Year 10 History curriculum text and its accuracy
  measurement. This spec is written provisionally *ahead of* that
  measurement so implementation can start the moment it clears; it is not
  a substitute for running Q-1.
- **Gating (decision):** `G-9` — build the ingest at all, or drop it. Default
  per `AD-16` is build it, **unless Q-1's accuracy comes in below ~60%**,
  in which case this spec is retired and `curriculum-editor`'s
  build-from-empty path (`AD-CEB-1`) becomes the sole entry point for
  curriculum nodes.
- **Coordinate-with:** [`curriculum-editor`](curriculum-editor.build.spec.md)
  — the sole consumer of this build's output, and the build that clears
  `confidence` on edit (`FR-CEB-4`) and owns the `edited`/`original`
  snapshot discipline (`FR-CEB-2`) this build's re-ingest rule
  (`FR-CIB-9`) must not fight. See `OQ-CIB-1` below, which settles this
  build's side of `curriculum-editor`'s own `OQ-CEB-1`.
- **Coordinate-with:** [`bundle-server`](bundle-server.build.spec.md) —
  this script runs inside the bundle's Python half `bundle-server` also
  occupies; no filesystem boundary is crossed from the browser side
  (`AD-13`), and both builds share the "stdlib only" constraint (`PY-1`).

**Gate:** work may start once `bundle-template` is specced and its
`_ingest/`/`unit.json` layout is settled **and** `Q-1` has measured
≥~60% accuracy against the real curriculum text, closing `G-9` as "build
it." If Q-1 comes in below that threshold, this spec is retired instead
of started.

## 5. Decisions

- **AD-CIB-1** — *Decision:* this spec is written and reviewed now,
  provisionally, ahead of Q-1's measurement, rather than waiting for Q-1
  to close before drafting begins. *Rationale:* Luke's explicit
  instruction (rev 13/14 handoff) — spec it provisionally so the build is
  implementation-ready the moment Q-1 clears the bar, rather than adding a
  second round-trip of spec review after the measurement lands.
  *Rejected:* leaving `curriculum-ingest` unspecced until Q-1 closes, as
  every prior revision of `_PLAN.md` through rev 13 deliberately did —
  correct for those revisions, superseded by this explicit instruction.
- **AD-CIB-2** — *Decision:* the script validates its own output against
  `INV-DM-3` before writing, and refuses to write (reporting which
  invariant would break) rather than ever persisting a tree with more
  than one root, a cycle, or an unresolved `parentId`. *Rationale:*
  `curriculum-editor`'s own `AD-CEB-1`/`AD-CEB-3` assume they open a tree
  that is *already valid* per `INV-DM-3` — "this build does not require
  ingest to have run, only that if it did, its output is a valid,
  resolvable tree." A digest that writes a broken tree would silently
  violate that assumption and corrupt every downstream build reading
  `nodes[]`. *Rejected:* writing best-effort output even when it breaks
  `INV-DM-3`, on the theory that `curriculum-editor` could repair it
  afterwards — `curriculum-editor.build.spec.md`'s `AD-CEB-3`/`FR-CEB-3`
  refuse to *open* an operation that would create such a state; there is
  no repair path for a tree that arrives already broken, only for edits
  made to a tree that started valid.
- **AD-CIB-3** — *Decision:* re-ingest is an **additive merge**, not a
  separate staging area: new nodes the current text implies but the tree
  lacks are added; nodes already present (matched by `code`, the one
  field guaranteed verbatim-stable across runs) are left untouched if
  `edited: true`, and only have their guessed fields (`title`/`text`/
  `confidence`/`domain`) refreshed if still `edited: false`. *Rationale:*
  `FR-CUR-1f` offers exactly this choice — "merges additively or writes
  to a separate staging area for review" — and arch `OQ-10` leaves it
  open, noting "additive merge... is easier to guarantee than to design a
  good staging UI for." A staging area needs a UI surface this build does
  not own (that would be `curriculum-editor`'s), so additive merge is the
  only option this build can deliver standalone. *Rejected:* a staging
  area for review — correct instinct per arch `OQ-10`, but it requires
  `curriculum-editor` UI this build cannot build unilaterally; deferred
  to a future revision if additive merge proves confusing in practice.
- **AD-CIB-4** — *Decision:* node matching across a re-ingest run keys on
  `code`, not on any generated `id` or on text similarity. *Rationale:*
  `code` is preserved verbatim per `FR-CUR-5`/`FR-CIB-3` and is the one
  field the source curriculum itself guarantees stable across two pastes
  of the same document — an `id` is internal and regenerated per run
  unless matched first, and text similarity is exactly the kind of fuzzy
  heuristic `AD-16` already accepts imperfection in, which would make
  re-ingest matching itself another confidence-flagged guess. *Rejected:*
  matching by generated `id` (there is no way to recover which old `id` a
  freshly parsed line corresponds to without a match step already having
  run); matching by title/text similarity (works for `code`-less generic
  content but is strictly weaker than an exact `code` match wherever one
  exists, and this build's Victorian profile always has one).

**Open questions**

- **OQ-CIB-1** — Once `curriculum-editor` clears a node's `confidence` on
  edit (`FR-CEB-4`), can this build's re-ingest ever re-populate that
  node's `confidence` or overwrite its `domain`/`title`/`text`? *Default:*
  **no** — this is the same question `curriculum-editor.build.spec.md`'s
  `OQ-CEB-1` asks from the editor's side, and both specs default to the
  same answer for the same reason: `FR-CUR-1f`'s "ingest never destroys
  existing work" and the data model's "cleared on first edit... the
  parser's opinion of it is stale" together foreclose it — an edited node
  is `AD-CIB-3`'s untouched case, full stop, regardless of what the
  current source text now says. If this default is ever revisited, both
  specs must change together.
- **OQ-CIB-2** — Should the accuracy threshold (`AD-16`'s ~60%) be
  re-measured automatically on every future change to the heuristics, as
  a regression gate, or only measured once by Q-1 and then trusted?
  *Default:* trusted after Q-1 — AC-CIB-1 doubles as a regression check
  any future revision of this build can re-run against the same fixture,
  but nothing in this spec makes that re-run automatic or blocking; that
  would be a `!ReviewPlan`-adjacent tooling decision outside this build's
  scope.
- **OQ-CIB-3** — If Q-1's fixture text (Year 10 History) and a future
  second curriculum both exist by the time this build starts, should
  Victorian-profile heuristics be tuned against one and validated against
  the other, or both used for tuning? *Default:* tune against the primary
  Q-1 fixture only; a second curriculum, if and when it exists (arch
  Q-1b), is validation, not tuning input — avoids overfitting the
  heuristics to a single sample.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Q-1 measures below ~60% but this spec gets built anyway out of momentum | `AD-16`'s whole rationale — "editor alone is the product" below threshold — is violated; effort spent on a build that should have been dropped | `G-9`'s gate stays explicit in `_PLAN.md` and this spec's own top banner; build start is conditioned on Q-1's number, not on the spec merely existing | Manual check: Q-1's recorded accuracy number is ≥~60% before any implementation ticket opens |
| The digest writes a tree that violates `INV-DM-3` | Every downstream build (`curriculum-editor`, `arbor-tree`, `bigidea-list`'s domain union) inherits a corrupt tree with undefined behaviour | AD-CIB-2 — validate before write, refuse and report rather than persist | AC-CIB-4 |
| Re-ingest silently overwrites a hand-edited node | `FR-CUR-1f` broken; Luke's correction work is destroyed by the exact tool meant to save him typing | AD-CIB-3's `edited`-gated merge; FR-CIB-9 states it explicitly | AC-CIB-3, AC-CIB-9 |
| Re-ingest matching drifts from `code`-based to something fuzzier as heuristics evolve | Nodes silently duplicate or silently merge across runs, both of which are worse than the confidence flag this build exists to provide | AD-CIB-4 fixes the match key; code review checks any new matching logic against it | Manual check: no matching path added that does not key on `code` first |
| `domain` guessing over-guesses on strand titles with incidental keyword matches (e.g. "Skills for Life" as a strand name in a non-skills sense) | A wrong-but-`confidence: low` domain glyph shows on every descendant node until corrected — misleading but not silent, since it is flagged | FR-CIB-5's `confidence: low` flag on every domain guess, no exception | AC-CIB-8 |
| A third bespoke profile gets added ad hoc without going through `G-6` | Scope creep past the closed decision gate; profile-specific logic accumulates untested | FR-CIB-10 caps the shipped set at two; a third profile requires reopening `G-6` | Manual check: exactly two profile modules present in the codebase |

## 7. Plan

Deferred, pending spec review — matching this project's standing
"spec-then-plan" discipline (see `style-guide.build.spec.md`'s and
`bigidea-list.build.spec.md`'s own §7). Not written yet, and — per this
spec's own provisional status — not to be written until `Q-1` has closed
`G-9` in the "build it" direction.

## 8. Verification — definition of done

- [ ] **Gating criterion, checked first:** `Q-1`'s measured accuracy
      against the real Year 10 History curriculum text is **≥~60%** of
      nodes landing at the right depth with the right code/title,
      measured by running this build's ingest against that text and
      diffing the resulting `nodes[]` tree against a hand-built reference
      tree for the same document (node-for-node match on `kind`,
      `parentId` depth, `code`, and `title`) — the pass rate across all
      nodes in the reference tree is the Q-1 number. If this criterion is
      not met, `G-9` closes as "drop it" and every item below is void —
      this build is not completed, it is retired.
- [ ] All acceptance criteria AC-CIB-1…9 demonstrated
- [ ] AC-CIB-1: Q-1's accuracy measurement reproduced as a regression
      fixture, re-runnable against future heuristic changes
- [ ] AC-CIB-4: a malformed fixture that would break `INV-DM-3` is
      refused, with no partial write to `unit.json`
- [ ] AC-CIB-3/AC-CIB-9: re-ingest against a fixture with hand-edited
      nodes and an existing lesson binding leaves both untouched and
      resolvable
- [ ] AC-CIB-5/AC-CIB-6: both shipped profiles (generic, Victorian)
      produce valid trees from their own fixture text
- [ ] Zero third-party dependencies; stdlib Python only (`PY-1`,
      `FR-CIB-11`)
- [ ] Runs fully offline, no network access attempted (`FR-SYS-1`)

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
If instead `Q-1` closes `G-9` as "drop it," this spec is retired rather
than completed: mark Status "Retired — G-9 closed drop," leave it in
`_Builds/` (not `_Done/`) as a record of the provisional design, and
update `_PLAN.md` to remove `curriculum-ingest` from the active build
count, noting `curriculum-editor`'s build-from-empty path as the sole
remaining entry point for curriculum nodes.
