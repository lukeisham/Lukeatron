"""The two Claude Code hooks that make the family tool automatic. Neither is run by Luke.

    hook.py mark   after an Edit, Write or Bash call: if it touched a family app, note which one (a few milliseconds)
    hook.py stop   when a turn ends: if an app was noted, look for a real function change and, if there is one that Luke has
                   not already ruled on, hold the turn open once with a message sending Claude to the !AppPropagate skill

Both fail open: any trouble becomes one Memory/Long-Term/Logs/issues.log line and the hook exits quietly, so it can never block his work."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import changes
import policy as policy_rules
from registry import Family, is_function_file, load_family, locate

EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")


def _dirty_path(family: Family) -> Path:
    return family.state_dir / "dirty.json"


def _read_dirty(family: Family) -> set[str]:
    path = _dirty_path(family)
    return set(json.loads(path.read_text(encoding="utf-8"))) if path.is_file() else set()


def apps_touched(family: Family, event: dict) -> set[str]:
    """The members this tool call may have changed: the app an edited function file belongs to, or any app a shell command names."""
    arguments = event.get("tool_input") or {}
    if event.get("tool_name") in EDIT_TOOLS:
        found = locate(family, Path(arguments.get("file_path") or arguments.get("notebook_path") or "/"))
        return {found[0]} if found and is_function_file(family, found[1]) else set()
    if event.get("tool_name") == "Bash":
        command = arguments.get("command", "")
        return {name for name in family.members if f"Apps/{name}" in command}
    return set()


def mark(family: Family, event: dict) -> None:
    touched = apps_touched(family, event)
    if not touched:
        return
    family.state_dir.mkdir(parents=True, exist_ok=True)
    _dirty_path(family).write_text(json.dumps(sorted(_read_dirty(family) | touched)), encoding="utf-8")


def message(records: list[dict]) -> str:
    lines = []
    for record in records:
        files = ", ".join(entry["path"] for entry in record["files"][:6]) + (" …" if len(record["files"]) > 6 else "")
        decided = f" Luke's rules already send it to: {', '.join(record['targets'])}." if record["status"] == changes.DECIDED else ""
        lines.append(f"{record['app']} function changed ({files}); change id {record['id']}.{decided}")
    return ("Teaching App family: " + " ".join(lines) + " Read the Skillbank skill !AppPropagate "
            "(System/Skillbank/PersonalResearch/!AppPropagate/SKILL.md) and follow it: decide with Luke whether this goes to all, some or "
            "none of the other apps, then carry it. Say nothing else about it until it is settled.")


def stop(family: Family, event: dict) -> dict | None:
    """The block message for this turn's end, or None to let the turn end."""
    if event.get("stop_hook_active") or not _read_dirty(family):
        return None
    _dirty_path(family).unlink(missing_ok=True)
    attention = changes.detect(family, policy_rules.load_policy())
    if not attention:
        return None
    for record in attention:
        record["announced"] = True
        changes.write_record(family, record)
    return {"decision": "block", "reason": message(attention)}


def _log(family: Family, text: str) -> None:
    tool = family.root / "System" / "Tools" / "logs" / "logs.py"
    issue = f"hook {text} — System/Tools/teaching-app-family/hook.py — reproduce with the same hook event and fix the cause"
    subprocess.run([sys.executable, str(tool), "issue", "teaching-app-family", issue, "--severity", "Medium"], capture_output=True, timeout=10)


def main(argv: list[str]) -> int:
    mode = argv[0] if argv else ""
    family = load_family()
    try:
        event = json.load(sys.stdin)
        if mode == "mark":
            mark(family, event)
        elif mode == "stop":
            verdict = stop(family, event)
            if verdict:
                print(json.dumps(verdict))
    except (OSError, ValueError, KeyError, RuntimeError) as exc:  # a hook must never get in the way
        _log(family, f"{mode}: {exc!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
