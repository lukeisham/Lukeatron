---
description: Rewrite WAYPOINT.md as a full session-state snapshot so a fresh session (or person) can resume cold; commit and push it
allowed-tools: Read, Write, Bash(git:*), Bash(gh:*), Bash(ls:*)
---

Write a **waypoint**: overwrite `WAYPOINT.md` at the repository root
with a complete session-state snapshot, derived from this session and the
repo — do not ask what to include. The file is a rolling snapshot: replace
the previous content (note in the header that it supersedes the prior
waypoint and its date); history lives in git.

If `WAYPOINT.md` exists, read it first (required before overwriting, and
its header/format may carry project-specific conventions worth keeping).

## Required structure

```markdown
# WAYPOINT — <project name>

Date: <today>
Purpose: full session state so any future session (or person) can resume
exactly where this left off. Supersedes the <prior date> waypoint
(<one-line disposition of it>).

## 1. Where the project stands
   Overall state: what is complete/green/stable, what changed this
   session at the highest level (code vs docs vs planning).

## 2. Session products
   What this session produced, grouped, with the current commit hash and
   whether pushed. Include work installed OUTSIDE the repo (user-level
   skills/commands/config) — a fresh session can't discover those from
   the tree.

## 3. Decisions made (binding)
   Each with its short rationale or a pointer to the doc that records it.

## 4. Decisions pending
   The open questions that block work, each with its recommended answer
   if one exists. If nothing blocks, say so.

## 5. Next actions (in order)
   Concrete, resumable steps — commands, file paths, phase names — not
   aspirations.

## 6. Operational gotchas
   Environment traps a fresh session would hit (auth quirks, sync-client
   interference, filesystem case-sensitivity, flaky steps), each with its
   fix. Carry forward still-true gotchas from the prior waypoint.

## 7. Key files for a cold start
   An ordered "read these first" list with one-line reasons.
```

## After writing

1. Commit `WAYPOINT.md` with a message like
   `Waypoint <date>: <one-line session summary>`.
2. Push, following any project-specific push conventions (check memory
   and CLAUDE.md — e.g. required `gh auth switch` or branch rules). If
   push fails or there is no remote, report that plainly and leave the
   commit local.
3. Finish with a 2–3 sentence summary of what the waypoint captured and
   the single next action it points to.

If the working tree has uncommitted changes beyond `WAYPOINT.md`, do NOT
sweep them into the waypoint commit — list them in section 2 as
"uncommitted work" instead, and mention them in the final summary.
