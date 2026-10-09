#!/usr/bin/env python3
"""Port registry tool for System/Apps/ports.json.

    ports.py list           print the register
    ports.py next <band>    print the lowest free port in a band (core|tool|app|test)
    ports.py check          compare the register with the ports hard-coded across the tree;
                            exit 1 on a clash, an unregistered port or a mismatch
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REGISTRY = ROOT / "System/Apps/ports.json"
SCAN = [
    ("System/Apps/*/server.py", re.compile(r"^PORT\s*=\s*(\d{4})\b", re.M)),
    ("System/Apps/*/*.sh", re.compile(r"^PORT=\"?\$?\{?[A-Z_]*:?-?(\d{4})", re.M)),
    ("System/Apps/*/paths.py", re.compile(r"PORT\D{0,40}?(\d{4})")),
    ("System/Tools/*/serve.py", re.compile(r"^PORT\s*=\s*(\d{4})\b", re.M)),
    ("System/Widgets/**/server.py", re.compile(r"^PORT\s*=\s*(\d{4})\b", re.M)),
    ("System/Apps/Home/settings.json", re.compile(r"\"port\"\s*:\s*(\d{4})")),
    ("System/Apps/Home/catalog.json", re.compile(r"\"port\"\s*:\s*(\d{4})")),
    ("System/Tools/teaching-app-family/family.json", re.compile(r"\"port\"\s*:\s*(\d{4})")),
    (".claude/launch.json", re.compile(r"\"port\"\s*:\s*(\d{4})")),
]


def load():
    return json.loads(REGISTRY.read_text())


def cmd_list(reg):
    for port, entry in sorted(reg["ports"].items()):
        print(f"{port}  {entry['band']:<5} {entry['name']:<26} {entry['path']}")


def cmd_next(reg, band):
    if band not in reg["bands"]:
        sys.exit(f"unknown band {band!r}; choose from {', '.join(reg['bands'])}")
    lo, hi = reg["bands"][band]["range"]
    for port in range(lo, hi + 1):
        if str(port) not in reg["ports"]:
            print(port)
            return
    sys.exit(f"band {band} is full")


def cmd_check(reg):
    problems = []
    for port, entry in reg["ports"].items():
        lo, hi = reg["bands"][entry["band"]]["range"]
        if not lo <= int(port) <= hi and "note" not in entry:
            problems.append(f"{port} {entry['name']}: outside its {entry['band']} band")
    seen = {}
    for pattern, rx in SCAN:
        for path in sorted(ROOT.glob(pattern)):
            if any(part in ("Archive", "Trash", "node_modules", "tests") for part in path.parts):
                continue
            for match in rx.finditer(path.read_text(errors="ignore")):
                port = match.group(1)
                rel = str(path.relative_to(ROOT))
                seen.setdefault(port, set()).add(rel)
                if port not in reg["ports"]:
                    problems.append(f"{port} in {rel}: not in ports.json")
    for port, paths in seen.items():
        owner = reg["ports"].get(port, {}).get("path", "")
        shared = {"System/Apps/Home/catalog.json", ".claude/launch.json",
                  "System/Tools/teaching-app-family/family.json", "System/Apps/Home/settings.json"}
        owners = {p for p in paths if p not in shared}
        strays = {p for p in owners if owner and not p.startswith(owner.split("/tests/")[0])}
        for stray in sorted(strays):
            problems.append(f"{port} in {stray}: registered to {reg['ports'][port]['name']} ({owner})")
    for line in problems:
        print("✗", line)
    if problems:
        sys.exit(1)
    print(f"✓ {len(reg['ports'])} ports registered, {len(seen)} found in the tree, no clashes")


def main(argv):
    reg = load()
    if argv[:1] == ["list"]:
        cmd_list(reg)
    elif argv[:1] == ["next"] and len(argv) == 2:
        cmd_next(reg, argv[1])
    elif argv[:1] == ["check"]:
        cmd_check(reg)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
