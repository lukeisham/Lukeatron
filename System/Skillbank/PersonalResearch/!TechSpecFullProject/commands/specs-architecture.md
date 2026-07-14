---
description: Propose a product/project architecture from its top-level PRD, writing it into <name>.arch.spec.md — module breakdown, subsystem grouping with facades where warranted, design patterns, dependencies and technology. Interviews the user (as software engineer) against a Gap Register to resolve anything the PRD leaves open.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git:*), Read, Write, Edit, AskUserQuestion, Agent
---

Propose an architecture for the product/project described in its
top-level PRD, and write it to `<name>.arch.spec.md` (the `specs` skill's
architecture-decisions type). Read `~/.claude/skills/specs/SKILL.md`
first if it isn't already loaded this session — this command produces one
of its typed documents and follows its conventions.

Throughout, the user is the **software engineer**: you are proposing on
their behalf, not deciding on theirs. Surface gaps and assumptions rather
than resolving them silently.

## 1. Find the PRD

Look for `<name>-PRD.spec.md`: check `Specification/` first (Utopia
layout), then the repo root — the same two locations `/specs-prd` writes
to. If none exists, say so and offer to run `/specs-prd` first rather
than inventing an architecture from nothing. If more than one PRD exists,
ask the user which one this architecture is for.

Read the full PRD before drafting.

## 2. Propose with a Fable-backed subagent

Don't draft this yourself in the top-level session — **delegate the
proposal to a subagent**, via the `Agent` tool, with `model: "fable"` and
`subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 3 needs its output before
continuing). This follows this project's ideation→spec model policy:
Fable for spec-drafting steps, the top-level session's own model for
everything mechanical — proposing an architecture from a PRD is the
former. Give the subagent the full PRD text and ask it to return exactly
these four things, full stop — no extra sections:

- **Module breakdown** — the product's modules/components and each one's
  responsibility.
- **Subsystems and facades** — where modules cluster into a subsystem,
  group them and name the facade that fronts it (the interface the rest
  of the system depends on instead of the subsystem's internals); skip
  this for modules that don't warrant grouping.
- **Design patterns** — which ones are used, where, and why.
- **Dependencies and technology** — languages, frameworks, libraries,
  infrastructure the architecture commits to.

Express all of it as numbered decisions (`AD-n`: decision, rationale,
alternatives rejected), per the specs skill's `.arch.spec.md` convention
— a module boundary, a subsystem grouping, a facade, a chosen pattern, or
a chosen dependency are each an architectural decision made on the user's
behalf and need rationale plus what was rejected.

Also ask the subagent to return a **Gap Register**: anywhere the PRD
doesn't give enough information to make a confident decision, record a
`GAP-n` entry (what's missing, why it blocks a decision, the default
assumption used if the draft had to guess to keep moving) instead of
silently picking one.

## 3. Interview the software engineer

Present every `GAP-n` entry to the user directly — this is the cheapest
point to correct direction, before code exists. Use `AskUserQuestion`
when a gap has concrete candidate answers; ask in plain text when it
doesn't. Update the affected `AD-n` decisions with their answers. Never
delete a `GAP-n` entry — mark it `Resolved` in place with the resolution,
same discipline as the `ideas` skill's `Issues/` convention. A gap the
user says "you decide" on stays open only if they explicitly decline to
choose; otherwise resolve it before finalizing.

## 4. Name and place the file

- `<name>` matches the PRD's `<name>` (same product/project).
- Output path: same folder as the PRD — `Specification/<name>.arch.spec.md`
  if a `Specification/` folder exists (Utopia layout), otherwise
  `<name>.arch.spec.md` at the repo root.

## 5. Write and report

Write the final file: Module breakdown, Subsystems & facades, Design
patterns, Dependencies & technology, the full `AD-n` decision log, and
the Gap Register (open and resolved entries alike, per the specs skill's
"never delete, mark resolved in place" convention). Cross-reference the
PRD by relative markdown link. Report what was proposed, what the user
resolved during the interview, and what (if anything) is still open in
the Gap Register.

## 6. Review gate — module division sign-off

This is a hard gate: **no spec generation happens off this architecture
until the software engineer has explicitly reviewed and approved it.**
Present the finished file and call out the **module breakdown** and how
modules were grouped into subsystems specifically — that's the
structural commitment every later `_Builds/`/`_Spikes/` spec will build
on top of, so it's worth more than a general "looks good." Ask directly
whether the division holds or needs adjusting. A reply that only
addresses something else (e.g. a dependency choice) doesn't count as
sign-off on the module split — ask again if the module division itself
hasn't been engaged with.

If the engineer wants changes, revise the file (and its affected `AD-n`
decisions) and re-present; this can iterate more than once. Don't move on
to step 7 or mention `_Builds/`/`_Spikes/` follow-on work until the
module/subsystem division has explicit sign-off.

## 7. Commit

Once the review gate has passed: if this is a Utopia repo (has the
phase-folder structure), follow the `utopia` skill's auto-commit-and-push
convention and its stated exceptions (no remote, rejected push, etc.).
Otherwise, offer to commit rather than doing it silently.

## Handoff

This architecture is the whole-product or whole-project structure, not a
subtask, and step 6's gate must have passed before this handoff can
start. Once it has, and the user is ready to turn part of it into
implementation work, that graduates to the `specs` skill's own workflow —
typically a `_Builds/` spec/plan pair per module or subsystem —
referencing this `.arch.spec.md` rather than duplicating it.
