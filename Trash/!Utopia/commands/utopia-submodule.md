---
description: Convert one existing Utopia PDLC folder or activity subfolder into its own git submodule. Only run against a folder the user explicitly names — never proactively, even if the utopia skill mentioned this as a future possibility.
allowed-tools: Bash(git:*), Bash(ls:*), Bash(mkdir:*), Read
---

Convert **one folder**, explicitly named by the user, from a plain folder
in this Utopia repo into its own git repository wired in as a submodule.
This rewrites how that folder is tracked — confirm the target and the
destination remote before touching anything.

## 1. Confirm scope

Ask if not already given:
- The folder path (e.g. `Specification/`, `Projects/<Name>/`).
- The destination: an existing empty remote repo, or one to create now.
- Whether the folder's git history should be preserved (via `git subtree
  split` or `git filter-repo --path <folder>`) or the new repo should
  start fresh with a single commit. Either is legitimate — it's the
  user's call, not a default to assume.

## 2. Extract

If preserving history, split the folder's history into a temporary local
repo (`git filter-repo --path <folder> --path-rename <folder>:` run
against a throwaway clone, or `git subtree split -P <folder>`) so the new
repo's history reflects only that folder's commits, not the whole Utopia
repo's.

## 3. Stand up the new remote

Push the extracted (or fresh) repo to the confirmed destination.

## 4. Wire it back in as a submodule

In the Utopia root:
```
git rm -r <folder>
git commit -m "Extract <folder> to its own repository"
git submodule add <remote-url> <folder>
git commit -m "Add <folder> as a submodule"
```

## 5. Verify and report

Confirm `git submodule update --init --recursive` works from a clean
clone of the Utopia root. Report the new remote URL and the two commits
made.

## Cautions

- Never force-push or rewrite the Utopia root's own history to do this —
  only the extracted folder's history moves, via a fresh repo.
- Don't run this speculatively. "The `utopia` skill says this is
  possible" is not the same as "the user asked for it now."
