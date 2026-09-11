---
description: Read-only integrity and pipeline-progress check over a product's Ideation/ space (per the `ideas` skill). Reports dangling links, orphaned files, naming violations, contradictions, untriaged notes, and undecided features as warnings (scoped to the active phase, per folder, wherever Ideas/Features/Issues have been phase-divided), and recommends the next pipeline command by name — or /ideas-phase if things look overwhelming. Makes no changes and never invokes another command itself.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(readlink:*), Read, Agent
---

Run a **read-only** integrity and pipeline-progress check over this
product's `Ideation/` space, per the `ideas` skill. Read
`~/.claude/skills/ideas/SKILL.md` first if it isn't already loaded this
session.

**This command never writes, edits, or deletes anything, and never runs
`/ideas-problem`, `/ideas-solution`, `/ideas-feature`, or
`/ideas-describe` itself.** Everything below is inventory, analysis, and
a report — checking, warning, and recommending, full stop. Acting on any
of it (fixing a dangling link, resolving an issue, deciding a feature's
`inclusion`/`status`, running the recommended next command) is a
separate, deliberate step the human takes afterward, not something this
command does on their behalf.

## 1. Inventory

Read everything in `Ideation/`: `<product>.problem.md`,
`<product>.solution.md` (and what it resolves to), every file in
`Ideas/` (unprocessed raw notes — including inside any `Phase<N>/`
subfolders), every `Solutions/*.solution.md`, every
`Features/*.feature.idea.md` (top level and inside any `Phase<N>/`
subfolders, with its `inclusion`/`status` frontmatter), every
`Issues/*.issue.md` (same — top level and inside any `Phase<N>/`
subfolders, with its `status` frontmatter), any raw notes still loose at
the `Ideation/` root from before `Ideas/` existed, and `PHASES.md` if it
exists.

For each of `Ideas/`, `Features/`, `Issues/`, separately note whether it
has been **phase-divided** — i.e. contains at least one `Phase<N>/`
subdirectory directly beneath it — per the `ideas` skill's "Phasing an
overwhelmed Ideation space." A folder can be divided while another isn't;
check each independently, don't assume.

## 2. Determine pipeline progress

Per the `ideas` skill's "Commands in this skill" pipeline order
(problem → solution → feature → describe), determine which steps are
done from what step 1 found:

- **Problem** — done if `<product>.problem.md` exists.
- **Solution** — done if `<product>.solution.md` exists *and resolves*
  (not dangling). Candidate files sitting in `Solutions/` with nothing
  chosen yet doesn't count — that's still "not done."
- **Feature** — done if at least one `Features/*.feature.idea.md` exists
  anywhere under `Features/` (top level or in any `Phase<N>/`
  subfolder).
- **Describe** — done if a file matching
  `Ideation/<product>.<kind>.description.md` exists (any `<kind>`).

Determine the earliest undone step in that order and **name** its
command (`/ideas-problem`, `/ideas-solution`, `/ideas-feature`,
`/ideas-describe`) for the report — don't run it. If every step is done,
note that plainly instead of manufacturing a recommendation.

## 3. Check for problems

Look for each of the following and note it for the report — **detection
only, no fixing, no filing**:

- A dangling `<product>.solution.md` symlink (target file doesn't
  exist), including whether exactly one solution file exists that it
  plausibly should point to.
- Orphaned files (e.g. a `.solution.md` in `Solutions/` with no content,
  a `0`-byte file).
- Naming-convention violations (e.g. wrong file extension chain for an
  otherwise well-formed feature idea; an item sitting inside something
  that looks like a phase folder but isn't named `Phase<N>/`).
- Untriaged raw notes in `Ideas/` (at its own top level — including
  anything left there deliberately because it spans phases, per the
  skill's `Ideas/` exception) that look old enough they should've been
  processed by now.
- Contradictions between two feature ideas, a feature idea that
  conflicts with the problem statement or chosen solution, or
  duplicate/near-duplicate features. Spotting a genuine contradiction is
  a judgment call — delegate this specific check to a **Fable**-backed
  subagent (`Agent` tool, `model: "fable"`, `subagent_type: "Plan"`,
  foreground), and tell it plainly that its job is to identify and
  describe candidate contradictions for a report, not to edit, resolve,
  or file anything — it has no write access regardless.
- Every `Features/*.feature.idea.md` still at `inclusion: proposed` or
  `status: pending` (per the `ideas` skill's "Feature idea frontmatter")
  — list them; don't ask the human to decide, that's a write operation
  this command doesn't do. **If `Features/` is phase-divided**, list
  individually only the ones in the active phase's `Phase<N>/` subfolder
  or at `Features/`'s own top level (untriaged); for every deferred
  phase, report just a count ("N more deferred to phase 2") — don't
  itemize what the human already chose not to look at right now.
- Every `Issues/*.issue.md` missing its `status` frontmatter (per the
  `ideas` skill's "Issue frontmatter") — list them.
- Every issue whose frontmatter `status` is `outstanding` — surface it
  in the report; don't attempt to resolve it here. Same active-phase
  scoping as features above, but using **`Issues/`'s own phase division**
  (which `Phase<N>/` subfolder the issue file is physically in) — the
  two folders can be divided differently or not at all, check each on
  its own terms.

Anything found in this step is **not** persisted anywhere by this
command — no new `Issues/<slug>.issue.md` gets written, no frontmatter
gets touched, nothing gets moved into a `Phase<N>/` subfolder. It exists
only in this run's report unless the human asks for it to be fixed, or
it's still there the next time `/ideas-check` runs.

## 4. Consider recommending `/ideas-phase`

**Only if no folder (`Ideas/`, `Features/`, `Issues/`) has been
phase-divided yet.** If step 3's undecided-feature count plus open-issue
count is large — roughly more than would fit in a couple of
`AskUserQuestion` batches — recommend `/ideas-phase` in the report, per
the `ideas` skill's "Phasing an overwhelmed Ideation space". This is a
recommendation only, same as the pipeline-progress one: name it, don't
run it. If at least one folder is already phase-divided, skip this —
phasing is already in use here, even if only partially.

## 5. Report

Present everything found, organized for someone to act on:
- The pipeline-progress recommendation from step 2 (command name only).
- Every problem from step 3 — file paths and enough detail to fix each
  one, grouped by kind (dangling links, orphaned files, naming issues,
  untriaged notes, contradictions, undecided features, missing issue
  frontmatter, open issues), respecting the active-phase scoping noted
  above and naming which folders are phase-divided vs. not.
- The `/ideas-phase` recommendation from step 4, if made.
- If nothing was found in a category, say so rather than omitting it
  silently — an empty check is still useful information.
- Close with an explicit line confirming no files were changed and no
  other command was run during this check.
