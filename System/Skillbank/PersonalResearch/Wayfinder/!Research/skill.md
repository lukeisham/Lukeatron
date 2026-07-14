---
name: "!Research"
description: >
  Open-ended research on a topic with no fixed deadline and no single final answer — meant to
  be re-invoked later to refresh conclusions against new information (especially web search)
  rather than answered once and closed. Triggers on "research-scope" followed by text, and
  whenever asked to research a topic, investigate something open-ended, track an evolving area,
  or "keep tabs on" a subject. Guarantees an audit trail (findings/sources saved into a Research
  folder, prior conclusions dated not overwritten) and an append-only agent-summary.md log of
  elapsed time, models used, and token usage per run. Part of the Wayfinder suite (from Keith).
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Give any open-ended, revisitable question a durable, dated research trail instead of an ad hoc, unrecorded search."
version: 1.0.0
dependencies: [WebSearch, WebFetch]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Research

Research answers a question that doesn't have a single final answer, or
whose best answer changes as the world does — the deliverable is a living
document, not a closed decision. Contrast with `research`'s sibling
`spike`: a spike is time-boxed and answers one question once, then stops.
If what's being asked is "prototype two things and tell me which to use,"
that's a spike. If it's "figure out where things stand on X, and check
back in periodically," that's this skill.

## Step 0 — Check for `utopia`, and decide where the Research folder goes

Check whether `utopia` appears in the current session's available skills
list, or is referenced in the project's own `CLAUDE.md`/README (e.g.
"Utopia structure," PDLC phase folders like `Specification/`,
`Implementation/`, `Evals/`). If it's available, invoke it and defer to
whatever it says about folder placement — it's the authority, not this
file. Otherwise, use this heuristic:

1. **Does the project have PDLC phase folders at its top level** (things
   like `Specification/`, `Implementation/`, `Evals/`, or similarly-named
   phase directories, Utopia-style or not)? If not, this project isn't
   using a PDLC structure — create `Research/` at the **top level of the
   project** and stop here.
2. **If phase folders exist, does the research topic clearly belong to
   one phase?** Read the scope text for signal: research about
   implementation techniques, libraries, algorithms, or how to build
   something → the implementation-phase folder (e.g. `Implementation/`).
   Research about product direction, requirements, market/competitive
   landscape, or what to build → the specification-phase folder (e.g.
   `Specification/`). Use your judgement — the point is matching the
   project's own phase semantics, not these two examples specifically.
   Create `Research/<Topic>/` inside that phase folder.
3. **If the topic is genuinely cross-cutting** (spans multiple phases, or
   doesn't fit any of them — e.g. "research competitor pricing models,"
   which isn't really an implementation *or* a spec question) — create
   `Research/<Topic>/` at the **top level of the project**, sibling to the
   phase folders, rather than forcing it into one.
4. **If it's genuinely ambiguous** which phase fits, make the call you
   think is most defensible and say so in the scope doc ("placed under
   Implementation/ because this is primarily about library choice, not
   product direction") rather than blocking on asking the user. Getting
   asked to re-file a folder later is cheap; stalling on every research
   request to ask "where should this go" is not.

## Step 1 — `research-scope`

When the user's message contains `research-scope` followed by text, turn it
into a formal scope doc before searching anything.

1. **Name the topic.** Short, specific, filesystem-safe.
2. **Record a start timestamp** the same way `spike` does: run
   `date -u +%Y-%m-%dT%H:%M:%SZ` via the shell and note it — this is the
   only reliable source of elapsed time you'll have.
3. **Write `<Topic>.research.md`** in the folder decided in Step 0,
   covering: Purpose, the open question(s) (plural is normal here — research
   topics often have several related threads), *why this needs to stay
   open* rather than being answered once (this is the thing that
   distinguishes it from a spike — write it down explicitly so a future
   re-run, or a future reader, understands why this document exists and
   isn't just a stale spike that never got closed), initial scope
   boundaries, and a suggested update cadence or trigger ("re-check
   quarterly," "re-check when a new major version ships," "re-check on
   request only" — whatever's appropriate for the topic).
4. **Confirm scope only if genuinely unclear** — same principle as `spike`:
   don't manufacture questions the user's scope text already answered.

## Step 2 — Do the research

Search broadly (web search is the point of this skill re-running well —
lean on it rather than relying on training knowledge for anything
time-sensitive). Save primary sources and links as you find them, not just
your summary of them — a future re-run needs to know what was already
checked, not just what was concluded.

If the research produces code (e.g. a proof-of-concept, a data-gathering
script), save it into the Research folder too — the audit-trail rule below
applies to research exactly as it does to spikes.

## Step 3 — Audit trail (non-negotiable)

Every artifact — findings, sources, code in any language, data files — must
end up as a real, saved file inside the Research folder in the actual
project, never left only in scratch/temporary space. If drafting happens
somewhere isolated for safety reasons (see `references/isolated-clone-note.md`
— the identical failure mode and fix `spike` uses), export everything into
the real project folder before considering the run done.

## Step 4 — Writing (and re-writing) `<Topic>.research.md`

**First run**: write the full doc as scoped in Step 1, plus a `## Findings`
section with what you learned, sourced.

**Later runs** (the whole reason this skill exists, as distinct from
`spike`): don't overwrite `## Findings` — **append a dated update section**
instead:

```markdown
## Update — <date>

<What's new since the last update, and why it changes or confirms the
prior conclusion. Cite sources.>

**Superseded from the <prior date> findings:** <explicitly call out what
used to be true/recommended and no longer is — don't just leave the old
text sitting there with no signal that it's outdated. If nothing is
superseded, say "no change to prior conclusions" rather than omitting the
section, so a reader knows this update actually checked rather than
skipped.>
```

This keeps the document honest as a *history* of the understanding, not
just a snapshot that silently changes underneath anyone who bookmarked it.

## Step 5 — Close out: append to `agent-summary.md`

Unlike `spike`'s summary (written once), this is a **log — append, never
overwrite**, since the whole point of `research` is running more than once.

```markdown
## Run — <timestamp from Step 1> → <timestamp now>

**Elapsed:** <computed duration>

**Models used:**

| Task | Model | Notes |
|---|---|---|
| Main thread | <model from your system prompt> | |
| <subagent task, if any> | <model> | <why delegated> |

**Token usage:**

| Source | Tokens | How captured |
|---|---|---|
| <subagent> | <total_tokens> | Task completion notification |
| Main thread | not directly observable | not exposed mid-session |

**What changed this run:** <one line — "initial scope + findings" for the
first run, or a pointer to which `## Update` section this run added>
```

Capture subagent token/duration data **as each call completes** — same
reasoning as `spike`: it's only available in the completion notification,
not reconstructable afterward.

## Reference

- `references/phase-detection-examples.md` — worked examples of the Step 0
  folder-placement heuristic, for cases that aren't obviously one phase or
  the other.
