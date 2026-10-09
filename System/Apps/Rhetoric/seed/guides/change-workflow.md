# Changing seed data or the database

What to do before and after an agent edits `seed/devices.json`, `rhetoric.db` or the code.

Git is the rollback point for `seed/devices.json`, `rhetoric.db` and the code. Before an agent edits any of them, the state about to be changed must already sit in a commit: run `git status -- System/Apps/Rhetoric` and, if it lists changes, commit them first (with Luke's go-ahead, and not with unrelated work mixed in). Then make the change, run the tests and commit it as its own commit, so one change is one commit and `git checkout <commit> -- <file>` undoes it. `rhetoric.db` is binary, so a diff will not show what changed inside it: the commit message names the change, and the `app-decisions.md` row records the commit. Pushing stays Luke's call.
