---
description: Draft (or refine) the problem statement from a pitch given as command arguments, fleshed out by interviewing the user and written to <product>.problem.md, then generate candidate solutions against it in Solutions/*.solution.md and prompt the user to review and run /ideas-solution next.
argument-hint: <a description of the problem>
allowed-tools: Bash(ls:*), Bash(find:*), Bash(mkdir:*), Bash(touch:*), Read, Write, Edit, AskUserQuestion, Agent
---

Turn a problem pitch given as arguments to this command into the `ideas`
skill's `<product>.problem.md`, then propose candidate solutions against
it. Read `~/.claude/skills/ideas/SKILL.md` first if it isn't already
loaded this session — this command writes its files and follows its
conventions.

## 1. Ensure scaffolding

Before anything else — before even taking the pitch — idempotently
create `Ideation/Ideas/`, `Ideation/Solutions/`, `Ideation/Features/`,
and `Ideation/Issues/` if any are missing (the same folders `/ideas-init`
creates; leave any that already exist untouched). This command may be
the very first thing run in a fresh Ideation space, and the problem/
solution steps below assume these folders exist.

## 2. Take the pitch

`$ARGUMENTS` is the user's own description of the problem — it can be as
short as one line. If it's empty, ask for it before doing anything else;
there's nothing to flesh out otherwise.

## 3. Read existing context

- Every raw note in `Ideation/Ideas/` (and anything loose at the
  `Ideation/` root from before that folder existed) — the pitch may not
  repeat detail already sitting in the raw notes.
- `<product>.problem.md`, if it already exists. If so, this is a
  refinement, not a first draft: treat the pitch as new or clarifying
  input to merge in, not a blank-slate rewrite. If it looks like it
  contradicts the existing framing rather than extending it, flag that
  to the user before overwriting anything.
- Every existing `Solutions/*.solution.md` — so newly generated
  candidates don't just restate ones that already exist.

## 4. Interview to flesh out the problem

Ask the user directly about whatever the pitch leaves underspecified:
who has this problem, why it matters now, and any non-goals or scope
boundaries it implies. Use `AskUserQuestion` when there are concrete
candidate answers; plain text otherwise. This is the cheapest point to
correct direction, before solutions get proposed against the wrong
framing.

## 5. Draft the problem statement and propose solutions with a Fable-backed subagent

Don't do this yourself in the top-level session — **delegate it to a
subagent**, via the `Agent` tool, with `model: "fable"` and
`subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 6 needs its output). Resolving
what the real problem is from a pitch plus interview answers, and then
proposing genuinely distinct solutions against it, is the highest-
ambiguity work in this command — the same tier the `ideas` skill's own
steps 2 and 3 already reserve for Fable.

Give the subagent the pitch, the interview answers, the raw notes, the
existing problem statement (if any), and the existing solution files (if
any), and ask it to return:
- The **problem statement**: the problem, who has it, why it matters now,
  and any non-goals — merged with the existing `<product>.problem.md` if
  one exists, not written from scratch over it.
- **2–4 genuinely distinct candidate solutions** against that problem
  statement — not variations on one idea, and not restatements of
  solutions that already exist in `Solutions/`. Each: approach, key
  tradeoffs, and why it would or wouldn't work given the problem.

## 6. Write the files

- Write (or update) `<product>.problem.md`.
- Write each new candidate as `Solutions/<name>.solution.md`, per the
  skill's convention — short kebab-case names, one file per candidate.

## 7. Prompt review and the next step

Present the problem statement and the new candidate solutions to the
user for review. Tell them `/ideas-solution` is next — to pitch a
solution of their own that isn't among these candidates, refine one of
them, or choose one outright.

## Report

Summarize: whether the problem statement was created fresh or refined
(and what changed, if refined), how many candidate solutions were
generated and their names, and the prompt to run `/ideas-solution` next.
