---
description: Narrate a comprehensive, informal description of the product from eligible Features/*.feature.idea.md (inclusion: selected, status: approved, physically in the active phase's subfolder or an earlier one — wherever Features/ is phase-divided). Issue-aware. Writes it to <product>.<kind>.description.md — stamped with `phase: <N>` frontmatter if Features/ is phase-divided — reviewing with the user before offering to commit and push.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git:*), Read, Write, Edit, AskUserQuestion, Agent
---

Narrate a comprehensive, informal description of the product from its
**eligible** feature ideas, and write it to
`Ideation/<product>.<kind>.description.md`. Read
`~/.claude/skills/ideas/SKILL.md` first if it isn't already loaded this
session — this command reads that skill's files and follows its
conventions.

This is deliberately not a spec: no `FR-XX-n` numbering, no typed
sections. It's prose — the kind of comprehensive but readable overview
you'd hand someone to explain what this thing *is*. The feature ideas
already aggregate the raw notes, the problem, and the selected solution
(per `/ideas-feature`), so they're the only input this command needs.

## 1. Determine eligible feature ideas

Read every `Features/*.feature.idea.md` (top level and inside any
`Phase<N>/` subfolder) and its frontmatter, and `Ideation/PHASES.md` if
it exists. A feature is **eligible** only if all of these hold — per the
`ideas` skill's "Feature idea frontmatter" and "Phasing an overwhelmed
Ideation space":

- `inclusion: selected` — proposed, deferred, or dropped features aren't
  things this product actually offers; don't narrate them as if they are.
- `status: approved` — "complete," in `/ideas-mine`'s vocabulary, not
  still `pending` ("draft") or `rejected`.
- **Physically in the active phase's `Phase<N>/` subfolder, or an
  earlier one**, if `Features/` has been phase-divided. Phases are
  worked in order, so a feature in a phase already passed counts same as
  one in the active phase; a feature in a later, not-yet-active phase's
  subfolder doesn't, even if it's otherwise `selected` and `approved` —
  it hasn't been worked yet. If `Features/` hasn't been divided at all,
  this condition doesn't apply — nothing is excluded on phase grounds.
- **Not still sitting at `Features/`'s own top level once `Features/`
  has been divided**: that means untriaged, not yet assigned to a
  phase — exclude it by default, and call it out explicitly in the
  report (as "unphased," distinct from "deferred") rather than silently
  guessing which side of the cut it belongs on.

If no feature meets all of these, stop and say so — and say *why*
(none exist at all, or some exist but aren't `selected`+`approved`, or
are all in later phases) rather than a generic "nothing here." Point at
whichever is the actual blocker: `/ideas-feature` or `/ideas-mine` if
there's nothing drafted yet, `/ideas-check`/`/ideas-fix` if features
exist but are still undecided, `/ideas-phase` if everything eligible is
stuck in a future phase.

## 2. Gather the feature ideas

Read every eligible `Features/*.feature.idea.md` in full (already read
in step 1, but treat that as the working set from here on).

## 3. Check issue-awareness

Read `Issues/*.issue.md` and their `status` frontmatter (plus, if
`Issues/` is phase-divided, which `Phase<N>/` subfolder each lives in).
Ignore anything in a later, deferred phase's subfolder entirely. For an
`outstanding` issue in the active phase (or at `Issues/`'s own top
level) that concerns one of the eligible features from step 1: if
narrating naturally reveals the inconsistency it names no longer holds —
e.g. the feature write-ups it flagged as contradictory have since been
reconciled — resolve it: set `status: resolved` in its frontmatter and
append a `## Resolution` section. This is opportunistic, not a mandate;
don't narrate *around* a contradiction that's actually still live just
to avoid surfacing it, and don't go hunting for unrelated issues to
close. Per the `ideas` skill's "Issue-awareness beyond
`/ideas-check`/`/ideas-fix`."

## 4. Narrate with a Fable-backed subagent

Don't write this yourself in the top-level session — **delegate the
narration to a subagent**, via the `Agent` tool, with `model: "fable"`
and `subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 6 needs its output). Synthesizing
one coherent, readable narrative out of a set of feature ideas is exactly
the ambiguity-resolution work this project's ideation→spec model policy
reserves for Fable.

Hand the subagent every *eligible* feature idea file (paths, so it reads
them directly) and ask for one thing: a comprehensive, informal
narrative description of the product — what it is and its overall
shape, drawn from what those feature ideas collectively describe. Prose,
not a spec; thorough, not exhaustive; skip anything the features don't
support rather than inventing detail. Don't hand it anything excluded in
step 1 — a draft, unselected, or not-yet-active-phase feature shouldn't
leak into the narrative just because the subagent happened to see it.

## 5. Determine kind

`<product>` matches the Ideation space's product name (per the `ideas`
skill's own convention: the root `<Product>.product.spec.md` if one
exists, else the repo folder name). `<kind>` is whatever this Ideation
space is actually describing — a product, a language, a utility, or
something else — inferred from what the feature ideas collectively
describe. If it's genuinely ambiguous, ask rather than defaulting to
`product`; it becomes part of the filename, so get it confirmed rather
than guessed wrong.

## 6. Write, review, and offer to commit

If `Features/` is phase-divided, prepend `phase: <N>` frontmatter to the
draft, `<N>` being the active phase's number — the same number used for
eligibility in step 1, so the file's own metadata always matches what it
actually contains:

```yaml
---
phase: 1
---
```

If `Features/` hasn't been phase-divided at all, write the file with no
frontmatter — there's no phase to record, and adding an empty or
placeholder block would just be noise. Re-running this command later,
after `Features/` gets divided or the active phase is promoted, updates
this frontmatter to match — the description always reflects *a specific
phase's* eligible feature set, and says so.

Write the draft (frontmatter, if any, plus the narrative) to
`Ideation/<product>.<kind>.description.md`. Then present it to the user
for review before doing anything else with it — this is freshly
synthesized narrative content, not mechanical output, and it should be
read before it's treated as final. If they want changes, revise and
re-present.

Only **after** the user has reviewed it, offer to commit and push the
change (including any issue resolved in step 3) — don't commit
automatically even in a Utopia repo where other Ideation changes might
otherwise qualify for auto-commit; this command's output gets an
explicit look first, every time.

## Report

Summarize what was drafted, how many feature ideas fed it (eligible
count) versus how many existed but were excluded and why (not selected,
not approved, deferred to a later phase, unphased), what `phase:`
frontmatter (if any) the file was stamped with, any issue resolved along
the way, and the outcome of the review and commit offer.
