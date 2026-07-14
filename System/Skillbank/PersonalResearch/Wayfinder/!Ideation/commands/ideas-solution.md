---
description: Draft a candidate solution from a one-line pitch given as command arguments (merging into an existing candidate if one already fits), flesh it out by interviewing the user, prompt them to choose a solution, then identify that solution's product dependencies into <product>.dependencies.md.
argument-hint: <a one-line description of your suggested solution>
allowed-tools: Bash(ls:*), Bash(find:*), Bash(mkdir:*), Bash(touch:*), Bash(ln:*), Read, Write, Edit, AskUserQuestion, Agent, WebSearch, WebFetch
---

Turn a solution pitch given as arguments to this command into a proper
candidate in the `ideas` skill's `Solutions/` folder, then walk through to
an explicit solution choice. Read `~/.claude/skills/ideas/SKILL.md` first
if it isn't already loaded this session — this command writes one of its
files and follows its conventions.

## 1. Ensure scaffolding

Before anything else — before even taking the pitch — idempotently
create `Ideation/Ideas/`, `Ideation/Solutions/`, `Ideation/Features/`,
and `Ideation/Issues/` if any are missing (the same folders `/ideas-init`
creates; leave any that already exist untouched). This command may be
the very first thing run in a fresh Ideation space, and the steps below
assume these folders exist.

## 2. Take the pitch

`$ARGUMENTS` is the user's own description of their suggested solution —
it can be as short as one line. If it's empty, ask for the pitch before
doing anything else; there's nothing to flesh out otherwise.

## 3. Read existing context

- `<product>.problem.md`, if it exists — solutions are evaluated against
  the problem per the skill's own convention. If it doesn't exist yet,
  note that in the report and continue anyway (a pitch can arrive before
  the problem statement is formalized); don't block on it the way
  `/ideas-describe` blocks on a resolved solution.
- Every existing `Solutions/*.solution.md`.

## 4. Draft (or merge) with a Fable-backed subagent

Don't draft this yourself in the top-level session — **delegate it to a
subagent**, via the `Agent` tool, with `model: "fable"` and
`subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 5 needs its output). Deciding
whether the pitch is a genuinely new candidate or a restatement of an
existing one is exactly the ambiguity-resolution work this project's
ideation→spec model policy reserves for Fable — same tier as the skill's
own candidate-solutions step.

Give the subagent the pitch, the problem statement (if found), and every
existing solution file, and ask it to determine:
- **If an existing candidate already covers substantially the same
  approach**: produce a merged version of *that* solution file
  integrating the pitch's content — same filename, one solution, not a
  near-duplicate second file.
- **If it's genuinely distinct**: produce a new solution write-up per the
  skill's convention (approach, key tradeoffs, why it would or wouldn't
  work given the problem statement) plus a short kebab-case name for the
  file.

## 5. Interview to flesh it out

Present the draft (merged or new) to the user and ask specifically about
whatever the pitch left underspecified — this is the flesh-out step, not
a rubber stamp. Use `AskUserQuestion` when there are concrete candidate
answers; plain text otherwise. Update the draft with their answers.

## 6. Write the file

- Merge case: overwrite the existing `Solutions/<name>.solution.md` in
  place — report it as a merge, not a new file.
- New case: write `Solutions/<name>.solution.md`.

## 7. Prompt the user to choose a solution

Present every current `Solutions/*.solution.md` candidate side by side,
per the `ideas` skill's own step 7, and ask the user to choose one
explicitly — don't pick for them. The moment they choose, symlink it
immediately (skill step 8, don't defer), from the **repo root**:
```
ln -sf "Solutions/<name>.solution.md" "Ideation/<product>.solution.md"
```
Only the second argument gets the `Ideation/` prefix — the first is the
symlink's target, resolved relative to the symlink's own location when
read, not to whatever directory `ln` ran from. Prefixing both, or
prefixing neither while running from inside `Ideation/`, silently
produces a symlink `ln` reports success for but that fails to resolve on
read (see the `ideas` skill's step 8 caution for the failure mode). Verify
with `cat Ideation/<product>.solution.md` after creating or repointing
it, not just `ls`. If `<product>.solution.md` already points elsewhere,
confirm before repointing it — that's a direction change, not routine
maintenance.

## 8. Identify dependencies of the chosen solution

Only if step 7 ended in an actual choice (a solution was symlinked this
run, or was already chosen and you're re-running against it). Skip this
step entirely if nothing was chosen.

If `Ideation/<product>.dependencies.md` already exists and the chosen
solution hasn't changed since it was written, treat it as already
answered — don't re-interview. Otherwise:

1. **Ask whether the solution has dependencies.** A solution can depend
   on another product two ways worth naming explicitly when you ask: a
   **sister product** (a separate, roughly peer product this one talks
   to or is composed with) or a **lower layer in the module hierarchy**
   (a shared library/foundation this one is built on top of — same
   relationship as, say, a product depending on a shared language/runtime
   library). Ask directly, in plain terms; don't assume "no dependencies"
   just because the pitch didn't mention any.
2. **Where the solution implies a dependency that doesn't map to
   anything named yet — a hole — ask what fills it.** Two options, and
   get a concrete name for whichever one it is:
   - A **custom sister product**: something built for this purpose,
     whether it exists as a repo yet or is still just planned.
   - A **third-party product**: an existing external product, library,
     or service.
   Don't leave a hole unnamed — every dependency the user confirms needs
   a name before moving on.
3. **Research each named dependency**, once all are named:
   - Check the user's own knowledge base first: sibling product folders
     in this repo's parent workspace directory (per the `meta` skill's
     model — a workspace folder containing multiple product repos as
     direct subfolders). If a sibling folder's name matches, read its
     `README.md` and/or `<product>.<kind>.description.md` for a
     reference summary — this is a local, already-known product, not
     something to search for online.
   - For anything not found locally (most third-party products, and any
     custom sister product that doesn't exist as a repo yet), use
     `WebSearch`/`WebFetch` to find an authoritative reference (official
     site, docs, or a clear description of what it is) — enough for
     someone to understand what this dependency is and where to learn
     more, not a deep dive.
   - A planned-but-not-yet-built custom sister product won't have
     anything to find — note that plainly rather than fabricating a
     reference.
4. **Write `Ideation/<product>.dependencies.md`**: one entry per
   dependency — its name, whether it's an existing sister product, a
   planned sister product, or a third-party product, why this solution
   depends on it, and the reference found (a local path, a URL, or "not
   yet built" if planned). If the user said there are no dependencies,
   don't create this file — there's nothing to record.

## 9. Note the next step

Tell the user that `/ideas-feature` is next, now that a solution is
selected — it clusters raw ideas into fleshed-out feature ideas. If
`Ideation/<product>.dependencies.md` was written this run, also mention
`/specs-depend` — a command to pull in a product brief for each
dependency it lists. **`/specs-depend` doesn't exist yet** (it's
planned) — name it as a future step, don't attempt to run it.

## Report

Summarize: the pitch received, whether it was merged into an existing
candidate or written as a new one, what the interview resolved, which
solution (if any) the user chose and whether the symlink was created or
updated, what dependencies (if any) were identified and how each was
referenced, and the next-step note.
