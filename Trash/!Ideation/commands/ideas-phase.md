---
description: Interview the user to divide Ideas/, Features/, and/or Issues/ into Phase1/, Phase2/, ... subfolders when the Ideation space has gotten too large or contradictory to work through at once — per folder, independently (some but not all may be divided at any given time). Raw idea material that spans phases, or isn't cleanly triaged, stays at Ideas/'s own top level rather than being forced into a phase subfolder. Writes/updates Ideation/PHASES.md (phase order and which is active — not an item manifest). Also offers to promote the next phase to active once the current one is fully resolved.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git mv:*), Bash(mkdir:*), Read, Write, Edit, AskUserQuestion, Agent
---

Interview the user to split this product's `Ideation/` space into
**phases** — an ordered set of item groupings, worked one at a time —
when there's too much to sensibly decide on all at once. Read
`~/.claude/skills/ideas/SKILL.md` first if it isn't already loaded this
session, specifically "Phasing an overwhelmed Ideation space," which
this command implements.

Phase membership is **physical**: dividing a folder means moving its
items into `Phase1/`, `Phase2/`, ... subfolders directly beneath it —
`Ideas/`, `Features/`, and `Issues/` are divided **independently of each
other**; a run of this command might divide only one of them, leaving
the others exactly as they were. `PHASES.md` itself only records the
phase order and which one is active — it is not a manifest of which item
is in which phase (that's what the folders are for).

## 1. Inventory

Read every item that could be phased: raw notes in `Ideas/` (top level
and inside any existing `Phase<N>/` subfolders), every
`Features/*.feature.idea.md` (same — top level and any `Phase<N>/`
subfolders, and its `inclusion`/`status`), every `Issues/*.issue.md`
(same, and whether its `status` is `outstanding` or `resolved`), and
`Ideation/PHASES.md` if it already exists. For each of the three
folders, separately determine whether it's already phase-divided (has
at least one `Phase<N>/` subdirectory) — they can be in different
states.

## 2. Decide what this run is for

- **No folder is phase-divided yet, and `PHASES.md` doesn't exist** →
  this is a first phasing pass. Ask the user which folder(s) to divide
  now — `Ideas/`, `Features/`, `Issues/`, or more than one — rather than
  assuming all three; then go to step 3 for each folder chosen.
- **At least one folder is already divided, and every item in the active
  phase across all divided folders is resolved** (no
  `proposed`/`pending` features in any divided `Features/Phase<active>/`,
  no `outstanding` issues in any divided `Issues/Phase<active>/`) →
  **offer** to promote the next phase to active — just updating
  `PHASES.md`'s headers (`(active)` moves down, the old active phase
  becomes `(done)`), never moving files, since nothing needs to move
  when a phase is promoted. Ask, don't do this automatically, since
  declaring a phase done is the human's call. If they decline, stop here
  — nothing else to do this run.
- **A folder isn't divided yet, but the user wants to divide it now
  (either because they just said so, or because `/ideas-check`/
  `/ideas-fix` recommended it)** → go to step 3 for that folder,
  independent of the other two folders' state.
- **A divided folder has new items sitting unphased at its own top
  level** (new raw notes, new features from a later `/ideas-feature`
  run, new issues filed since the last phasing pass) → allocate just the
  unphased items in that folder, per step 4 below, leaving existing
  phase assignments untouched.
- **The human wants to re-do a folder's split from scratch** → confirm
  that's really the intent (this means moving everything in that
  folder's `Phase<N>/` subfolders back to its top level first), then
  proceed as a first pass for that folder only.

## 3. Optionally propose a starting grouping

For a first pass on a folder with a large pool, optionally delegate to a
**Fable**-backed subagent (`Agent` tool, `model: "fable"`,
`subagent_type: "Plan"`, foreground) to propose a candidate phase-1
grouping — foundational items, or the least contradictory subset — for
the human to react to rather than sort from a blank slate. This is a
starting point only; skip it for a small pool where sorting from scratch
is just as easy, and never treat its output as final.

## 4. Interview to allocate phase 1

Present the full unphased pool in the folder(s) being divided this run
(or the proposed grouping from step 3, if made) and ask which items
belong in **phase 1** — the one to work now. Use `AskUserQuestion` with
`multiSelect: true` when the pool is small enough to enumerate as
options; for a larger pool, discuss in plain text instead — the
structured-options UI doesn't scale to dozens of items. Handle each
folder being divided this run as its own allocation — an item in
`Features/` and an item in `Issues/` aren't competing for the same
"phase 1," each folder gets its own placement decision, even though both
end up under the same `PHASES.md` phase numbering.

**Everything not explicitly placed in phase 1 defaults to phase 2** — a
single deferred catch-all. Don't press the human to classify every
remaining item individually; naming what's urgent is enough. If they
want finer-grained phases (3+) instead of a flat "now vs. later" split,
that's their call too — accommodate it, but don't suggest it unprompted.

**The `Ideas/` exception.** When dividing `Ideas/` specifically: a raw
note, or a raw-notes subfolder (e.g. one Ulysses export group), only
moves into `Ideas/Phase<N>/` if it belongs cleanly to that one phase.
Anything that spans phases, or is too tangled to confidently assign,
**stays at `Ideas/`'s own top level** — don't force it into a subfolder,
and don't ask the human to arbitrarily pick one phase for it either;
flag it as "left at top level, spans phases" in the report instead. This
exception doesn't apply to `Features/` or `Issues/` — each item there is
already about one thing, so if one genuinely can't be assigned cleanly,
treat it as untriaged (top level) rather than picking arbitrarily, same
outcome as the `Ideas/` case but for a different reason.

## 5. Move the files and write `PHASES.md`

For each folder being divided this run, create `Phase1/` and `Phase2/`
(and further `Phase<N>/` as needed) directly beneath it if they don't
exist yet, and move each allocated item into the right one with `git mv`
(fall back to plain `mv` if this isn't a git repo, or the item is
untracked) — preserving the item's own filename, just relocating it.
Items left unplaced per the `Ideas/` exception, or genuinely still
untriaged, stay exactly where they are.

Write or update `Ideation/PHASES.md` — phase order and which is active,
no item listings (that's what the folders now are):

```markdown
# <Product> — Phases

## Phase 1 (active)

## Phase 2 (deferred)
```

A short one-line description per phase is fine if it helps orient a
reader, but isn't required. When promoting a phase (step 2's second
case), just rename the headers — don't touch any `Phase<N>/` folder.

## 6. Report

Summarize: what this run did (first pass on which folder(s), incremental
allocation, or a promotion), how many items landed in each phase per
folder, anything left at a folder's top level under the `Ideas/`
exception (and why), and which phase is now active. Mention that
`/ideas-check` and `/ideas-fix` will now scope their undecided-item
attention to the active phase only, independently per folder, wherever a
folder has been divided.
