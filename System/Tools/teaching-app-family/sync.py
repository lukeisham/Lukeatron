"""The command line of the Teaching App family tool, for the !AppPropagate skill (and Luke, if he ever wants it). Every
command prints JSON. The hook (hook.py) finds changes; this carries them.

    snapshot [App ...]            accept the apps' current function files as their baseline
    check                         look for new changes now (the hook does this when a turn ends)
    pending                       the changes not yet finished
    plan <id> [--to A,B]          what carrying a change would do to each target, without writing anything
    diff <id> <path>              the source app's own edit to one file
    decide <id> --to all|none|A,B [--remember GLOB]
                                  record where the change goes; --remember also sets a standing rule
    apply <id>                    write every result that merged cleanly; list what is left for hand work
    finish <id>                   accept the result as the new baseline everywhere and close the change
    undo <id>                     put back every file `apply` replaced"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import changes
import policy as policy_rules
import port
from registry import Family, load_family, siblings


def _targets(family: Family, record: dict, choice: str | None) -> list[str]:
    names = record["targets"] if choice is None else siblings(family, record["app"]) if choice == "all" else choice.split(",")
    unknown = [name for name in names or [] if name not in family.members or name == record["app"]]
    if names is None or unknown:
        raise ValueError(f"no usable targets ({', '.join(unknown) or 'not decided yet'})")
    return names


def _public(plans: dict[str, list[dict]]) -> dict[str, list[dict]]:
    return {name: [{key: value for key, value in entry.items() if key != "merged"} for entry in files] for name, files in plans.items()}


def decide(family: Family, record: dict, choice: str, remember: str | None, policy_path: Path = policy_rules.POLICY_PATH) -> dict:
    """`none` closes the change (its files become the baseline); anything else records the targets. `remember` also writes
    a standing rule for the files so the next such change needs no question."""
    if remember:
        policy_rules.remember(policy_rules.load_policy(policy_path), record["app"], remember, choice if choice in ("all", "none") else "ask", policy_path)
    if choice == "none":
        changes.accept(family, record["app"], [entry["path"] for entry in record["files"]])
        record["status"] = changes.DISMISSED
    else:
        record.update(status=changes.DECIDED, targets=_targets(family, record, choice))
    changes.write_record(family, record)
    return record


def finish(family: Family, record: dict) -> dict:
    paths = [entry["path"] for entry in record["files"]]
    for app in [record["app"], *(record["targets"] or [])]:
        changes.accept(family, app, paths)
    changes.set_active(family, None)
    record["status"] = changes.DONE
    changes.write_record(family, record)
    return record


def run(argv: list[str]) -> dict:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["snapshot", "check", "pending", "plan", "diff", "decide", "apply", "finish", "undo"])
    parser.add_argument("target", nargs="*")
    parser.add_argument("--to")
    parser.add_argument("--remember")
    args = parser.parse_args(argv)
    family = load_family()
    undo_dir = family.state_dir / "undo"
    if args.command == "snapshot":
        return changes.snapshot(family, args.target or None)
    if args.command == "check":
        return {"attention": changes.detect(family, policy_rules.load_policy())}
    if args.command == "pending":
        return {"open": changes.open_records(family)}
    record = changes.read_record(family, args.target[0])
    if args.command == "diff":
        return {"diff": port.unified_diff(family, record["app"], args.target[1])}
    if args.command == "decide":
        return decide(family, record, args.to or "ask", args.remember)
    if args.command == "plan":
        return _public(port.plan(family, record, _targets(family, record, args.to)))
    if args.command == "apply":
        targets = _targets(family, record, None)
        changes.set_active(family, record["id"], [*targets, record["app"]])  # the source stays in step until finish
        record["status"] = changes.APPLYING
        changes.write_record(family, record)
        return port.apply(family, record["id"], port.plan(family, record, targets), undo_dir)
    if args.command == "finish":
        return finish(family, record)
    return {"restored": port.undo(family, record["id"], undo_dir)}


def main(argv: list[str]) -> int:
    try:
        print(json.dumps(run(argv), indent=2))
    except (ValueError, FileNotFoundError, RuntimeError, KeyError, json.JSONDecodeError) as exc:
        print(f"{datetime.now():%Y-%m-%d %H:%M} family tool: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
