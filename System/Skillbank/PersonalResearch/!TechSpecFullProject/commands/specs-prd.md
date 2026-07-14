---
description: Generate a top-level PRD (<name>-PRD.spec.md) from a product or project description file, collaborating with the user as product owner. Looks in Ideation/ for Utopia repos, else the current folder, else asks.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git:*), Read, Write, Edit, AskUserQuestion, Agent
---

Draft a top-level PRD (`<name>-PRD.spec.md`, the `specs` skill's "Other
specs" type with topic `PRD`) from a raw product or project description.
Read `~/.claude/skills/specs/SKILL.md` first if it isn't already loaded
this session — this command produces one of its typed documents and
follows its conventions.

Throughout, the user is the **product owner**: you are drafting on their
behalf, not deciding on theirs. Surface assumptions and open questions
rather than resolving them silently.

## 1. Find the description file

- If this repo has an `Ideation/` folder (Utopia structure — see the
  `utopia` and `ideas` skills), look there first: check `Ideation/Ideas/`
  (the raw-notes inbox) for a file that reads as a product or project
  description, and also anything loose at the `Ideation/` root (older
  repos may still have raw material there). Don't confuse this with
  already-processed `ideas`-skill output (`<product>.problem.md`,
  `Solutions/*.solution.md`, `Features/*.feature.idea.md`) — those are
  synthesized documents, not the raw description you're looking for,
  though they're useful supporting context once found.
- Otherwise, look in the current folder for an obvious candidate (a
  README, a file named with "description," "brief," "overview," or
  similar, or the only prose document present).
- If nothing obvious turns up, **ask the user for the file path** —
  don't guess and don't scaffold a blank PRD from nothing.

Read the full file (and any supporting Ideation context found alongside
it) before drafting.

## 2. Draft with a Fable-backed subagent

Don't draft this yourself in the top-level session — **delegate the first
draft to a subagent**, via the `Agent` tool, with `model: "fable"` and
`subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 3 needs its output before
continuing). This follows this project's ideation→spec model policy:
Fable for ideation/spec-drafting steps, the top-level session's own model
for everything mechanical — drafting a PRD from a raw description is the
former, the highest-ambiguity step in this whole command. Give the
subagent the full description text (plus any supporting Ideation context
found in step 1) and ask it to return:

- **Overview** — what this product/project is, in a few sentences.
- **Motivation** — the problem it solves and why it matters now.
- **Goals** and **Non-goals** — explicit, not implied.
- **Target users** — who has the problem.
- **Requirements**, numbered `FR-PRD-n`, traceable per the specs skill's
  numbering convention.
- **Success criteria** — how you'd know this worked.
- **Open questions** (`OQ-n`) — anything the description doesn't answer,
  each with the default assumption the draft used so it can be reviewed.

## 3. Interview the product owner

Present the draft's open questions and any assumptions worth confirming
directly to the user — this is the cheapest point to correct direction.
Use `AskUserQuestion` when a question has concrete candidate answers; ask
in plain text when it doesn't. Update the draft with their answers before
finalizing. Don't leave `OQ-n` entries unresolved without the user having
seen them.

## 4. Name and place the file

- Derive `<name>` from the product/project name (ask if it isn't obvious
  from the description or the repo).
- Output path: `Specification/<name>-PRD.spec.md` if a `Specification/`
  folder exists at the repo root (Utopia layout); otherwise
  `<name>-PRD.spec.md` at the repo root, alongside where
  `_Spikes/_Builds/_Refactors/_Changes` would live. This is a top-level
  document — do not nest it inside a specific `_Spikes/<Name>/`,
  `_Builds/`, or `Projects/<name>/` folder; those are for work items that
  reference this PRD, not the PRD itself.

## 5. Write and report

Write the final file following the specs skill's document conventions:
numbered requirements, resolved open questions folded in (with the
resolution noted, not just the question deleted), cross-references as
relative markdown links. Report what was drafted, what the user resolved
during the interview, and what (if anything) is still open.

## 6. Commit

If this is a Utopia repo (has the phase-folder structure), follow the
`utopia` skill's auto-commit-and-push convention and its stated
exceptions (no remote, rejected push, etc.). Otherwise, offer to commit
rather than doing it silently.

## Handoff

This PRD is the whole-product or whole-project picture, not a subtask.
When the user is ready to turn part of it into implementation work, that
graduates to the `specs` skill's own workflow — typically a `_Builds/`
spec/plan pair (or a `_Spikes/` project if it's still a research
question) that references this PRD rather than duplicating it.
