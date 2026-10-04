"""Brings an existing database's grammar tables up to the two-slot shape (Grammar function and
Grammar form, each with labels and an example; see GRAMMAR SLOTS in schema.sql).

`device_labels` gains a `slot` column and `grammar_explanations` splits `example` into
`function_example` and `form_example`. SQLite cannot change a primary key in place, so both tables
are dropped and recreated from schema.sql. They have no writer but seed/load_grammar.py, so this
refuses to run while either holds rows: an old-shape row cannot say which slot it belonged to.
Safe to run twice. A fresh database gets the new shape from schema.sql directly. Afterwards,
fill seed/grammar.json in the new shape and run seed.load_grammar.

Run: python3 -m seed.add_grammar_slots   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3
import sys

from seed.db import SCHEMA_PATH, open_database


def columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {column[1] for column in conn.execute(f"PRAGMA table_info({table})")}


def needs_migration(conn: sqlite3.Connection) -> bool:
    return "slot" not in columns(conn, "device_labels") or "function_example" not in columns(conn, "grammar_explanations")


def row_counts(conn: sqlite3.Connection) -> dict[str, int]:
    return {table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ("device_labels", "grammar_explanations")}


def migrate(conn: sqlite3.Connection) -> bool:
    """True when the tables were rebuilt, False when they were already current. Raises ValueError if rows would be lost."""
    if not needs_migration(conn):
        return False
    held = {table: count for table, count in row_counts(conn).items() if count}
    if held:
        raise ValueError(f"old-shape grammar rows would be lost ({held}); clear them first (they are rebuilt from seed/grammar.json by seed.load_grammar)")
    with conn:
        conn.execute("DROP TABLE device_labels")
        conn.execute("DROP TABLE grammar_explanations")
    conn.executescript(SCHEMA_PATH.read_text())
    return True


def main() -> None:
    conn = open_database()
    try:
        print("[seed] grammar slots added" if migrate(conn) else "[seed] grammar tables already have the slots")
    except ValueError as exc:
        print(f"[seed] {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
