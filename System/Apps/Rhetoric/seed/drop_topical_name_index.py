"""Drops the unique sibling-name index from `topical_types` in an existing database, so two Types may share a name.
No row changes. Safe to run twice: an index that is already gone is left alone. A fresh database never creates the
index, because schema.sql does not define it.

Run: python3 -m seed.drop_topical_name_index   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3

from seed.db import DB_PATH, open_database

INDEX = "idx_topical_types_sibling_name"


def drop_index(conn: sqlite3.Connection) -> bool:
    """Whether the index was dropped (False: it was already gone)."""
    present = conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?", (INDEX,)).fetchone()
    if present is None:
        return False
    conn.execute(f"DROP INDEX {INDEX}")
    return True


def main() -> None:
    conn = open_database()
    with conn:
        dropped = drop_index(conn)
    conn.close()
    print(f"[seed] {DB_PATH.name}: {'sibling-name index dropped from topical_types' if dropped else 'no sibling-name index on topical_types (nothing to do)'}")


if __name__ == "__main__":
    main()
