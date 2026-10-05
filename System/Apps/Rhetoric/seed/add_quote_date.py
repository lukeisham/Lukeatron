"""Adds `examples.quote_date` to an existing database and fills it from seed/devices.json.

An example's date is the optional `"date"` in its devices.json entry ('YYYY' or 'YYYY-MM-DD' for AD,
a year under 1000 padded to four digits as '0060'; '-YYYY' for a year BC, '-0935' being 935 BC); an
example without one stays NULL (date not known). An older database whose check accepts only the AD
forms is rebuilt once to accept the BC form too (`widen_check`; ids, rows, index and triggers are
kept). An example is matched by device name and example
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
    "OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' "
    "OR quote_date GLOB '-[0-9][0-9][0-9][0-9]')"
)


def has_quote_date_column(conn: sqlite3.Connection) -> bool:
    return any(column[1] == "quote_date" for column in conn.execute("PRAGMA table_info(examples)"))


def add_column(conn: sqlite3.Connection) -> None:
    if not has_quote_date_column(conn):
        conn.execute(f"ALTER TABLE examples ADD COLUMN quote_date TEXT {DATE_CHECK}")


def widen_check(conn: sqlite3.Connection) -> bool:
    """Rebuild `examples` so its date check also accepts a year BC ('-0935'). SQLite cannot edit a check
    in place. Rows keep their ids; the index and triggers are recreated from the database's own SQL.
    True when a rebuild happened, False when the check was already wide enough."""
    table_sql = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'examples'").fetchone()[0]
    if "'-[0-9]" in table_sql:
        return False
    columns = [column[1] for column in conn.execute("PRAGMA table_info(examples)")]
    extras = [row[0] for row in conn.execute(
        "SELECT sql FROM sqlite_master WHERE tbl_name = 'examples' AND type IN ('index', 'trigger') AND sql IS NOT NULL")]
    sequence = conn.execute("SELECT seq FROM sqlite_sequence WHERE name = 'examples'").fetchone()
    new_sql = table_sql.replace("CREATE TABLE examples", "CREATE TABLE examples_new", 1)
    new_sql = new_sql.replace("CREATE TABLE IF NOT EXISTS examples", "CREATE TABLE examples_new", 1)
    new_sql = new_sql.replace("OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')",
                              "OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' "
                              "OR quote_date GLOB '-[0-9][0-9][0-9][0-9]')")
    if "'-[0-9]" not in new_sql:
        raise RuntimeError("examples has a date check in a shape this script does not know; widen it by hand")
    names = ", ".join(columns)
    conn.execute("BEGIN")
    try:
        conn.execute(new_sql)
        conn.execute(f"INSERT INTO examples_new ({names}) SELECT {names} FROM examples")
        conn.execute("DROP TABLE examples")
        conn.execute("ALTER TABLE examples_new RENAME TO examples")
        for sql in extras:
            conn.execute(sql)
        if sequence:
            conn.execute("UPDATE sqlite_sequence SET seq = ? WHERE name = 'examples'", (sequence[0],))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return True


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
    add_column(conn)
    conn.commit()
    if widen_check(conn):
        print("[seed] examples rebuilt: the date check now accepts a year BC")
    with conn:
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
