#!/usr/bin/env python3
"""Bring this Mac's git record up to GitHub at session start, without touching any file.

    gitsync.py            run as the SessionStart hook: fetch, then move the index to origin/main when safe
    gitsync.py --dry-run  say what it would do and change nothing

Dropbox copies the working tree between the two Macs, but each Mac keeps its own git directory, so the Mac that did not
commit falls behind its own files. This runs `git reset origin/main` (mixed: index and branch only) when all hold:
  - the branch is main, and origin/main is ahead of it
  - this Mac has no commits of its own that GitHub lacks
  - no file the incoming commits change still holds this Mac's old committed version (Dropbox has finished copying)
Otherwise it changes nothing and says why. It never fails the session: every outcome exits 0.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

LUKEATRON = Path(__file__).resolve().parents[3]
ROOT = Path(os.environ.get("GITSYNC_ROOT", LUKEATRON))  # set only by the tests
LOGS = LUKEATRON / "System/Tools/logs/logs.py"
FETCH_TIMEOUT = 15


def git(*args, timeout=10):
    result = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"git {args[0]}: {result.stderr.strip() or result.stdout.strip()}")
    return result.stdout


def blob(rev, path):
    """The object id of `path` at `rev`, or None when the file is absent there."""
    try:
        return git("rev-parse", "--verify", "-q", f"{rev}:{path}").strip() or None
    except RuntimeError:
        return None


def on_disk(path):
    """The object id of `path` as it stands in the working tree, or None when it is absent."""
    full = ROOT / path
    return git("hash-object", "--", path).strip() if full.is_file() else None


def lagging(old, new):
    """Files the incoming commits change whose working copy still matches this Mac's old commit, not GitHub's."""
    paths = [p for p in git("diff", "--name-only", "--no-renames", old, new).splitlines() if p]
    return [p for p in paths if on_disk(p) == blob(old, p) != blob(new, p)]


def log_issue(message):
    subprocess.run([sys.executable, str(LOGS), "issue", "gitsync", message, "--severity", "Medium"], capture_output=True, timeout=10)


def report(user, context=None):
    out = {"systemMessage": f"🔄 git sync: {user}"}
    if context:
        out["hookSpecificOutput"] = {"hookEventName": "SessionStart", "additionalContext": f"git sync: {context}"}
    print(json.dumps(out))


def sync(dry_run):
    branch = git("rev-parse", "--abbrev-ref", "HEAD").strip()
    if branch != "main":
        return report(f"on branch {branch}, not main; left alone")
    try:
        git("fetch", "-q", "origin", timeout=FETCH_TIMEOUT)
    except (RuntimeError, subprocess.TimeoutExpired):
        return report("could not reach GitHub; left alone", "GitHub was unreachable at session start, so this Mac's git "
                      "may be behind. Run `git fetch` and check `git status -sb` before committing.")
    ahead = int(git("rev-list", "--count", "origin/main..HEAD"))
    behind = int(git("rev-list", "--count", "HEAD..origin/main"))
    if behind == 0:
        return None
    if ahead > 0:
        return report(f"held: this Mac has {ahead} unpushed commit(s) and GitHub has {behind} new one(s)",
                      f"this Mac's main has {ahead} commit(s) GitHub lacks and is {behind} behind origin/main. Nothing was "
                      "reset. Tell Luke and ask before rebasing or resetting.")
    old = git("rev-parse", "HEAD").strip()
    stale = lagging(old, "origin/main")
    if stale:
        shown = ", ".join(stale[:5]) + (" …" if len(stale) > 5 else "")
        return report(f"held: Dropbox has not finished copying {len(stale)} file(s); start a new session shortly",
                      f"{behind} commit(s) on GitHub, but these files still hold this Mac's old version: {shown}. Nothing "
                      "was reset. Do not commit them: that would undo the other Mac's work.")
    if dry_run:
        return report(f"would catch up {behind} commit(s)")
    git("reset", "-q", "origin/main")
    changed = len([line for line in git("status", "--porcelain").splitlines() if line])
    tail = f"; {changed} file(s) still uncommitted" if changed else "; nothing uncommitted"
    return report(f"caught up {behind} commit(s) from the other Mac{tail}",
                  f"this Mac's git was reset (index only) to origin/main, {behind} commit(s) ahead of the old HEAD{tail}.")


def main():
    try:
        sync("--dry-run" in sys.argv[1:])
    except Exception as error:  # a hook must never block the session
        log_issue(f"SessionStart sync crashed: {str(error)[:200]} — System/Tools/gitsync/gitsync.py — run it with --dry-run to reproduce")
        report(f"failed ({error}); left alone")


if __name__ == "__main__":
    main()
