"""Brings an existing database's Topical Types up to nested Types (up to four levels deep, Luke 2026-10-06).

`topical_types` gains a `parent_id` column, and its old table-wide UNIQUE name is replaced by a name that is
unique among siblings (the index in schema.sql). SQLite cannot drop a UNIQUE constraint in place, so the table is
rebuilt with every existing Type kept as a top-level Type, with its id and position; placements point at the same
ids and are untouched. Safe to run twice. A fresh database gets the new shape from schema.sql directly.

Run: python3 -m seed.add_topical_nesting   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3

from seed.db import DB_PATH, SCHEMA_PATH


def needs_migration(conn: sqlite3.Connection) -> bool:
    return "parent_id" not in {column[1] for column in conn.execute("PRAGMA table_info(topical_types)")}


def migrate(conn: sqlite3.Connection) -> bool:
    """True when the table was rebuilt, False when it was already current."""
    if not needs_migration(conn):
        return False
    conn.execute("PRAGMA foreign_keys = OFF")  # the rebuild drops a table the placements point at; their rows are not touched
    try:
        with conn:
            conn.execute(
                "CREATE TABLE topical_types_new (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "parent_id INTEGER REFERENCES topical_types(id), name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0)")
            conn.execute("INSERT INTO topical_types_new (id, parent_id, name, position) SELECT id, NULL, name, position FROM topical_types")
            conn.execute("DROP TABLE topical_types")
            conn.execute("ALTER TABLE topical_types_new RENAME TO topical_types")
    finally:
        conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_PATH.read_text())  # the sibling-name and parent indexes
    return True


def main() -> None:
    conn = sqlite3.connect(DB_PATH)  # not open_database(): that applies schema.sql first, which needs the new column
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        print("[seed] topical_types rebuilt with parent_id" if migrate(conn) else "[seed] topical_types already current")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
