---
name: "!Spike"
description: >
  Runs a time-boxed project that answers one specific question or picks the best of several
  options, done once, closed with a recommendation. Triggers on "spike-scope" followed by text,
  and whenever asked to spike something, prototype-and-compare approaches, run a bake-off, or
  "which of these should we use" — even without the word "spike." Guarantees an audit trail
  (every artifact saved into the project's spike folder, never left in scratch space) and an
  agent-summary.md recording elapsed time, models used, and token usage. Part of the Wayfinder
  suite (from Keith).
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Answer one timeboxed question with a recorded, evidenced go/no-go recommendation instead of open-ended exploration."
version: 1.0.0
dependencies: ["git (disposable clone, optional)"]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Spike

A spike answers one specific question, or picks the best of several named
options, on a deadline. The deliverable is the *answer* — code and
prototypes are how you get there, not the point. Unlike `research` (this
skill's sibling), a spike runs once and closes: no re-running to catch up
with new information, no living document. If a question genuinely needs to
stay open and get revisited over time, that's `research`, not this.

Two hard-won lessons baked into this skill, both from a real spike that
initially got this wrong: (1) artifacts default to scratch space unless you
actively move them into the project, so do that as you go, not as an
afterthought; (2) if you don't record start/end timestamps and subagent
token usage *as they happen*, you cannot reconstruct them later — the data
just isn't retained anywhere else.

## Step 0 — Check for `utopia` and `specs`

Before doing anything else, check whether `utopia` and/or `specs` appear in
the current session's available skills list (or are referenced in the
project's own `CLAUDE.md`/README, e.g. "Utopia structure" or PDLC phase
folders like `Specification/`, `Implementation/`, `Evals/`).

- **If `specs` is available**: invoke it and follow its scaffold exactly —
  it's the authority on this project's spike template, not this file.
- **If `specs` is referenced but not invokable this session** (e.g. it's a
  project-local convention without a loadable skill): look for existing
  spikes under `Specification/_Spikes/` (or wherever the project's own
  spikes already live) and copy their structure — field names, section
  order, file naming — rather than inventing your own. Consistency with
  what's already there matters more than any template in this file.
- **If neither exists** (no Utopia structure, no prior spikes to copy):
  fall back to the generic scaffold in `references/spike-scaffold.md`.

Same logic for `utopia`: if it's available, defer to it for where spikes
live and how the project's phases are organized. If not, use your own
judgement about repo layout, informed by whatever's already there.

## Step 1 — `spike-scope`

When the user's message contains `spike-scope` followed by text (on the
same line or the rest of the message), that text is the raw scope. Turn it
into a formal, written scope *before* doing any research or prototyping —
this is the contract you're building against, and it's cheap to fix now,
expensive to discover was wrong halfway through.

1. **Name the spike.** Short, specific, filesystem-safe (e.g.
   `TreeDictionary-vs-CustomTrie`, not `Spike1`).
2. **Extract the question(s).** What exactly is being decided? If the scope
   names specific options/candidates to compare, list them explicitly —
   don't let "compare a few approaches" stay vague when the user actually
   named them.
3. **Record a start timestamp.** Run `date -u +%Y-%m-%dT%H:%M:%SZ` (or the
   project's local equivalent) via the shell *right now* and note it in the
   scope doc's header. This is the only reliable way to report real elapsed
   time later — there is no other clock available to you mid-session.
4. **Write the scope doc.** Create the spike's folder (per Step 0's
   scaffold) and write a `<Name>.project.spec.md` covering: Purpose,
   Questions to answer, the options/candidates being compared (if any),
   Scope (in/out), Success criteria, and a placeholder `## Exit` section to
   fill in at close-out. If a master index exists (e.g.
   `SPIKE-PROJECTS.md`), add or update an entry there too, matching its
   existing format.
5. **Confirm scope only if genuinely ambiguous.** If the user's scope text
   already answers "what question, what options, what counts as done,"
   proceed — don't manufacture a clarifying question for the sake of one.
   If it's truly unclear (e.g. no success criterion at all), ask one
   focused question rather than guessing and building the wrong thing.

## Step 2 — Timebox the work

State the timebox up front (ask the user if they didn't give one, or
propose a sensible default and note it in the scope doc). While working:

- One subfolder per option/candidate being compared, so each is
  independently readable — this project's own spikes have consistently
  found that duplicating small shared pieces across candidate folders (a
  helper type, a small utility module) beats a clever shared import, because
  it keeps each folder self-contained and lets someone read just the one
  they care about.
- If comparing multiple candidates against the same tests, put that shared
  test/eval code in its own sibling folder (e.g. `Tests/`), not inside any
  one candidate's folder — it isn't a property of any single option.
- If a spike isn't converging within its timebox, that non-convergence
  *is* the finding — write it up as "harder than it looks, needs more
  scoping" rather than quietly running over. Don't treat the timebox as a
  soft suggestion.

## Step 3 — Audit trail (non-negotiable)

Every artifact this spike produces — code in any language, generated docs,
test results, data files, reports — must end up as a real, saved file
inside the spike's own folder in the actual project, not just in a
temporary/scratch/outputs area. If you do drafting work somewhere isolated
(e.g. a throwaway git clone, for safety reasons — see
`references/isolated-clone-note.md` if you hit filesystem/git-permission
issues writing directly into the project), the spike is not done until
everything from that isolated work has been copied into the project's real
spike folder. "I can show you the file" is not the same as "the file lives
in your project" — confirm the latter before calling anything complete.

## Step 4 — Close out: write `agent-summary.md`

Before finishing, write (or overwrite, since a spike runs once)
`agent-summary.md` in the spike's folder. Use this template:

```markdown
# Agent Summary — <Spike Name>

**Started:** <start timestamp from Step 1>
**Finished:** <timestamp now, same command as Step 1>
**Elapsed:** <computed duration>

## Models used

| Task | Model | Notes |
|---|---|---|
| Main thread (orchestration, writing, most code) | <model from your system prompt> | |
| <subagent task 1, if any> | <model> | <why this task was delegated> |

## Token usage

| Source | Tokens | How captured |
|---|---|---|
| <subagent 1> | <total_tokens> | reported in the Task-tool completion notification |
| Main thread | not directly observable | the orchestrating agent's own token consumption isn't exposed mid-session; only delegated subagent calls report usage |

## Findings summary

<One paragraph: the answer, and the confidence level. Link to the full
project.spec.md's Exit section for detail — don't duplicate it here.>
```

Capture subagent `total_tokens`/`duration_ms` **as each one completes** —
it arrives in the Task completion notification and isn't retrievable after
the fact. Don't wait until the end and try to reconstruct it.

Also fill in the scope doc's `## Exit` section now: the answer, the
evidence, and a go/no-go or "here's the recommendation" — the same thing
`agent-summary.md`'s findings paragraph points back to.

## Reference

- `references/spike-scaffold.md` — the generic fallback scaffold (project
  spec + optional phased plan) for projects with no `specs` skill and no
  existing spikes to copy from.
- `references/isolated-clone-note.md` — what to do when writing directly
  into the project's git-tracked folder fails (permission errors on
  `.git/*.lock` are a known symptom on some cloud-synced folders) without
  losing the audit-trail guarantee in Step 3.
