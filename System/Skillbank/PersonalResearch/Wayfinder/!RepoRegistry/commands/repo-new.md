---
description: Create a new GitHub repository for the current local repo, defaulting to the Kaleido Labs org as owner but offering any account/org listed in ~/_REPOS.md. Creates the remote, adds it as `origin`, and offers to push.
allowed-tools: Bash(gh:*), Bash(git:*), Read, AskUserQuestion
---

Create a GitHub repository for **the current working directory** and wire
it up as this local repo's `origin`. This is the standard way new
product/project repos in this workspace get a GitHub home. Read
`~/.claude/skills/repo/SKILL.md` first if it isn't already loaded this
session — it defines `~/_REPOS.md`'s format and conventions, which this
command follows.

## 1. Read the owner list

Read `~/_REPOS.md`. It's a Markdown table of `Name | GitHub login | Type |
Default | Visibility` rows, per the `repo` skill. The row with `Default:
yes` is the default owner unless the user picks differently below. If the
file is missing, tell the user and stop — don't invent owners.

## 2. Confirm owner, repo name, and visibility

Ask via `AskUserQuestion`:
- **Owner**: every row from `~/_REPOS.md` as an option, the `Default: yes`
  row first and labeled "(Recommended)".
- **Visibility**: `Private` or `Public`, with whichever the chosen
  owner's `Visibility` column says labeled "(Recommended)" — ask this
  after the owner is picked, so the recommendation reflects that owner's
  usual setting rather than a fixed default.

Repo name defaults to the current directory's folder name — state it
plainly rather than asking, unless the user's invocation passed an
explicit name as an argument (then use that instead).

## 3. Ensure a local git repo exists

If the current directory isn't already a git repository (`git status`
fails), run `git init`. Don't touch an existing repo's history or
branches.

## 4. Check for an existing `origin`

If a remote named `origin` already exists, stop and tell the user what
it currently points to — don't silently overwrite it. Ask explicitly if
they want to replace it before proceeding.

## 5. Create the repo and add the remote

- If the chosen owner's `Type` is `org`: `gh repo create <login>/<name>
  --private|--public --source=. --remote=origin`. This works under the
  currently active `gh` account as long as it belongs to that org — no
  account switch needed.
- If the chosen owner's `Type` is `personal` and it is **not** the
  currently active `gh` account (`gh auth status`), switch to it first
  (`gh auth switch --user <login>`), run the same `gh repo create
  <login>/<name> ...` command, then switch back to whichever account was
  active before — don't leave the user's active `gh` account changed as a
  side effect.

## 6. Offer to push

If the local repo has at least one commit, offer to push the current
branch to the new `origin` — ask, don't push automatically. If there are
no commits yet, say so and skip the push (nothing to push yet); the repo
and remote are still set up.

## 7. Report

State the repo's URL, which owner/visibility were used, and whether the
push happened (or why it didn't).
