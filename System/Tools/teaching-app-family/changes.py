"""Noticing that an app's function changed. Each member has a baseline: a copy of its function files as last accepted
(state/baseline). A change is whatever now differs from the baseline, kept as a small record in state/pending until it is
carried to the other apps or dismissed. Data (databases, images, decisions, About text) is never in the baseline."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import policy as policy_rules
from registry import Family, baseline_path, digest, function_files, siblings

PENDING, DECIDED, APPLYING, DONE, DISMISSED = "pending", "decided", "applying", "done", "dismissed"


def _pending_dir(family: Family) -> Path:
    return family.state_dir / "pending"


def snapshot(family: Family, apps: list[str] | None = None) -> dict[str, int]:
    """Accepts each app's current function files as its baseline; returns the file count per app."""
    counts = {}
    for app in apps or list(family.members):
        shutil.rmtree(family.state_dir / "baseline" / app, ignore_errors=True)
        for rel in function_files(family, app):
            target = baseline_path(family, app, rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(family.apps_dir / app / rel, target)
        counts[app] = len(function_files(family, app))
    return counts


def accept(family: Family, app: str, rels: list[str]) -> None:
    """Makes the app's current version of these files (or their absence) the baseline."""
    for rel in rels:
        source, target = family.apps_dir / app / rel, baseline_path(family, app, rel)
        if source.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        else:
            target.unlink(missing_ok=True)


def changed_files(family: Family, app: str) -> list[dict[str, str]]:
    """Every function file that differs from the baseline: `{path, kind}` with kind modified, added or removed. An app with
    no baseline has nothing to differ from, so it reports nothing."""
    baseline = family.state_dir / "baseline" / app
    if not baseline.is_dir():
        return []
    now = set(function_files(family, app))
    before = {path.relative_to(baseline).as_posix() for path in baseline.rglob("*") if path.is_file()}
    changed = [{"path": rel, "kind": "added"} for rel in sorted(now - before)]
    changed += [{"path": rel, "kind": "removed"} for rel in sorted(before - now)]
    changed += [{"path": rel, "kind": "modified"} for rel in sorted(now & before)
                if digest(family.apps_dir / app / rel) != digest(baseline_path(family, app, rel))]
    return changed


def read_record(family: Family, change_id: str) -> dict:
    return json.loads((_pending_dir(family) / f"{change_id}.json").read_text(encoding="utf-8"))


def write_record(family: Family, record: dict) -> None:
    _pending_dir(family).mkdir(parents=True, exist_ok=True)
    (_pending_dir(family) / f"{record['id']}.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")


def open_records(family: Family) -> list[dict]:
    """The changes not yet finished or dismissed, oldest first."""
    folder = _pending_dir(family)
    records = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(folder.glob("*.json"))] if folder.is_dir() else []
    return [record for record in records if record["status"] in (PENDING, DECIDED, APPLYING)]


def active_targets(family: Family) -> set[str]:
    """Apps being written to by a propagation in progress: their changes are that propagation's, not new ones."""
    lock = family.state_dir / "active.json"
    return set(json.loads(lock.read_text(encoding="utf-8"))["targets"]) if lock.is_file() else set()


def set_active(family: Family, change_id: str | None, targets: list[str] | None = None) -> None:
    lock = family.state_dir / "active.json"
    if change_id is None:
        lock.unlink(missing_ok=True)
        return
    family.state_dir.mkdir(parents=True, exist_ok=True)
    lock.write_text(json.dumps({"id": change_id, "targets": targets or []}), encoding="utf-8")


def detect(family: Family, rules: dict, now: datetime | None = None) -> list[dict]:
    """Looks for new function changes and returns the records that need Luke's attention and have not been announced.
    A change the policy settles (nothing can travel, or a rule says none) is accepted into the baseline and dropped here; one
    a rule says should go everywhere comes back already decided."""
    stamp = (now or datetime.now()).strftime("%Y%m%d-%H%M%S")
    existing = {record["app"]: record for record in open_records(family) if record["status"] != APPLYING}
    skipping = active_targets(family)
    attention = []
    for app in family.members:
        files = changed_files(family, app) if app not in skipping else []
        if not files:
            continue
        paths = [entry["path"] for entry in files]
        verdict = policy_rules.outcome(family, rules, app, paths)
        record = existing.get(app) or {"id": f"{stamp}-{app}", "app": app, "status": PENDING, "announced": False, "targets": None}
        record["files"] = files
        if verdict == policy_rules.NONE:
            accept(family, app, paths)
            record["status"] = DISMISSED
            write_record(family, record)
            continue
        if verdict == policy_rules.ALL and record["status"] == PENDING:
            record.update(status=DECIDED, targets=siblings(family, app))
        write_record(family, record)
        if not record["announced"]:
            attention.append(record)
    return attention
