---
name: "!MultiRepo"
description: >
  Operate across multiple product repositories that live as sibling folders under a common
  workspace directory — e.g. extracting a module shared by two products into a new or existing
  shared repo, and wiring it back as a package dependency into consumers. Use when asked to
  share/reuse code between repos, extract a module into its own repo, or set up a shared-modules
  repo. Only applies when the current working directory is a workspace folder containing multiple
  git repos as direct subfolders — never inside a single repo. Renamed from Keith's "meta" skill
  for clarity; part of the Wayfinder suite.
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Extract and re-wire shared code across sibling repos without losing history or force-pushing over an existing repo."
version: 1.0.0
dependencies: [git, "gh CLI", "!Utopia (destination scaffold)", "!Readme"]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Meta

Operations that span **multiple repositories**, as opposed to `utopia`,
`specs`, `ideas`, and `readme`, which all operate *within* one repo. A
`meta` operation's subject is the relationship between repos — "this code
belongs in a different repo than the one it's in" — not anything inside a
single repo's own structure.

## The model

A solo dev or small team keeps several product repos as sibling folders
under one workspace directory (e.g. `Ops~Products/KVL`,
`Ops~Products/MarkAs`, each usually Utopia-structured — see the `utopia`
skill). Most of the time each product owns its own code outright. Sometimes
code is genuinely reusable across two or more products — not "similar,"
actually the same logic serving the same purpose — and forcing one product
to own it (with the others depending on that product wholesale, or worse,
copy-pasting) is the wrong shape. That code deserves its own repo, consumed
by each product as a normal package dependency.

## Guard clause — read this before running any `meta` command

**Meta operations only run from a workspace folder — never from inside a
single repo.** Before doing anything, check both:

1. `git rev-parse --is-inside-work-tree` from the current directory must
   **fail or print `false`** — if it prints `true`, the current directory
   is inside a repo (at any depth, not just the root), and no `meta`
   operation should run. Stop and explain: "This looks like it's running
   inside a repo (`<repo name>`). `meta` commands operate *between*
   sibling repos from the workspace folder that contains them — try again
   from one level up."
2. At least one immediate subfolder of the current directory must contain
   its own `.git` — check with
   `find . -mindepth 2 -maxdepth 2 -name .git -type d`. If nothing is
   found, this isn't a multi-repo workspace either; stop and explain.

Both checks must pass before proceeding. This isn't a formality — a `meta`
command run from inside a repo would misinterpret "this repository" the
same way a per-repo skill does, and end up operating on the wrong thing (or
nothing at all).

## Commands under this skill

- **`/meta-reuse`** — extract a module from one product repo into a new or
  existing shared repo, and wire it as a package dependency into one or
  more consumer repos. Generic version of the KVL→LanguageLibrary AST
  extraction; works for any language/module, not just Swift/SPM (SPM is
  the only ecosystem with worked instructions today — see that command's
  own notes).

## Keep this skill current

This skill is new and has one command. As `meta` operations turn up
patterns beyond "extract and wire a dependency" (e.g. syncing a shared
module's version across every consumer, auditing which repos depend on
what), fold them back into this file and add commands under
`~/.claude/commands/`, following the same guard-clause discipline.
