"""The seed pipeline's writable connection — the only one in the project.
server.py opens the same file `mode=ro`."""

from __future__ import annotations

import sqlite3
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
DB_PATH = APP_DIR / "rhetoric.db"
SCHEMA_PATH = APP_DIR / "schema.sql"


def open_database(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Open (creating if absent) the database and apply schema.sql, which is idempotent (MIG-3)."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8
    conn.executescript(SCHEMA_PATH.read_text())
    return conn
