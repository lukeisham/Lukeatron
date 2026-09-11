---
description: Generate (or update) Features/<name>.feature.idea.md files by clustering raw ideas, the selected solution, and the problem statement into aggregated, informal feature ideas — a preparatory step before formal feature specs in a PRD. Issue-aware (ignores out-of-phase issues, attempts to resolve in-phase outstanding ones where the clustering naturally does). Asks the user to decide each feature's inclusion/status frontmatter where still undecided, then reviews with the user before offering to commit and push.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(readlink:*), Bash(git:*), Read, Write, Edit, AskUserQuestion, Agent
---

Generate a comprehensive set of feature ideas from everything currently
in the Ideation space, and write them to `Features/<name>.feature.idea.md`
— aggregating raw ideas that describe the same feature into one informal
write-up each, referencing the notes they came from. Read
`~/.claude/skills/ideas/SKILL.md` first if it isn't already loaded this
session — this command writes that skill's files and follows its
conventions.

This is a preparatory step, not a spec: enough for someone to decide
whether a feature is worth pursuing, not `FR-XX-n` numbered requirements.
Formal feature specs (a `_Builds/` mini-PRD, or the Requirements section
of a top-level PRD via `/specs-prd`) come later, once these are mature.

## 1. Check preconditions

`<product>.problem.md` and a resolved `<product>.solution.md` must both
exist — features are evaluated against the problem and the *selected*
solution, not against candidates still under consideration. If either is
missing, say so and point at the `ideas` skill's normal workflow, or
`/ideas-solution` to get a solution chosen, rather than guessing which
solution to build features against.

## 2. Gather everything relevant

- Every raw note in `Ideation/Ideas/` (and anything loose at the
  `Ideation/` root from before that folder existed) — including inside
  any `Phase<N>/` subfolders, if `Ideas/` has been phase-divided per the
  `ideas` skill's "Phasing an overwhelmed Ideation space." Prefer the
  active phase's subfolder plus whatever sits at `Ideas/`'s own top
  level (untriaged or genuinely cross-phase material, per that section's
  `Ideas/` exception); a deferred phase's subfolder is out of scope for
  this run unless the user names something in it explicitly.
- `<product>.problem.md`.
- `<product>.solution.md` — resolve the symlink and read the selected
  solution; features aggregate ideas in service of *this* solution.
- `Ideation/<product>.<kind>.description.md`, if one already exists —
  whatever the user (or a prior `/ideas-describe` run) put there is
  relevant input too.
- Any images anywhere under `Ideation/` (mockups, screenshots, diagrams)
  relevant to a feature — read them directly.
- Every existing `Features/*.feature.idea.md`, wherever it lives (top
  level or in any `Phase<N>/` subfolder) — this command must be safe to
  re-run as new notes accumulate, so existing features get updated in
  place, not duplicated.
- Every `Issues/*.issue.md` and its `status` frontmatter — see step 3's
  issue-awareness note below.

## 3. Cluster and draft with a Fable-backed subagent

Don't do this yourself in the top-level session — **delegate the
clustering and drafting to a subagent**, via the `Agent` tool, with
`model: "fable"` and `subagent_type: "Plan"` (run it in the foreground,
i.e. `run_in_background: false`, since step 4 needs its output).
Deduplicating raw notes into distinct features and telling "same feature,
described twice" apart from "two different features" is exactly the
ambiguity-resolution work this project's ideation→spec model policy
reserves for Fable — the same tier as the skill's own feature-clustering
step.

Give the subagent everything from step 2 (file paths for it to read
directly, including images) and ask it to:
- Cluster the raw notes (plus solution and description-file detail) into
  distinct candidate features — one aggregated write-up per feature, not
  one per note. Where two notes describe the same feature differently,
  merge them; don't produce near-duplicate features.
- For each feature, draft: what it is, why it matters to the problem and
  the selected solution, roughly what it would take, and which source
  notes/files it aggregates (as relative links) — fill in obvious gaps
  itself rather than leaving them for the user.
