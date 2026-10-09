# Git and GitHub — How to Save and Push Work

Written 2026-09-20, after Dropbox corrupted `.git/index` three times. Applies to Lukeatron and to any other repo Luke works on.

## The one rule

**Never keep a `.git/` folder inside Dropbox.** Dropbox rewrites files behind git's back and produces "conflicted copy" index files. That makes `git status` show hundreds of false deletions, and a careless `git commit -a` could record them.

| Repo | Where git's database lives | Where the files live |
| :--- | :--- | :--- |
| Lukeatron | `~/.gitdirs/Lukeatron.git` (a one-line `.git` file in `_Lukeatron/` points to it) | Dropbox: `_Lukeatron/` |
| Any other repo | Its own folder outside Dropbox, e.g. `~/Developer/<repo>/` | Same folder |

If a project must live in Dropbox, keep its git database outside it: `git init --separate-git-dir ~/.gitdirs/<repo>.git`.

## Push Lukeatron changes to GitHub

Run these in `_Lukeatron/`. Remote: `origin` = `https://github.com/lukeisham/Lukeatron.git`, branch `main`.

```bash
git status -sb
git diff --cached --stat | tail -1
git add <the files you mean>
git commit -m "Short summary of the change"
git push origin main
```

- Only `System/`, `.claude/` and `.gitignore` are tracked. `Memory/`, `Inbox/`, `Outbox/` and the credentials folder never go to GitHub.
- Add named files, not `git add -A`. Do not use `git commit -a`.
- Before committing, check `git status` for a sane list. If it shows hundreds of deletions, stop and see "If status looks wrong".

## Push any other repo

```bash
cd ~/Developer/<repo>
git status -sb
git add <files>
git commit -m "Short summary"
git push
```

If the branch has no upstream yet, use `git push -u origin <branch>` the first time.

## Ask Claude to do it

Say "commit and push". Claude commits, then asks you before the push, because a push is outward-facing. Claude will not push without your yes in that session.

## If status looks wrong

1. Do not commit. Do not run `git add -A` or `git commit -a`.
2. Run `git log --oneline -3`. If HEAD is right, your history is fine and only the index is stale.
3. Run `git reset` (no `--hard`). It rebuilds the index from HEAD and does not touch your files.
4. If it happens again in Lukeatron, check that `.git` in `_Lukeatron/` is a one-line file, not a folder.

## Two Macs

Only one Mac should commit to Lukeatron: the MacBook Air. Both Macs work in the same Dropbox folder, so file edits reach both through Dropbox. Git history is kept separately on each Mac and shared through GitHub.

**How it is wired (set up 2026-09-22).** The `.git` file in `_Lukeatron/` uses a relative path, so each Mac reads its own database:

```
gitdir: ../../../../.gitdirs/Lukeatron.git
```

That path climbs from `~/Library/CloudStorage/Dropbox/_Lukeatron/` up to the home folder, then into `.gitdirs/`. It works on any Mac where the Dropbox folder sits in the same place. Never replace it with an absolute path such as `/Users/<name>/...`: Dropbox copies it to the other Mac, where the username differs, and git stops working there.

| Mac | Role | Git database |
| :--- | :--- | :--- |
| MacBook Air | Commits and pushes | `~/.gitdirs/Lukeatron.git` (the original) |
| Mac mini | Reads only; fetches after each MacBook push | `~/.gitdirs/Lukeatron.git` (a separate copy cloned from GitHub) |

**Catching up on the Mac mini** after the MacBook pushes:

```bash
cd ~/Library/CloudStorage/Dropbox/_Lukeatron
git fetch origin
git reset origin/main
git status -sb
```

`git reset` without `--hard` moves history and rebuilds the index but leaves your files alone. Do not use `--hard`, because Dropbox owns the files.

**Setting up a new Mac** (or repairing the mini):

```bash
mkdir -p ~/.gitdirs
git clone --bare https://github.com/lukeisham/Lukeatron.git ~/.gitdirs/Lukeatron.git
git --git-dir="$HOME/.gitdirs/Lukeatron.git" config core.bare false
git --git-dir="$HOME/.gitdirs/Lukeatron.git" config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
cd ~/Library/CloudStorage/Dropbox/_Lukeatron
git fetch origin
git reset
```

A bare clone has two gaps. It has no index, so until `git reset` runs, `git status` shows every tracked file as staged for deletion (harmless; do not commit in that state). It also has no fetch rule, so without the `remote.origin.fetch` line, `git fetch origin` downloads commits but never updates `origin/main`, and the catch-up `git reset origin/main` then fails or stays stale.

## Rollback copy

`~/.gitdirs/Lukeatron.git.backup-2026-09-20` is a full copy of the repository from before the move. Delete it once you are confident the moved repository is healthy.
