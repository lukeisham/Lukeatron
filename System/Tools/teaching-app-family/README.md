# Teaching App family tool

Keeps the code of the Teaching App family (Rhetoric, Grammar, Logic, Research, Writing, Style) in step. When an app's *function* changes (its code, not its data), the tool notices at the end of the turn, asks Luke once whether the change goes to all, some or none of the other apps, carries it by three-way merge into each chosen app's own names, and leaves the apps' tests as the check. Luke never starts it: a Claude Code hook starts it, and the `!AppPropagate` Skillbank skill finishes it.

## Navigation
```
teaching-app-family/
├── family.json · policy.json
├── registry.py · policy.py · changes.py · port.py
├── sync.py
├── hook.py
├── tests/
└── state/            (local, not in git)
    ├── baseline/<App>/…
    ├── pending/<id>.json
    ├── undo/<id>/<App>/…
    ├── dirty.json
    └── active.json
```

## Cross-app behaviour
```
 Edit / Write / Bash touches System/Apps/<member>
        │  PostToolUse hook  →  hook.py mark       (notes the app; ~50 ms; silent)
        ▼
 turn ends ── Stop hook ──→  hook.py stop
        │   nothing noted, or nothing really changed ........ ends quietly
        │   changes.detect: function files vs state/baseline
        │      policy settles it (only app-only files, or a rule says none) ... accepted silently
        │      otherwise: holds the turn once, naming the change id
        ▼
 Claude reads Skillbank skill  !AppPropagate
        │   asks Luke one question; sync.py decide / plan / apply
        │   settles conflicts by hand; runs each target's tests
        │   delegates an app still in its build phase to !AppDevelopment
        ▼
 sync.py finish  →  every touched file becomes the baseline; the loop is quiet again
```
- **Settings.** The two hooks are entries in `.claude/settings.json` (`PostToolUse` matching `Edit|Write|MultiEdit|NotebookEdit|Bash`, and `Stop`) that run `hook.py`. A hook that fails writes to `Memory/Long-Term/Logs/workers.log` and exits quietly; it can never stop a turn by itself failing.
- **What is function.** `family.json`: `function_globs` are the shared code, `data_globs` are never tracked, and `only` lists files that exist in one app alone (Style's image grid) and so are never carried. A new app is added to `members` (database name, port, item noun and its `mode`).
- **Merge mode.** `port.forward` puts the source's app name, database file, settings keys and port into the target's, then `git merge-file` merges the source's baseline, the source's new file and the target's file. The item noun (pattern, form, topic, element) is not renamed, because a word like "form" is also code; lines that arrive speaking of the source's noun are marked `review`, and lines that both apps changed are a `conflict`. Neither is written; `apply` writes only what merged cleanly.
- **Manual mode.** Rhetoric has diverged (devices, Topical and Grammar groups), so a change from or to it is reported as a note, never merged.
- **Policy.** `policy.json` holds the standing answers (`all`, `none`, `ask`) by app and file glob; `sync.py decide … --remember GLOB` adds one at the front. A change whose files all say `none`, or are app-only, is accepted silently.
- **Skill.** `System/Skillbank/PersonalResearch/!AppPropagate/SKILL.md` is the only reader of `sync.py`'s output besides Luke; it is listed in `System/Skillbank/_index.yaml`.
- **Undo.** `apply` copies every file it replaces into `state/undo/<id>`; `sync.py undo <id>` restores them.
- **Tests.** `python3 -m unittest discover -s tests -p "test_*.py"` from this folder; they build a throwaway family and touch no app.
