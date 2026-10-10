"""Applies seed/popularity.json to the database, then gives each Flipside device its fallacy's score:
one transaction, `UPDATE devices SET popularity` and nothing else (seed/classification-criteria.md, "Merging new popularity data"). Not load_devices.py.
Refuses to run unless every device in the file exists exactly once in the database and every
database device is in the file.

Run: python3 -m seed.update_popularity            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import sqlite3
import sys

from seed.db import open_database
from seed.popularity_pass import OUT_PATH


def apply_scores(conn: sqlite3.Connection, scores: dict[str, int]) -> int:
    """Set popularity for every device named in `scores`; returns rows changed."""
    names = [name for name, in conn.execute("SELECT name FROM devices")]
    if sorted(names) != sorted(scores):
        raise ValueError(f"devices differ: only in database {sorted(set(names) - set(scores))}, "
                         f"only in popularity.json {sorted(set(scores) - set(names))}")
    changed = 0
    with conn:
        for name, score in scores.items():
            changed += conn.execute("UPDATE devices SET popularity = ? WHERE name = ? AND popularity != ?",
                                    (score, name, score)).rowcount
        # A Flipside device is named by no source, so it takes its fallacy's score.
        changed += conn.execute(
            "UPDATE devices SET popularity = (SELECT f.popularity FROM devices f WHERE f.id = devices.flipside_of) "
            "WHERE flipside_of IS NOT NULL AND popularity != "
            "(SELECT f.popularity FROM devices f WHERE f.id = devices.flipside_of)").rowcount
    return changed


def main() -> None:
    scores = {row["name"]: row["popularity"] for row in json.loads(OUT_PATH.read_text())["devices"]}
    conn = open_database()
    try:
        print(f"[seed] popularity updated on {apply_scores(conn, scores)} of {len(scores)} devices")
    except ValueError as error:
        print(f"[seed] {error}", file=sys.stderr)
        sys.exit(1)
    conn.close()


if __name__ == "__main__":
    main()
