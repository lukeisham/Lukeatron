"""Adds `definition` (an explanation) to `topical_types` in an existing database, so a Type can say what it means
as a Grammar label does. Each Type keeps its rows and ids; the new column starts as '' (no explanation yet, which the
screen leaves blank until Luke edits the Type). Safe to run twice: a column that is already there is left alone. A
fresh database gets the column from schema.sql instead.

Run: python3 -m seed.add_topical_definition   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3

from seed.db import DB_PATH, open_database


def has_column(conn: sqlite3.Connection) -> bool:
    return any(column[1] == "definition" for column in conn.execute("PRAGMA table_info(topical_types)"))


def add_column(conn: sqlite3.Connection) -> bool:
    """Whether the column was added (False: it was already there)."""
    if has_column(conn):
        return False
    conn.execute("ALTER TABLE topical_types ADD COLUMN definition TEXT NOT NULL DEFAULT ''")
    return True


def main() -> None:
    conn = open_database()
    with conn:
        added = add_column(conn)
    conn.close()
    print(f"[seed] {DB_PATH.name}: definition {'added to topical_types' if added else 'already on topical_types (nothing to do)'}")


if __name__ == "__main__":
    main()
