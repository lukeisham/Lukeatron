"""The writable connection to style.db for whatever loads entries into it; server.py opens the same file `mode=ro`
for reading. Run as `python3 -m seed.db` to create an empty database from schema.sql (safe on an existing one: the
schema only creates what is missing)."""

from __future__ import annotations

import sqlite3
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
DB_PATH = APP_DIR / "style.db"
SCHEMA_PATH = APP_DIR / "schema.sql"


def open_database(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Open (creating if absent) the database and apply schema.sql, which is idempotent (MIG-3)."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8
    conn.executescript(SCHEMA_PATH.read_text())
    return conn


if __name__ == "__main__":
    open_database().close()
    print(f"{DB_PATH.name} is ready.")
