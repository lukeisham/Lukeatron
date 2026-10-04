"""Which devices still lack a real quote? Read-only; writes nothing.

What counts as a real quote is decided by quotes.py (a credit, or a closing parenthesis citing a work).

Run: python3 -m seed.quote_status                        (list devices with no real quote)
     python3 -m seed.quote_status --draw 5 --seed 20261006   (a repeatable random draw of 5 of them)
"""

from __future__ import annotations

import argparse
import random
import sqlite3
import sys

from quotes import is_real_quote
from seed.db import DB_PATH


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
