"""Carrying one app's change into another: the source file's old and new text are put into the target's own names
(its name, database file, port), then three-way merged with the target's file, so what the target already has differently
survives and only what changed arrives. What cannot be merged, or reads like it is about the source's own words, is
reported for a person (or the skill) to settle rather than guessed."""

from __future__ import annotations

import difflib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from registry import Family, Member, baseline_path, is_only_in

CLEAN, REVIEW, CONFLICT, ADDED, SKIPPED, MANUAL, REMOVED = "clean", "review", "conflict", "added", "skipped", "manual", "removed"


def forward(text: str, source: Member, target: Member) -> str:
    """The text with the source app's own names put into the target's. Only names that cannot be mistaken for other words
    are changed: the capitalised app name, its database file and settings keys, and its port. The item noun is left alone,
    because a word like "form" is also code (see `noun_lines`)."""
    text = re.sub(rf"\b{source.name}\b", target.name, text)
    text = re.sub(rf"\b{source.db}\.(db|toggles|defaultSort|opened)\b", rf"{target.db}.\1", text)
    return re.sub(rf"\b{source.port}\b", str(target.port), text)


def merge3(ours: str, base: str, theirs: str) -> tuple[str, bool]:
    """`git merge-file`: (the merged text, whether it had conflicts)."""
    with tempfile.TemporaryDirectory() as folder:
        files = {}
        for name, text in (("ours", ours), ("base", base), ("theirs", theirs)):
            files[name] = Path(folder) / name
            files[name].write_text(text, encoding="utf-8")
        result = subprocess.run(["git", "merge-file", "-p", str(files["ours"]), str(files["base"]), str(files["theirs"])],
                                capture_output=True, text=True, check=False)
    if result.returncode < 0 or result.returncode > 127:
        raise RuntimeError(f"git merge-file failed: {result.stderr.strip()}")
    return result.stdout, result.returncode > 0


def noun_lines(before: str, after: str, source: Member, target: Member) -> list[str]:
    """Lines that arrived in `after` and speak of the source's item noun, which the target words differently. Nothing
    when both use the same noun."""
    if source.item == target.item:
        return []
    noun = re.compile(rf"\b({source.item}|{source.items})\b", re.IGNORECASE)
    arrived = set(after.splitlines()) - set(before.splitlines())
    return sorted(line.strip() for line in arrived if noun.search(line))


def plan_file(family: Family, change: dict, rel: str, kind: str, source: Member, target: Member) -> dict:
    """What carrying one changed file into one target would do: `{path, status, merged, lines}`, where `merged` is the new
    text to write (None when nothing can be written) and `lines` any reasons to look."""
    entry = {"path": rel, "status": CLEAN, "merged": None, "lines": []}
    if is_only_in(family, source.name, rel):
        return entry | {"status": SKIPPED, "lines": [f"only in {source.name}"]}
    theirs_file = family.apps_dir / source.name / rel
    ours_file = family.apps_dir / target.name / rel
    if kind == "removed":
        return entry | {"status": REMOVED, "lines": ["the source deleted this file"]}
    theirs = forward(theirs_file.read_text(encoding="utf-8"), source, target)
    if not ours_file.is_file():
        return entry | {"status": ADDED, "merged": theirs}
    base_file = baseline_path(family, source.name, rel)
    if kind == "added" or not base_file.is_file():
        return entry | {"status": CONFLICT, "lines": ["no earlier version to compare against"]}
    base = forward(base_file.read_text(encoding="utf-8"), source, target)
    ours = ours_file.read_text(encoding="utf-8")
    merged, conflicted = merge3(ours, base, theirs)
    if conflicted:
        return entry | {"status": CONFLICT, "lines": ["the same lines differ in both apps"]}
    if merged == ours:
        return entry | {"status": SKIPPED, "lines": ["already the same in the target"]}
    words = noun_lines(ours, merged, source, target)
    return entry | {"status": REVIEW if words else CLEAN, "merged": merged, "lines": words}


def plan(family: Family, change: dict, targets: list[str]) -> dict[str, list[dict]]:
    """The per-file plan for each target; a manual member gets one note instead of a merge."""
    source = family.members[change["app"]]
    result = {}
    for name in targets:
        target = family.members[name]
        if source.mode == "manual" or target.mode == "manual":
            result[name] = [{"path": entry["path"], "status": MANUAL, "merged": None,
                             "lines": [f"{source.name if source.mode == 'manual' else target.name} has diverged; port by hand"]}
                            for entry in change["files"]]
        else:
            result[name] = [plan_file(family, change, entry["path"], entry["kind"], source, target) for entry in change["files"]]
    return result


def unified_diff(family: Family, app: str, rel: str) -> str:
    """The source app's own change to a file, baseline to now, for porting a conflict by hand."""
    base, now = baseline_path(family, app, rel), family.apps_dir / app / rel
    before = base.read_text(encoding="utf-8").splitlines(keepends=True) if base.is_file() else []
    after = now.read_text(encoding="utf-8").splitlines(keepends=True) if now.is_file() else []
    return "".join(difflib.unified_diff(before, after, f"{app}/{rel} (before)", f"{app}/{rel} (now)"))


def apply(family: Family, change_id: str, plans: dict[str, list[dict]], undo_dir: Path) -> dict[str, list[dict]]:
    """Writes every clean, review and added result into its target, keeping the file it replaces in `undo_dir` so
    `undo` can put it back. Returns the plan with `merged` dropped, which is what is left to do by hand (conflict, manual)."""
    summary = {}
    for name, files in plans.items():
        for entry in files:
            if entry["merged"] is None:
                continue
            destination = family.apps_dir / name / entry["path"]
            saved = undo_dir / change_id / name / entry["path"]
            saved.parent.mkdir(parents=True, exist_ok=True)
            if destination.is_file():
                shutil.copy2(destination, saved)
            else:
                saved.with_name(saved.name + ".absent").write_text("", encoding="utf-8")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(entry["merged"], encoding="utf-8")
        summary[name] = [{key: value for key, value in entry.items() if key != "merged"} for entry in files]
    return summary


def undo(family: Family, change_id: str, undo_dir: Path) -> list[str]:
    """Puts back every file `apply` replaced and removes any it created; returns what it restored."""
    restored = []
    root = undo_dir / change_id
    for saved in sorted(root.rglob("*")) if root.is_dir() else []:
        if not saved.is_file():
            continue
        app, *parts = saved.relative_to(root).parts
        rel = Path(*parts).as_posix()
        absent = rel.endswith(".absent")
        target = family.apps_dir / app / (rel[: -len(".absent")] if absent else rel)
        if absent:
            target.unlink(missing_ok=True)
        else:
            shutil.copy2(saved, target)
        restored.append(f"{app}/{target.relative_to(family.apps_dir / app).as_posix()}")
    return restored
