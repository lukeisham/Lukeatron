---
description: Fix what's safe automatically in a product's Ideation/ space (including adding missing issue-status frontmatter), file Issues/<slug>.issue.md for anything that isn't, ask the human to resolve open issues and any feature ideas still at their default inclusion/status (scoped to the active phase per folder, wherever Ideas/Features/Issues have been phase-divided; else recommending /ideas-phase when the pile is large), then apply fixes and mark issues resolved. The mutating counterpart to the read-only /ideas-check.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(readlink:*), Bash(git mv:*), Bash(mkdir:*), Read, Write, Edit, AskUserQuestion, Agent
---

Run the `ideas` skill's full fix pass over this product's `Ideation/`
space — the mutating counterpart to `/ideas-check`, which only reports.
Read `~/.claude/skills/ideas/SKILL.md` first if it isn't already loaded
this session. Running `/ideas-check` first is a reasonable way to preview
what this command would act on, but isn't required — this command does
its own inventory and detection before fixing anything.

Like `/ideas-check`, this command never runs `/ideas-problem`,
`/ideas-solution`, `/ideas-feature`, or `/ideas-describe` itself — it
only names the recommended next pipeline command in its report. Unlike
`/ideas-check`, it does write, edit, and file things: that's its whole
job.

## 1. Inventory

