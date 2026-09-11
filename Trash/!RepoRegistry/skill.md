---
name: "!RepoRegistry"
description: >
  Manage ~/_REPOS.md, the list of GitHub accounts/orgs available when creating new repositories,
  and the conventions /repo-new follows to create and wire up a new GitHub repo for the current
  local directory. Use when asked about GitHub repo owners, adding a new org/account, or how
  /repo-new picks a default owner or visibility. Renamed from Keith's "repo" skill for clarity
  (distinct from !RepoRegistry vs. a code repo itself). Part of the Wayfinder suite.
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Never let /repo-new guess a GitHub owner, type, or visibility it hasn't been told about."
version: 1.0.0
dependencies: ["~/_REPOS.md (outside _Lukeatron/ — home directory)", "gh CLI"]
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Repo

Tracks the GitHub accounts/orgs this workspace creates repositories
under, in `~/_REPOS.md` — one row per owner, kept at the home-directory
level so it applies across every local repo on this machine, not scoped
to a single product.

## `~/_REPOS.md`

```
| Name | GitHub login | Type | Default | Visibility |
|---|---|---|---|---|
| <display name> | <github login> | org \| personal | yes (at most one row) | Private \| Public |
```

- **`Type`** is `org` or `personal` — determines whether `/repo-new` needs
  a `gh auth switch` before creating the repo (a `personal` account other
  than the currently active one) or can create directly (`org`, under
  whichever `gh` account is currently active, as long as it belongs to
  that org).
- **`Default`** is `yes` on at most one row — the owner `/repo-new`
  proposes first, labeled "(Recommended)", unless the user picks
  differently for that run.
- **`Visibility`** is `Private` or `Public` — this owner's usual choice.
  `/repo-new` still asks every time (getting a repo's visibility wrong is
  exactly the kind of easy-to-miss, hard-to-reverse mistake worth a
  confirmation), but proposes this value first, labeled "(Recommended)",
  rather than defaulting to a blanket assumption that ignores which
  owner was picked.

Add a row for every new org/account as it comes into use — one row per
owner. Never invent an owner not listed here: if `/repo-new` needs one
that isn't in the table, add it first (asking the user for its login,
type, and visibility) rather than guessing any of those three.

## `/repo-new`

Creates a GitHub repository for the current local directory and wires it
up as `origin`, using this file for the owner and visibility choices —
see the command itself for the full mechanics (confirmation, `gh auth
switch` handling for personal accounts, remote creation, offering to
push).
