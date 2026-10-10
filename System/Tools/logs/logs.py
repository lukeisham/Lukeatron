#!/usr/bin/env python3
"""logs — the one way to write and read Lukeatron's two logs, both in Memory/Long-Term/Logs/.

  history.log — every DECISION and PERMISSION whose effect reaches beyond one file, plus every
                Vibe-Coding rule-exception PERMISSION (even when it covers one file).
                [YYYY-MM-DD] [DECISION|PERMISSION] [<scope>] <current rule or grant> — <why>
  issues.log  — anything that could make Lukeatron better: defects, gaps, script faults, failed skills.
                [YYYY-MM-DD] [OPEN|RESOLVED] [Low|Medium|High] [<scope>] <problem> — <where> — <fix hint>

<scope> names the thing affected exactly: a skill (!Intake), app (ProjectDashboard), store (People),
file path, or `system`. Lines are written for an agent: one line, present tense, exact paths, no narration.

Usage (from anywhere):
  logs.py decide '<scope>' "<rule> — <why>"            history.log, at most 240 characters
  logs.py permit '<scope>' "<grant and its limit> — <why>"
  logs.py history [--kind DECISION|PERMISSION] [--scope X] [--grep text] [-n 20]
  logs.py issue  '<scope>' "<problem> — <where> — <fix hint>" [--severity Low|Medium|High]
  logs.py issues [--open] [--scope X] [--grep text] [-n 50]
  logs.py resolve "<unique text from the issue>" "<how it was resolved>"

Set LUKEATRON_LOG_DIR to point at another folder (used for Sandbox tests).
"""
import argparse
import os
import re
import sys
from datetime import date
from pathlib import Path

HISTORY_LIMIT = 240
ISSUE_LIMIT = 400
KINDS = ("DECISION", "PERMISSION")
SEVERITIES = ("Low", "Medium", "High")
HISTORY_LINE = re.compile(r"^\[(\d{4}-\d{2}-\d{2})\] \[(DECISION|PERMISSION)\] \[([^\]]+)\] (.+)$")
ISSUE_LINE = re.compile(r"^\[(\d{4}-\d{2}-\d{2})\] \[(OPEN|RESOLVED)\] \[(Low|Medium|High)\] \[([^\]]+)\] (.+)$")


def log_dir() -> Path:
    override = os.environ.get("LUKEATRON_LOG_DIR")
    if override:
        return Path(override)
    for parent in Path(__file__).resolve().parents:
        if (parent / ".claude" / "CLAUDE.md").exists():
            return parent / "Memory" / "Long-Term" / "Logs"
    sys.exit("logs: cannot find the _Lukeatron root (no .claude/CLAUDE.md above this script)")


def one_line(text: str) -> str:
    return " ".join(text.split())


def append(name: str, line: str) -> None:
    with (log_dir() / name).open("a", encoding="utf-8") as stream:
        stream.write(line + "\n")


def lines(name: str) -> list[str]:
    path = log_dir() / name
    return path.read_text(encoding="utf-8").splitlines() if path.exists() else []


def record(kind: str, scope: str, text: str) -> int:
    line = "[%s] [%s] [%s] %s" % (date.today().isoformat(), kind, one_line(scope), one_line(text))
    if len(line) > HISTORY_LIMIT:
        print("logs: history line is %d characters; the limit is %d" % (len(line), HISTORY_LIMIT), file=sys.stderr)
        return 2
    append("history.log", line)
    return 0


def cmd_history(args) -> int:
    rows = [m for m in map(HISTORY_LINE.match, lines("history.log")) if m]
    if args.kind:
        rows = [m for m in rows if m.group(2) == args.kind]
    if args.scope:
        rows = [m for m in rows if args.scope.lower() in m.group(3).lower()]
    if args.grep:
        rows = [m for m in rows if args.grep.lower() in m.group(0).lower()]
    for m in rows[-args.n:]:
        print(m.group(0))
    return 0


def cmd_issue(args) -> int:
    line = "[%s] [OPEN] [%s] [%s] %s" % (date.today().isoformat(), args.severity, one_line(args.scope), one_line(args.text))
    if len(line) > ISSUE_LIMIT:
        print("logs: issue line is %d characters; the limit is %d" % (len(line), ISSUE_LIMIT), file=sys.stderr)
        return 2
    append("issues.log", line)
    return 0


def cmd_issues(args) -> int:
    rows = [m for m in map(ISSUE_LINE.match, lines("issues.log")) if m]
    if args.open:
        rows = [m for m in rows if m.group(2) == "OPEN"]
    if args.scope:
        rows = [m for m in rows if args.scope.lower() in m.group(4).lower()]
    if args.grep:
        rows = [m for m in rows if args.grep.lower() in m.group(0).lower()]
    for m in rows[-args.n:]:
        print(m.group(0))
    return 0


def cmd_resolve(args) -> int:
    path = log_dir() / "issues.log"
    text = lines("issues.log")
    hits = [i for i, raw in enumerate(text) if raw.startswith("[") and "] [OPEN] [" in raw and args.match in raw]
    if len(hits) != 1:
        print("logs: %d open issues match; give text that matches exactly one" % len(hits), file=sys.stderr)
        return 2
    i = hits[0]
    text[i] = text[i].replace("] [OPEN] [", "] [RESOLVED] [", 1) + " — resolved %s: %s" % (date.today().isoformat(), one_line(args.how))
    path.write_text("\n".join(text) + "\n", encoding="utf-8")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name, kind in (("decide", "DECISION"), ("permit", "PERMISSION")):
        d = sub.add_parser(name); d.add_argument("scope"); d.add_argument("text")
        d.set_defaults(func=lambda a, kind=kind: record(kind, a.scope, a.text))
    h = sub.add_parser("history"); h.add_argument("--kind", choices=KINDS, type=str.upper); h.add_argument("--scope"); h.add_argument("--grep"); h.add_argument("-n", type=int, default=20)
    h.set_defaults(func=cmd_history)
    i = sub.add_parser("issue"); i.add_argument("scope"); i.add_argument("text"); i.add_argument("--severity", choices=SEVERITIES, type=str.capitalize, default="Low")
    i.set_defaults(func=cmd_issue)
    s = sub.add_parser("issues"); s.add_argument("--open", action="store_true"); s.add_argument("--scope"); s.add_argument("--grep"); s.add_argument("-n", type=int, default=50)
    s.set_defaults(func=cmd_issues)
    r = sub.add_parser("resolve"); r.add_argument("match"); r.add_argument("how")
    r.set_defaults(func=cmd_resolve)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
