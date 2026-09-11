---
description: Initialize a repo's spaces (README, Ideation) and the Specs folder structure (_Spikes, _Builds, _Refactors, _Changes) with _Done subfolders and initial plan documents; skips anything that already exists; offers to commit and push once done
allowed-tools: Bash(mkdir:*), Bash(ls:*), Bash(touch:*), Bash(git:*), Write, Read
---

Initialize this repository's structure per **MarkAs** file/folder
conventions, as scaffolded by **Synergy**. Create every missing piece
below; never overwrite or modify anything that already exists — this
command is idempotent and safe to re-run. If everything already exists,
say so and change nothing.

## 0. Detect an existing Utopia structure

Check whether the repository root already has a `Specification/` folder
(the Utopia PDLC phase folder — see the `utopia` skill). This is common:
`/utopia-init` is often run before `/synergy-init`.

- **If `Specification/` exists**: set `<SpecsRoot>` = `Specification/` for
  step 4 below. Utopia owns `Specification/` as the container for all
  spec-phase material, so the `_Spikes/_Builds/_Refactors/_Changes`
  scaffold nests inside it rather than sitting as parallel top-level
  folders. This is automatic — don't ask the user.
- **If it doesn't exist**: set `<SpecsRoot>` = the repository root (this
  command's original, pre-Utopia behavior).

This only affects step 4 (Specs folders) and the plan documents in step 5,
which live inside them. Steps 2 (README) and 3 (Ideation) always target
the repository root regardless — `README.md` and `Ideation/` are owned at
the Utopia root level (by the `readme` and `ideas` skills), not by
`Specification/`, even when Utopia is present.

## 1. Product name

Determine `<Product>`: use the name from an existing
`<Product>.product.spec.md` in the root if one exists, else use the repo's
folder name.

## 2. README.md

If `README.md` doesn't exist at the root, create it with this skeleton
(fill in `<Product>`):

```markdown
# <Product>

<Product> organizes its working knowledge as markdown files grouped into
purpose-built **spaces** — top-level folders in this repository, each
governed by its own method for what files live inside it and how they're
kept current.

This README is maintained by the `readme` method — see the `readme` skill.

## Spaces

No spaces exist yet.
```

If `README.md` already exists, leave it untouched — use the `readme` skill
to update it once spaces have been added or changed.

## 3. Ideation space

Create `Ideation/Ideas/`, `Ideation/Solutions/`, `Ideation/Features/`, and
`Ideation/Issues/` if missing (each with a `.gitkeep` if the folder would
otherwise be empty) — see `/ideas-init`, which does exactly this and can
be run instead of this step. Do not create `<Product>.problem.md`,
`<Product>.solution.md`, or any `.solution.md` / `.feature.idea.md` /
`.issue.md` file — those are populated by the `ideas` skill from real
notes, not scaffolded empty.

## 4. Specs folders

Create these folders **under `<SpecsRoot>`** (from step 0) if missing,
with a `.gitkeep` inside each `_Done/` so git tracks it:

```
<SpecsRoot>/_Spikes/_Done/
<SpecsRoot>/_Builds/_Done/
<SpecsRoot>/_Refactors/_Done/
<SpecsRoot>/_Changes/_Done/
```

Warning: on case-insensitive filesystems, check that no same-named folder
exists in another case before creating.

## 5. Plan documents (initial state)

Create each of the following, under `<SpecsRoot>`, **only if the file does
not exist**. Fill `<today>` with today's date.

### `<SpecsRoot>/_Spikes/SPIKE-PROJECTS.md`

```markdown
# Spike Projects

Date: <today>
Status: No spikes defined yet.

Candidate spike projects — research tasks that answer a technical question
(feasibility, ergonomics, performance). The answer is the deliverable; the
code may be discarded. Score by novelty and risk; timebox every spike.

| # | Spike | Question it answers | Risk (1–5) | Novelty (1–5) | Score |
|---|---|---|---|---|---|

Scoring: priority = 3 × novelty + 2 × risk. One folder per spike under
`_Spikes/<Name>/` (project spec, prerequisites spec, arch decisions,
supporting specs, `_PLAN.md`). Completed spikes move to `_Done/`.
```

### `<SpecsRoot>/_Builds/_PLAN.md`, `<SpecsRoot>/_Refactors/_PLAN.md`, and `<SpecsRoot>/_Changes/_PLAN.md`

Same skeleton for each, with the folder name, subtask-spec extension, and
subtask description substituted — builds: *new functionality*
(`<name>.build.spec.md`); refactors: *improve the codebase without changing
functionality* (`<name>.refactor.spec.md`); changes: *post-production
change requests* (`<name>.change.spec.md`):

```markdown
# <_FolderName> — Folder Plan

Date: <today>
Status: No subtasks yet.
Scope: implement all subtasks in this folder. Each subtask = one
`<extension>` spec (+ one `<name>.plan.md`). Completed subtasks move
(spec + plan) to [`_Done/`](_Done/).

## Decision gates (before any code)

None yet.

## Dependency analysis

None yet — analyse hard prerequisites, soft couplings (shared files to
sequence, shared vocabulary), and decision gates as subtasks are added.

## Order of work

| Wave | Subtask | Prereqs | Note |
|---|---|---|---|

## Completion protocol

A subtask is done when its plan's Verification passes in full (the
project's standard gates plus the subtask's own tests). Then:

1. `git mv` its spec and plan into `_Done/`.
2. Update the tracking table below (strike the row or annotate with the
   completing commit).
3. Re-check any `*.prerequisites.spec.md` that gates on it.

## Tracking

| Subtask | Status |
|---|---|
```

## 6. Report

Finish with a short report: what was created, what already existed and was
left untouched.

## 7. Offer to commit and push

Skip this step entirely if nothing was created (everything already
existed). Otherwise, offer to commit and push — ask, don't do it silently.
If accepted, stage everything created, commit with a message describing
the scaffold (README / Ideation / Specs folders, whichever applied), and
push to the tracked remote if one exists; if there's no remote, commit
locally and say so plainly.