Read everything in `Ideation/`: `<product>.problem.md`,
`<product>.solution.md` (and what it resolves to), every file in
`Ideas/` (unprocessed raw notes, including inside any `Phase<N>/`
subfolders — flag any that look old enough they should've been triaged
by now, don't silently ignore them), every `Solutions/*.solution.md`,
every `Features/*.feature.idea.md` (top level and inside any
`Phase<N>/` subfolders), every `Issues/*.issue.md` (same), any raw notes
still loose at the `Ideation/` root from before `Ideas/` existed, and
`PHASES.md` if it exists.

For each of `Ideas/`, `Features/`, `Issues/`, separately note whether it
has been **phase-divided** (contains at least one `Phase<N>/`
subdirectory) — check independently per folder, per the `ideas` skill's
"Phasing an overwhelmed Ideation space."

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

Note the earliest undone step here; step 7's report gives the *final*
recommendation, since the fixes below (e.g. repointing a dangling
solution symlink) can change the answer. Name the command
(`/ideas-problem`, `/ideas-solution`, `/ideas-feature`,
`/ideas-describe`) — don't run it.

## 3. Auto-fix what's safe

Fix directly, no confirmation needed, and note each fix made:

- Dangling `<product>.solution.md` symlink (target file doesn't exist) —
  only auto-fix if exactly one solution file exists to point it at;
  otherwise this is an issue (ambiguous), not an auto-fix.
- Orphaned files that are clearly leftover (e.g. a `.solution.md` in
  `Solutions/` with no content, a `0`-byte file) — confirm before
  deleting anything; "clearly leftover" is a strong bar.
- Obvious naming-convention violations with one unambiguous correction
  (e.g. wrong file extension chain for an otherwise well-formed feature
  idea).
- Any `Issues/*.issue.md` missing its `status` frontmatter (per the
  `ideas` skill's "Issue frontmatter") — add it automatically:
  `status: outstanding` unless the body already has a `## Resolution`
  section, in which case `status: resolved`.

## 4. Detect and file issues

For anything you can't safely resolve on your own — a dangling
`<product>.solution.md` symlink with more than one candidate in
`Solutions/` to point it at, an orphaned file that isn't clearly enough
leftover to delete, a naming-convention violation with more than one
plausible correction (the three "otherwise" cases step 3 punts on),
contradictions between two feature ideas, a feature idea that conflicts
with the problem statement or chosen solution, duplicate/near-duplicate
features, raw notes that haven't been triaged yet — write (or update, if
one already exists for this topic) `Ideation/Issues/<slug>.issue.md`:

```markdown
---
status: outstanding
---

# <Title> — Issue

Filed: <today>

## What's inconsistent

<description, with the specific files/lines involved>

## Files involved

- <file 1>
- <file 2>

## Question for resolution

<the specific question that needs a human answer>
```

Write the new file wherever its subject matter's phase already lives
structurally: inside `Issues/Phase<N>/` if `Issues/` is phase-divided and
the issue clearly concerns phase-`N` material (e.g. it's about a feature
sitting in `Features/Phase<N>/`), otherwise at `Issues/`'s own top level
— including when `Issues/` isn't divided at all, or the issue spans more
than one phase.

Contradiction detection is exactly the kind of ambiguity-resolution this
skill delegates to Fable (see the `ideas` skill's model policy) — use a
Fable-backed Plan agent for this step when there's real judgment involved,
not for mechanical checks.

## 5. Ask the human to resolve open issues and undecided features

Present every open issue (existing and newly filed) and ask directly —
don't guess a resolution. Use `AskUserQuestion` when the resolution is a
choice between concrete options; ask in plain text when it isn't.
**If `Issues/` is phase-divided, only ask about issues in the active
phase's `Phase<N>/` subfolder or at `Issues/`'s own top level** —
deferred-phase issues stay untouched and unasked-about until their phase
is promoted; mention their count in the report.

In the same pass, per the `ideas` skill's "Feature idea frontmatter":
for every `Features/*.feature.idea.md` found in step 1, check its current
`inclusion` and `status`. Ask about `inclusion` (`selected` / `deferred`
/ `dropped`, or leave `proposed`) only if it's still `proposed`, and
`status` (`approved` / `rejected`, or leave `pending`) only if it's still
`pending` — each field independently. **Skip entirely any feature where
both are already decided** — this pass surfaces what's still undecided,
it doesn't re-litigate what the human already settled, whether that was
via `/ideas-feature` or a previous `/ideas-fix` run. **If `Features/` is
phase-divided, only ask about features in the active phase's
`Phase<N>/` subfolder or at `Features/`'s own top level** —
deferred-phase features stay untouched and unasked-about until their
phase is promoted to active; mention their count in the report so
nothing looks silently dropped. Batch several features per
`AskUserQuestion` call (up to its 4-question limit) rather than one call
per feature.

If step 1's undecided-feature-plus-open-issue count is large and no
folder has been phase-divided yet, recommend `/ideas-phase` in the
report (step 7) instead of asking about all of them in one overwhelming
batch — per the `ideas` skill's "Phasing an overwhelmed Ideation space."
Naming the recommendation is as far as this goes: don't run
`/ideas-phase`, and don't unilaterally decide the split yourself.

## 6. Apply resolutions

For each issue the human just resolved: make the file changes their
answer implies (update feature ideas, fix the symlink, merge duplicates,
etc.), then set `status: resolved` in that issue's frontmatter and
append to its body:

```markdown
## Resolution

Resolved: <today>

<what the human decided, and what changed as a result>
```

Never delete an issue file, resolved or not — it's the audit trail, and
resolving it doesn't move it to a different phase folder either.

For each feature idea the human just made an `inclusion`/`status` call
on, write the answer straight into that file's frontmatter — this isn't
an issue, so there's no `Issues/` entry to amend, just the field itself.

## 7. Report

Summarize: what was auto-fixed (including any issue-frontmatter gaps
filled), what issues were filed, what issues were resolved this run
(with their outcome), what `inclusion`/`status` decisions were made (and
how many features were skipped because they were already decided, and
how many were skipped because they're in a deferred phase's subfolder),
and what (if anything) is still open and waiting on the human. Note
which of `Ideas/`, `Features/`, `Issues/` are phase-divided vs. not. If a
`/ideas-phase` recommendation applies, include it. Close with the
**final pipeline-progress recommendation** from step 2, re-evaluated
against anything this run just fixed or resolved — name the next command
to run, or say the pipeline is fully done if it is.
