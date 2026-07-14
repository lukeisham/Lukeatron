---
description: Mine one messy idea (from Ideas/, optionally narrowed by argument text) into a single well-formed Features/<name>.feature.idea.md through iterative drafting, review, and gap-filling. Issue-aware (ignores out-of-phase issues, attempts to resolve an in-phase outstanding one about the same idea where appropriate). Starts marked draft (status: pending), promoted to complete (status: approved) once resolved. The focused counterpart to /ideas-feature's bulk pass.
argument-hint: [optional text narrowing which idea to mine]
allowed-tools: Bash(ls:*), Bash(find:*), Bash(mkdir:*), Bash(touch:*), Read, Write, Edit, AskUserQuestion, Agent
---

Mine **one** feature idea out of this product's messy raw notes in
`Ideas/`, through a careful, one-at-a-time process — draft, review,
gap-fill, finalize — rather than `/ideas-feature`'s bulk pass over
everything at once. Use this when a pile of raw notes has one idea in it
worth real attention, or when a bulk `/ideas-feature` pass already left
something under-developed. Read `~/.claude/skills/ideas/SKILL.md` first
if it isn't already loaded this session — this command writes one of its
files and follows its conventions.

## 1. Ensure scaffolding

Same as `/ideas-problem`/`/ideas-solution`: idempotently create
`Ideation/Ideas/`, `Ideation/Solutions/`, `Ideation/Features/`, and
`Ideation/Issues/` if any are missing, leaving existing ones untouched.

## 2. Read the raw notes

Read every raw note in `Ideas/` (and anything loose at the `Ideation/`
root from before that folder existed), including inside any
`Phase<N>/` subfolders if `Ideas/` has been phase-divided. `$ARGUMENTS`,
if given, is the user's own hint at which idea to mine — a keyword,
topic, or short description — narrow the search accordingly rather than
treating it as an instruction to act on directly.

If `Ideas/` has been phase-divided (per the `ideas` skill's "Phasing an
overwhelmed Ideation space"), prefer candidates from the active phase's
`Phase<N>/` subfolder or from `Ideas/`'s own top level (untriaged, or
genuinely cross-phase material per that section's `Ideas/` exception —
either is fair game). If `$ARGUMENTS` (or the only sensible candidate)
points at something in a deferred phase's subfolder, confirm with the
user before mining it — it was deliberately set aside.

## 3. Identify the candidate idea

- **`$ARGUMENTS` given and it clearly identifies one idea** — that's the
  candidate; skip to step 4.
- **Empty, or ambiguous** (matches more than one distinct topic, or
  nothing specific) — identify a short list of candidate ideas: distinct,
  substantive threads within the raw notes that look worth mining into a
  feature. Delegate this clustering judgment to a **Fable**-backed
  subagent (`Agent` tool, `model: "fable"`, `subagent_type: "Plan"`,
  foreground) — the same tier of work as the skill's own feature-
  clustering step. Present the candidates via `AskUserQuestion` and ask
  which to work on first. Don't pick for them.

Check existing `Features/*.feature.idea.md` (top level and any
`Phase<N>/` subfolder) for one that already covers the chosen
candidate — if a close match exists, this becomes a refinement of that
file (continue the process against it, in place, wherever it lives), not
a duplicate.

## 4. Draft

Delegate the draft to the same Fable-backed subagent (continued, or
fresh with the candidate's source notes as input): extract what's
actually useful from the messy source material into a coherent feature
write-up — what it is, why it matters to the problem/solution (if
known), roughly what it would take, and which raw notes it draws from
(as relative links) — per the skill's feature-idea convention. Fill
obvious gaps itself; don't invent detail the notes don't support.

Write it to `Features/<name>.feature.idea.md` with `inclusion: proposed`
/ `status: pending` frontmatter — **`pending` is this command's "draft"
state.** A genuinely new file lands in `Features/Phase<active>/` if
`Features/` has been phase-divided, else directly in `Features/`.

## 5. Review with the user

Present the draft and ask the user to review it — does it accurately
capture the idea, or did the extraction miss or misread something. Wait
for their response before moving on; don't assume silence means
approval.

## 6. Ask for additional information

Once they've reviewed it, ask directly whether there's anything more
they want to add — context the raw notes didn't capture, changes of
mind, adjacent detail. Fold their answer into the draft.

## 7. Analyze for gaps, check for a related issue, and interview to fill them

Analyze the updated draft for gaps — missing detail a reader would need
to actually build this, unclear scope, unanswered "how would this work"
questions. The same Fable-backed subagent from steps 3–4 is well suited
to this, having already worked the material — but this is a real
gap-finding pass, not a rubber stamp on the first draft.

At the same time, check `Issues/*.issue.md` for anything `outstanding`
and in-phase (in the active phase's `Phase<N>/` subfolder, or at
`Issues/`'s own top level, if `Issues/` is divided — ignore anything in
a deferred phase entirely) that concerns the idea being mined. If this
pass's drafting and gap-filling naturally resolves what it names, note
that for step 8. Per the `ideas` skill's "Issue-awareness beyond
`/ideas-check`/`/ideas-fix`" — opportunistic, not a mandate to chase
down unrelated issues.

Present each gap to the user directly and ask them to fill it; use
`AskUserQuestion` where there are concrete candidate answers, plain text
otherwise.

## 8. Finalize

Write the resolved draft back to `Features/<name>.feature.idea.md`
(wherever it lives — this step never relocates it between phases).

- **All meaningful gaps resolved, and the write-up reads as solid** —
  set `status: approved`, **this command's "complete" state.**
- **Gaps remain** (the user couldn't answer, or explicitly deferred
  them) — leave `status: pending` (still draft), and record the
  unresolved gaps directly in the file as an "Open questions" section —
  don't drop them silently just because the interview ended.

`inclusion` is untouched by this command — it stays `proposed` until the
human decides, via `/ideas-check`/`/ideas-fix`, whether to build, defer,
or drop it; drafting a solid write-up and deciding to pursue it are
separate questions.

If step 7 found a related issue this pass resolved, set `status:
resolved` in its frontmatter and append a `## Resolution` section to its
body now, alongside finalizing the feature file.

## Report

Summarize: which candidate was mined (and how it was chosen — given, or
picked from a presented list), which phase folder it landed in (if
`Features/` is divided), what the review and additional-information
step changed, what gaps were found and how many were resolved vs. left
open, any related issue resolved along the way, and the final `status`
(draft or complete).
