---
description: Ensure the four structural folders the `ideas` skill maintains exist under Ideation/ — Ideas/, Solutions/, Features/, Issues/. Idempotent; creates only what's missing.
allowed-tools: Bash(mkdir:*), Bash(ls:*), Bash(touch:*), Bash(git:*), Read
---

Initialize this repository's `Ideation/` space with the four folders the
`ideas` skill maintains (see `~/.claude/skills/ideas/SKILL.md`). Create
only what's missing; never touch or move anything that already exists.
Idempotent — safe to re-run.

## 1. Locate Ideation

`Ideation/` is a Utopia PDLC phase folder (see the `utopia` skill) at the
repository root. If it doesn't exist yet, create it too — but that's
unusual; normally `/utopia-init` or `/synergy-init` already did.

## 2. Create the four folders

For each, create it if missing. If it would otherwise be empty, add a
`.gitkeep` so git tracks it:

```
Ideation/Ideas/
Ideation/Solutions/
Ideation/Features/
Ideation/Issues/
```

Do not create `<Product>.problem.md`, `<Product>.solution.md`, or any
per-item file inside these folders (`.solution.md`, `.feature.idea.md`,
`.issue.md`) — those come from real notes and real decisions via the
`ideas` skill and `/ideas-check`, never scaffolded empty.

## 3. Report

Summarize which of the four folders were created versus already existed.

## 4. Offer to commit and push

Skip this step entirely if nothing was created (everything already
existed). Otherwise, offer to commit and push — ask, don't do it silently.
If accepted, stage what was created, commit with a message describing the
Ideation scaffold, and push to the tracked remote if one exists; if
there's no remote, commit locally and say so plainly.

If this command was invoked as part of `/utopia-init` or `/synergy-init`,
don't offer here too — let the invoking command's own commit step (or,
for `/utopia-init`, its auto-commit behavior) cover it, so the user isn't
asked to decide twice for one action.
