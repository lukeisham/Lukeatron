#!/usr/bin/env python3
"""skilllog — the one way to write and read Lukeatron's skill logs.

Three logs, all in Memory/Long-Term/Logs/:
  skills.log     — one line per skill RUN (the record people and evals read)
  workers.log    — machine chatter from scripts and hooks (per-command browser calls, hook faults)
  history.log    — the system's history: one line per DECISION, PERMISSION or COMPLETED plan/project/improvement

Usage (from anywhere inside _Lukeatron):
  skilllog.py write  '!SkillName' SUCCESS|FAIL|HELD|"PHASE n" "one-line outcome" [--tokens N]
  skilllog.py worker '<source>'   SUCCESS|FAIL "one-line message"
  skilllog.py decide '<scope>' "what was decided, and the one-clause why"
  skilllog.py permit '<scope>' "what Luke allowed, for what, and any limit"
  skilllog.py complete 'plan:<slug>'|'project:<id>'|improvement "title; anything promoted"
  skilllog.py history [--kind DECISION|PERMISSION|COMPLETED] [--scope X] [--grep text] [-n 20]
  skilllog.py recent [--skill '!Name'] [--status FAIL] [--days N] [-n 20]
  skilllog.py summary [--days 30]

Canonical skills.log line (header of skills.log is the contract):
  [YYYY-MM-DDTHH:MM:SS] [AGENT: !<SkillName>] [<STATUS>] <one-line outcome> | tokens≈[N]

Canonical history.log line (one line, at most 240 characters, no narration):
  [YYYY-MM-DD] [DECISION|PERMISSION|COMPLETED] [<scope>] <text>
  <scope> is the thing affected: a skill (!Intake), app (ProjectDashboard), store (People),
  file (CLAUDE.md), `system`, or plan:<slug> / project:<id> / improvement for COMPLETED.

Set LUKEATRON_LOG_DIR to point at another folder (used for Sandbox tests).
"""
import argparse
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

STATUSES = {"SUCCESS", "FAIL", "HELD"}
PHASE = re.compile(r"^PHASE \d+$")
LINE = re.compile(r"^\[(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)[^\]]*\] \[AGENT: ?([^\]]+)\] \[([^\]]+)\] ?(.*)$")


def log_dir() -> Path:
    override = os.environ.get("LUKEATRON_LOG_DIR")
    if override:
        return Path(override)
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / ".claude" / "CLAUDE.md").exists():
            return parent / "Memory" / "Long-Term" / "Logs"
    sys.exit("skilllog: cannot find the _Lukeatron root (no .claude/CLAUDE.md above this script)")


def one_line(text: str) -> str:
    return " ".join(text.split())


def now() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def append(name: str, line: str) -> None:
    path = log_dir() / name
    with path.open("a", encoding="utf-8") as stream:
        stream.write(line + "\n")


def cmd_write(args) -> int:
    status = args.status.upper()
    if status not in STATUSES and not PHASE.match(status):
        print("skilllog: status must be SUCCESS, FAIL, HELD or 'PHASE n'", file=sys.stderr)
        return 2
    skill = args.skill if args.skill.startswith("!") else "!" + args.skill
    tokens = args.tokens if args.tokens else "n/a"
    append("skills.log", "[%s] [AGENT: %s] [%s] %s | tokens≈[%s]" % (now(), skill, status, one_line(args.message), tokens))
    return 0


DECISION_LIMIT = 240
KINDS = ("DECISION", "PERMISSION", "COMPLETED")
DECISION_LINE = re.compile(r"^\[(\d{4}-\d{2}-\d{2})\] \[(DECISION|PERMISSION|COMPLETED)\] \[([^\]]+)\] (.*)$")


def record(kind: str, scope: str, text: str) -> int:
    line = "[%s] [%s] [%s] %s" % (datetime.now().strftime("%Y-%m-%d"), kind, one_line(scope), one_line(text))
    if len(line) > DECISION_LIMIT:
        print("skilllog: decision line is %d characters; keep it to %d" % (len(line), DECISION_LIMIT), file=sys.stderr)
        return 2
    append("history.log", line)
    return 0


