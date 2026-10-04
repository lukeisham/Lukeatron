"""Which devices still lack a real quote? Read-only; writes nothing.

A real quote is an example that has a credit (attribution other than 'Unattributed') OR whose closing
parenthesis cites a work: an italic title, a date or locator (any digit) or 'trans.'. The second test
catches real quotes with anonymous authors (the Rhetorica ad Herennium). A constructed example's
parenthesis only explains it ("(hang: cooperate / execute)") and carries none of these.

Run: python3 -m seed.quote_status                        (list devices with no real quote)
     python3 -m seed.quote_status --draw 5 --seed 20261006   (a repeatable random draw of 5 of them)
"""

from __future__ import annotations

import argparse
import random
import re
import sqlite3
import sys

from seed.db import DB_PATH

CITES_A_WORK = re.compile(r"\*[^*]+\*|\d|trans\.")


def closing_parenthesis(body: str) -> str:
    """The text inside the last top-level parenthesis if the example ends with one, else ''."""
    text = body.rstrip()
    if not text.endswith(")"):
        return ""
    depth = 0
    for i in range(len(text) - 1, -1, -1):
        if text[i] == ")":
            depth += 1
        elif text[i] == "(":
            depth -= 1
            if depth == 0:
                return text[i + 1:-1]
    return ""


def is_real_quote(attribution: str, body: str) -> bool:
    return attribution != "Unattributed" or bool(CITES_A_WORK.search(closing_parenthesis(body)))


def devices_without_quote(conn: sqlite3.Connection) -> list[str]:
    """Names of devices none of whose examples is a real quote, alphabetical."""
    has: dict[str, bool] = {name: False for name, in conn.execute("SELECT name FROM devices")}
    for name, attribution, body in conn.execute(
            "SELECT d.name, e.attribution, e.body FROM examples e JOIN devices d ON d.id = e.device_id"):
        if is_real_quote(attribution, body):
            has[name] = True
    return sorted(name for name, found in has.items() if not found)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--draw", type=int, help="print a random draw of this many devices")
    parser.add_argument("--seed", type=int, help="seed for --draw, so the draw can be repeated")
    args = parser.parse_args(argv)
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    names = devices_without_quote(conn)
    if args.draw:
        names = random.Random(args.seed).sample(names, min(args.draw, len(names)))
    print(f"{len(names)} device(s)")
    for name in names:
        print(name)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
