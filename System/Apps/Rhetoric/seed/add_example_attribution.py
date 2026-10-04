"""Adds `examples.attribution` to an existing database and fills it from seed/devices.json.

An example is matched to its tag by device name and example text, so Topical Types and placements
are untouched. Safe to run twice: the column is added only when missing, and the tags are
rewritten from devices.json each time. A fresh database gets the column from schema.sql instead.

Run: python3 -m seed.add_example_attribution   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import sqlite3
import sys

from seed.db import DB_PATH, open_database
from seed.load_devices import DEVICES_PATH

DEFAULT_ATTRIBUTION = "Unattributed"


def has_attribution_column(conn: sqlite3.Connection) -> bool:
    return any(column[1] == "attribution" for column in conn.execute("PRAGMA table_info(examples)"))


def add_column(conn: sqlite3.Connection) -> None:
    if not has_attribution_column(conn):
        conn.execute(f"ALTER TABLE examples ADD COLUMN attribution TEXT NOT NULL DEFAULT '{DEFAULT_ATTRIBUTION}'")


def apply_tags(conn: sqlite3.Connection, devices: list[dict]) -> tuple[int, list[tuple[str, str]]]:
    """(examples tagged, [(device name, example text) with no matching row])."""
    tagged, missing = 0, []
    for device in devices:
        for example in device["examples"]:
            cursor = conn.execute(
                "UPDATE examples SET attribution = ? WHERE body = ? "
                "AND device_id = (SELECT id FROM devices WHERE name = ?)",
                (example["attribution"], example["text"], device["name"]))
            if cursor.rowcount:
                tagged += cursor.rowcount
            else:
                missing.append((device["name"], example["text"]))
    return tagged, missing


def main() -> None:
    conn = open_database()
    devices = json.loads(DEVICES_PATH.read_text())
    with conn:
        add_column(conn)
        tagged, missing = apply_tags(conn, devices)
    total = conn.execute("SELECT COUNT(*) FROM examples").fetchone()[0]
    print(f"[seed] {DB_PATH.name}: {tagged} of {total} examples tagged")
    for name, text in missing:
        print(f"[seed] no row for {name}: {text[:60]!r}", file=sys.stderr)
    conn.close()
    if missing or tagged != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