def cmd_decide(args) -> int:
    return record("DECISION", args.scope, args.text)


def cmd_permit(args) -> int:
    return record("PERMISSION", args.scope, args.text)


def cmd_complete(args) -> int:
    return record("COMPLETED", args.scope, args.text)


def cmd_history(args) -> int:
    path = log_dir() / "history.log"
    if not path.exists():
        return 0
    rows = [m for m in map(DECISION_LINE.match, path.read_text(encoding="utf-8").splitlines()) if m]
    if args.kind:
        rows = [m for m in rows if m.group(2) == args.kind.upper()]
    if args.scope:
        rows = [m for m in rows if args.scope.lower() in m.group(3).lower()]
    if args.grep:
        rows = [m for m in rows if args.grep.lower() in m.group(0).lower()]
    for m in rows[-args.n:]:
        print(m.group(0))
    return 0


def cmd_worker(args) -> int:
    append("workers.log", "[%s] [WORKER: %s] [%s] %s" % (now(), args.source, args.status.upper(), one_line(args.message)))
    return 0


def parse(days):
    path = log_dir() / "skills.log"
    if not path.exists():
        return []
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d") if days else ""
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        m = LINE.match(raw)
        if m and m.group(1) >= cutoff:
            rows.append({"date": m.group(1), "time": m.group(2), "skill": m.group(3).strip(),
                         "status": m.group(4).strip().upper(), "text": m.group(5), "raw": raw})
    rows.sort(key=lambda r: (r["date"], r["time"]))
    return rows


def cmd_recent(args) -> int:
    rows = parse(args.days)
    if args.skill:
        rows = [r for r in rows if r["skill"] == args.skill]
    if args.status:
        rows = [r for r in rows if r["status"].startswith(args.status.upper())]
    for r in rows[-args.n:]:
        print(r["raw"])
    return 0


def cmd_summary(args) -> int:
    counts = defaultdict(lambda: defaultdict(int))
    last = {}
    for r in parse(args.days):
        key = r["status"].split()[0]
        counts[r["skill"]][key if key in STATUSES else "OTHER"] += 1
        last[r["skill"]] = r["date"]
    print("%-28s %7s %5s %5s %5s  %s" % ("skill", "SUCCESS", "FAIL", "HELD", "OTHER", "last run"))
    for skill in sorted(counts, key=lambda s: -sum(counts[s].values())):
        c = counts[skill]
        print("%-28s %7d %5d %5d %5d  %s" % (skill, c["SUCCESS"], c["FAIL"], c["HELD"], c["OTHER"], last[skill]))
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("write"); w.add_argument("skill"); w.add_argument("status"); w.add_argument("message"); w.add_argument("--tokens")
    w.set_defaults(func=cmd_write)
    k = sub.add_parser("worker"); k.add_argument("source"); k.add_argument("status"); k.add_argument("message")
    k.set_defaults(func=cmd_worker)
    for name, func in (("decide", cmd_decide), ("permit", cmd_permit), ("complete", cmd_complete)):
        d = sub.add_parser(name); d.add_argument("scope"); d.add_argument("text")
        d.set_defaults(func=func)
    h = sub.add_parser("history"); h.add_argument("--kind", choices=KINDS, type=str.upper); h.add_argument("--scope"); h.add_argument("--grep"); h.add_argument("-n", type=int, default=20)
    h.set_defaults(func=cmd_history)
    r = sub.add_parser("recent"); r.add_argument("--skill"); r.add_argument("--status"); r.add_argument("--days", type=int); r.add_argument("-n", type=int, default=20)
    r.set_defaults(func=cmd_recent)
    s = sub.add_parser("summary"); s.add_argument("--days", type=int, default=30)
    s.set_defaults(func=cmd_summary)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
