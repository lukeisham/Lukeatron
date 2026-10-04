"""Adds `examples.quote_date` to an existing database and fills it from seed/devices.json.

An example's date is the optional `"date"` in its devices.json entry ('YYYY' or 'YYYY-MM-DD'); an
example without one stays NULL (date not known). An example is matched by device name and example
text, so Topical Types and placements are untouched. Safe to run twice: the column is added only when
missing, and the dates are rewritten from devices.json each time. A fresh database gets the column
from schema.sql instead.

Run: python3 -m seed.add_quote_date   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import sqlite3
import sys

from seed.db import DB_PATH, open_database
from seed.load_devices import DEVICES_PATH

DATE_CHECK = (
    "CHECK (quote_date IS NULL OR quote_date GLOB '[0-9][0-9][0-9][0-9]' "
    "OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')"
)


def has_quote_date_column(conn: sqlite3.Connection) -> bool:
    return any(column[1] == "quote_date" for column in conn.execute("PRAGMA table_info(examples)"))


def add_column(conn: sqlite3.Connection) -> None:
    if not has_quote_date_column(conn):
        conn.execute(f"ALTER TABLE examples ADD COLUMN quote_date TEXT {DATE_CHECK}")


def apply_dates(conn: sqlite3.Connection, devices: list[dict]) -> tuple[int, list[tuple[str, str]]]:
    """(examples dated, [(device name, example text) with a date but no matching row])."""
    dated, missing = 0, []
    for device in devices:
        for example in device["examples"]:
            date = example.get("date")
            cursor = conn.execute(
                "UPDATE examples SET quote_date = ? WHERE body = ? "
                "AND device_id = (SELECT id FROM devices WHERE name = ?)",
                (date, example["text"], device["name"]))
            if date and cursor.rowcount:
                dated += cursor.rowcount
            elif date:
                missing.append((device["name"], example["text"]))
    return dated, missing


def main() -> None:
    conn = open_database()
    devices = json.loads(DEVICES_PATH.read_text())
    with conn:
        add_column(conn)
        dated, missing = apply_dates(conn, devices)
    total = conn.execute("SELECT COUNT(*) FROM examples").fetchone()[0]
    print(f"[seed] {DB_PATH.name}: {dated} of {total} examples dated")
    for name, text in missing:
        print(f"[seed] no row for {name}: {text[:60]!r}", file=sys.stderr)
    conn.close()
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
