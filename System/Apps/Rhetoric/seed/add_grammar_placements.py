"""Brings an existing database's grammar tables up to the editable Grammar group (Luke edits it in the app).

`grammar_labels` gains a `position` column (its order among sibling labels, set from the existing id order),
`grammar_placements` is created (the devices filed under each label, from schema.sql), and the retired
two-slot tables `device_labels` and `grammar_explanations` are dropped. The Grammar group has no slots, and
this refuses to run while either table holds any rows, rather than discard them. Safe to run twice. A fresh database
gets the new shape from schema.sql directly.

Run: python3 -m seed.add_grammar_placements   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3
import sys

from seed.db import SCHEMA_PATH, open_database

RETIRED = ("device_labels", "grammar_explanations")


def columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {column[1] for column in conn.execute(f"PRAGMA table_info({table})")}


def tables(conn: sqlite3.Connection) -> set[str]:
    return {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def needs_migration(conn: sqlite3.Connection) -> bool:
    return "position" not in columns(conn, "grammar_labels") or bool(tables(conn) & set(RETIRED))


def migrate(conn: sqlite3.Connection) -> bool:
    """True when the tables were changed, False when they were already current. Raises ValueError if rows would be lost."""
    if not needs_migration(conn):
        return False
    held = {table: count for table in RETIRED if table in tables(conn)
            if (count := conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])}
    if held:
        raise ValueError(f"retired grammar-slot rows would be lost ({held}); the slots were removed, so clear them by hand first")
    with conn:
        if "position" not in columns(conn, "grammar_labels"):
            conn.execute("ALTER TABLE grammar_labels ADD COLUMN position INTEGER NOT NULL DEFAULT 0")
            conn.execute(
                "UPDATE grammar_labels SET position = (SELECT COUNT(*) FROM grammar_labels o "
                "WHERE o.parent_id IS grammar_labels.parent_id AND o.id < grammar_labels.id)")
        for table in RETIRED:
            conn.execute(f"DROP TABLE IF EXISTS {table}")
    conn.executescript(SCHEMA_PATH.read_text())  # creates grammar_placements and its indexes
    return True


def main() -> None:
    conn = open_database()
    try:
        print("[seed] grammar tables brought up to date" if migrate(conn) else "[seed] grammar tables already current")
    except ValueError as exc:
        print(f"[seed] {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
