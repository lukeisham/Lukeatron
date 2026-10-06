"""Adds `tables_json` to `grammar_labels` and `topical_types` in an existing database, so a label or Type can
carry tables (labeltables.py). Each label keeps its rows and ids; the new column starts as '[]' (no tables).
Safe to run twice: a column that is already there is left alone. A fresh database gets both columns from
schema.sql instead.

Run: python3 -m seed.add_label_tables   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3

from seed.db import DB_PATH, open_database

TABLES = ("grammar_labels", "topical_types")


def has_column(conn: sqlite3.Connection, table: str) -> bool:
    return any(column[1] == "tables_json" for column in conn.execute(f"PRAGMA table_info({table})"))


def add_columns(conn: sqlite3.Connection) -> list[str]:
    """The tables that gained the column (the names are the constants above, never user input)."""
    added = []
    for table in TABLES:
        if not has_column(conn, table):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN tables_json TEXT NOT NULL DEFAULT '[]'")
            added.append(table)
    return added


def main() -> None:
    conn = open_database()
    with conn:
        added = add_columns(conn)
    conn.close()
    print(f"[seed] {DB_PATH.name}: tables_json added to {', '.join(added) if added else 'nothing (already there)'}")


if __name__ == "__main__":
    main()
