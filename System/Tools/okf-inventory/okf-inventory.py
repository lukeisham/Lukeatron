#!/usr/bin/env python3
"""
okf-inventory.py — Inventories every Long-Term .md file (excluding Logs/),
reports whether it has frontmatter and whether that frontmatter has a `type`
key, and emits a worklist + compliance count.

Usage:
    python3 okf-inventory.py <long-term-root> [--worklist out.txt]

Compliant = has frontmatter AND has type AND has title AND has description.
"""
import sys
import re
from pathlib import Path

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def parse_frontmatter(text):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    block = m.group(1)
    keys = set()
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line and not line.startswith(("-", " ")):
            key = line.split(":", 1)[0].strip()
            if key:
                keys.add(key)
    return keys


def main():
    if len(sys.argv) < 2:
        print("usage: okf-inventory.py <long-term-root> [--worklist out.txt]")
        sys.exit(1)
    root = Path(sys.argv[1])
    worklist_path = None
    if "--worklist" in sys.argv:
        worklist_path = Path(sys.argv[sys.argv.index("--worklist") + 1])

    total = 0
    compliant = 0
    worklist = []

    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if rel.parts[0] == "Logs":
            continue
        total += 1
        text = path.read_text(encoding="utf-8", errors="replace")
        keys = parse_frontmatter(text)
        if keys is None:
            worklist.append(f"NO-FRONTMATTER\t{rel}")
            continue
        missing = [k for k in ("type", "title", "description") if k not in keys]
        if missing:
            worklist.append(f"MISSING:{','.join(missing)}\t{rel}")
        else:
            compliant += 1

    print(f"Total .md files (excl. Logs/): {total}")
    print(f"Compliant (type+title+description present): {compliant}")
    print(f"Non-compliant: {total - compliant}")

    if worklist_path:
        worklist_path.write_text("\n".join(worklist) + "\n", encoding="utf-8")
        print(f"Worklist written to {worklist_path} ({len(worklist)} entries)")
    else:
        for line in worklist:
            print(line)


if __name__ == "__main__":
    main()
