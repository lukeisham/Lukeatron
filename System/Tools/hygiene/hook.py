"""Session hygiene: two Claude Code hooks that catch silent drift at the end of each turn. Neither is run by Luke.

    hook.py mark   after an Edit, Write or Bash call: note any touched path that hygiene cares about (a few milliseconds)
    hook.py stop   when a turn ends, over the paths noted this turn:
                     Long-Term touched      → memory_index.py sync (mechanical, idempotent); reports what it added or dropped
                     Skillbank touched      → a SKILL.md with no _index.yaml entry, or an entry with no SKILL.md, holds the turn once
                     Major-looking edits    → Long-Term, Outbox/, CLAUDE.md or a core skill edited with no plan written this
                                              session holds the turn once with the routing-gate question

Edits by the single-write skills are exempt from the plan question: the pastoral log (and the People/ records !PastoralNote
creates beside it) and LukeatronWiki (and the subject-store write !IdeaWiki makes with it). Shell commands count only
towards the index sync, never towards the plan question, because a command line cannot show what was written.

Both fail open: any trouble becomes one Memory/Long-Term/Logs/issues.log line and the hook exits quietly."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")
LONG_TERM = "Memory/Long-Term/"
WATCHED = (LONG_TERM, "Outbox/", "System/Skillbank/", "System/Plans/", ".claude/CLAUDE.md", ".claude/skills/")
HIGH_IMPACT = ("Outbox/", ".claude/CLAUDE.md", ".claude/skills/")
PASTORAL = LONG_TERM + "BalaclavaPC/Pastoral_Notes.table.md"
WIKI = LONG_TERM + "LukeatronWiki/"
NEVER_MAJOR = (LONG_TERM + "Logs/",)
BASH_PATH = re.compile(r"(Memory/Long-Term/[^\s\"'`;|&)]+|System/Skillbank/[^\s\"'`;|&)]*)")
STATE_DAYS = 7


def _state_path(root: Path, session: str) -> Path:
    return root / "System" / "Tools" / "hygiene" / "state" / f"{re.sub(r'[^A-Za-z0-9_-]', '', session) or 'default'}.json"


def _read_state(path: Path) -> dict:
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"started": time.time(), "edits": [], "shell": [], "plan": False, "wiki": False, "pastoral": False, "asked": []}


def _write_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state), encoding="utf-8")


def _relative(root: Path, raw: str) -> str | None:
    try:
        return Path(raw).resolve().relative_to(root.resolve()).as_posix()
    except (ValueError, OSError):
        return None


def touched(root: Path, event: dict) -> tuple[list[str], list[str]]:
    """(edited paths, shell-mentioned paths) this tool call may have changed, both limited to the WATCHED areas."""
    arguments = event.get("tool_input") or {}
    if event.get("tool_name") in EDIT_TOOLS:
        rel = _relative(root, arguments.get("file_path") or arguments.get("notebook_path") or "")
        return ([rel] if rel and rel.startswith(WATCHED) else []), []
    if event.get("tool_name") == "Bash":
        return [], sorted(set(BASH_PATH.findall(arguments.get("command", ""))))
    return [], []


def mark(root: Path, event: dict) -> None:
    edits, shell = touched(root, event)
    if not edits and not shell:
        return
    path = _state_path(root, event.get("session_id", ""))
    state = _read_state(path)
    state["edits"] = sorted(set(state["edits"]) | set(edits))
    state["shell"] = sorted(set(state["shell"]) | set(shell))
    state["plan"] = state["plan"] or any(p.startswith("System/Plans/") for p in edits)
    state["wiki"] = state["wiki"] or any(p.startswith(WIKI) for p in edits + shell)
    state["pastoral"] = state["pastoral"] or any(p.startswith(PASTORAL) for p in edits + shell)
    _write_state(path, state)


def sync_indexes(root: Path) -> list[str]:
    """Run the store-index sync; return its '+ Store/file' and '- Store/file' lines."""
    tool = root / "System" / "Tools" / "memory-index" / "memory_index.py"
    done = subprocess.run([sys.executable, str(tool), "sync"], capture_output=True, text=True, timeout=30, check=True)
    return [line for line in done.stdout.splitlines() if line[:2] in ("+ ", "- ")]


def catalog_gaps(root: Path) -> tuple[list[str], list[str]]:
    """(SKILL.md files with no catalog entry, catalog paths with no SKILL.md)."""
    catalog = root / "System" / "Skillbank" / "_index.yaml"
    listed = set(re.findall(r'^\s+path:\s*"?([^"\n]+?)"?\s*$', catalog.read_text(encoding="utf-8"), re.M))
    on_disk = {p.relative_to(root).as_posix() for p in (root / "System" / "Skillbank").glob("*/!*/SKILL.md")}
    return sorted(on_disk - listed), sorted(listed - on_disk)


def plan_written_since(root: Path, started: float) -> bool:
    plans = root / "System" / "Plans"
    return any(p.stat().st_mtime >= started for folder in ("New", "Completed") for p in (plans / folder).glob("*.md"))


def major_edits(state: dict) -> list[str]:
    found = []
    for rel in state["edits"]:
        if rel.startswith(HIGH_IMPACT):
            found.append(rel)
        elif rel.startswith(LONG_TERM) and not rel.startswith(NEVER_MAJOR) and not rel.endswith("/_index.yaml"):
            if rel.startswith((WIKI, PASTORAL)) or state["wiki"]:
                continue
            if state["pastoral"] and rel.startswith(LONG_TERM + "People/"):
                continue
            found.append(rel)
    return found


def _short(paths: list[str], limit: int = 4) -> str:
    return ", ".join(paths[:limit]) + (f" and {len(paths) - limit} more" if len(paths) > limit else "")


def stop(root: Path, event: dict) -> dict | None:
    """This turn's verdict: a block (held once) and/or a note for Luke, or None to end quietly."""
    path = _state_path(root, event.get("session_id", ""))
    if not path.is_file():
        return None
    state = _read_state(path)
    edits, shell = state["edits"], state["shell"]
    if not edits and not shell:
        return None
    notes, holds = [], []

    if any(p.startswith(LONG_TERM) for p in edits + shell):
        changed = sync_indexes(root)
        if changed:
            notes.append(f"hygiene: store indexes synced ({_short(changed)})")

    if any(p.startswith("System/Skillbank/") for p in edits + shell):
        unlisted, missing = catalog_gaps(root)
        key = "catalog:" + "|".join(unlisted + missing)
        if (unlisted or missing) and key not in state["asked"]:
            state["asked"].append(key)
            parts = []
            if unlisted:
                parts.append(f"{_short(unlisted)} has no entry in System/Skillbank/_index.yaml, so it is invisible")
            if missing:
                parts.append(f"the catalog lists {_short(missing)}, which is not on disk")
            holds.append("Skillbank catalog: " + "; ".join(parts) + ". Fix the catalog (CLAUDE.md *Skillbank*), then carry on.")

    major = major_edits(state)
    if major and "plan" not in state["asked"] and not state["plan"] and not plan_written_since(root, state["started"]):
        state["asked"].append("plan")
        holds.append(f"Routing gate: this session edited {_short(major)} — Long-Term, Outbox/ or High-impact files — and wrote no "
                     "plan in System/Plans/. In one line, say whether this was a minor task (and why) or Major; if Major, run "
                     "!CreatePlan now to record it. Confirm !Checkpoint ran for anything outgoing or any Long-Term change.")

    state["edits"], state["shell"] = [], []
    _write_state(path, state)
    verdict: dict = {}
    if holds and not event.get("stop_hook_active"):
        verdict.update({"decision": "block", "reason": " ".join(holds)})
    if notes:
        verdict["systemMessage"] = " · ".join(notes)
    return verdict or None


def prune_state(root: Path) -> None:
    cutoff = time.time() - STATE_DAYS * 86400
    for old in _state_path(root, "x").parent.glob("*.json"):
        if old.stat().st_mtime < cutoff:
            old.unlink(missing_ok=True)


def _log(root: Path, text: str) -> None:
    tool = root / "System" / "Tools" / "logs" / "logs.py"
    issue = f"hook {text} — System/Tools/hygiene/hook.py — reproduce with the same hook event and fix the cause"
    subprocess.run([sys.executable, str(tool), "issue", "hygiene", issue, "--severity", "Medium"], capture_output=True, timeout=10)


def main(argv: list[str]) -> int:
    mode = argv[0] if argv else ""
    try:
        event = json.load(sys.stdin)
        if mode == "mark":
            mark(ROOT, event)
        elif mode == "stop":
            verdict = stop(ROOT, event)
            prune_state(ROOT)
            if verdict:
                print(json.dumps(verdict))
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:  # a hook must never get in the way
        _log(ROOT, f"{mode}: {exc!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