- Flag anything it can't fill in confidently as an open question tied to
  that feature, instead of guessing.
- Against the existing `Features/*.feature.idea.md` found in step 2:
  additive or clarifying new material updates that file directly; new
  material that contradicts an existing feature, the problem statement,
  or the selected solution does **not** silently overwrite it — flag it
  instead, per the skill's "ingesting new notes" discipline.
- **Issue-awareness**: check `Issues/*.issue.md` whose `status` is
  `outstanding` and whose phase (per which `Phase<N>/` subfolder they're
  in, if `Issues/` is divided) is the active one or `Issues/`'s own top
  level. Ignore anything in a later, deferred phase's subfolder
  entirely. For the rest, if the clustering/drafting work happening here
  naturally resolves what one of them names (not a mandate to go looking
  for unrelated issues to close), flag that in its output so step 5 can
  apply the resolution — per the `ideas` skill's "Issue-awareness beyond
  `/ideas-check`/`/ideas-fix`."

## 4. Ask the user to fill remaining gaps

Present only what the subagent couldn't determine easily — the flagged
open questions and any contradictions — directly to the user. Use
`AskUserQuestion` when there are concrete candidate answers; plain text
otherwise. Update the affected feature drafts with their answers. Don't
ask about anything the subagent already filled in confidently; this step
is for genuine gaps, not a rubber-stamp review of everything.

## 5. Write the feature files

Write or update `Features/<feature-name>.feature.idea.md` for each
feature: what it is, why it matters, roughly what it would take, its
source-note references, and any open questions the user explicitly chose
to leave open (never silently dropped). A **new** file lands in
`Features/Phase<active>/` if `Features/` has been phase-divided, else
directly in `Features/`; an **updated** existing file stays wherever it
already lives — this command never relocates a feature between phases,
that's `/ideas-phase`'s job. Every **new** file gets `inclusion:
proposed` / `status: pending` frontmatter. Every **updated** existing
file keeps its current `inclusion`/`status` values exactly as they
were — new material informs the write-up, it never silently resets a
decision already made.

For any issue step 3 flagged as naturally resolved by this run's
drafting: set `status: resolved` in that issue's frontmatter and append
a `## Resolution` section to its body (same mechanic as `/ideas-fix`) —
this is opportunistic, only for issues the work already resolved, not a
general issue-resolution pass.

## 6. Decide inclusion and status

Per "Feature idea frontmatter" in the `ideas` skill: for every feature
file now in `Features/` (new ones from this run and pre-existing ones
alike, at top level or in the active phase's subfolder — skip anything
sitting in a deferred phase's subfolder, it isn't this run's concern),
read its current `inclusion` and `status`. Ask the user to decide
`inclusion` (`selected` / `deferred` / `dropped`, or leave `proposed`)
only if it's still `proposed`, and `status` (`approved` / `rejected`, or
leave `pending`) only if it's still `pending` — the two independently, so
a feature already `selected` still gets asked about `status` if that's
still `pending`, and vice versa. Skip entirely any feature where both are
already decided. Batch several features per `AskUserQuestion` call (up to
its 4-question limit) rather than one call per feature. Update each
file's frontmatter with the answers.

## 7. Review and offer to commit

Present the full set of created/updated feature files (and any issues
resolved along the way) to the user for review before doing anything
else with them. Only **after** the user has reviewed them, offer to
commit and push — don't commit automatically even in a Utopia repo where
other Ideation changes might otherwise qualify for auto-commit; this
command's output gets an explicit look first, every time.

## 8. Prompt the next step

Tell the user that running `/ideas-describe` next makes sense now that
feature ideas exist — it folds them into the product's comprehensive
description.

## Report

Summarize: how many features were created vs. updated (and which, by
name, and which phase folder each landed in if `Features/` is divided),
what gaps the subagent filled on its own vs. what it asked the user
about, any issues resolved along the way, what `inclusion`/`status`
decisions were made (and which features were skipped because they were
already decided, or because they're in a deferred phase), the
review/commit outcome, and the `/ideas-describe` prompt.
