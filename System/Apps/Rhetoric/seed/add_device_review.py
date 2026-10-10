"""Adds the private `device_review` table and its triggers to an existing database and back-fills a
row for every device that lacks one.

The table is the agent's own review ledger (see schema.sql, REVIEW TAG); nothing in the app reads it.
A device gets `definition_reviewed` and `ai_example_reviewed` = 1 when it belongs to a group already
reviewed under the seed/guides rules: the 58 fallacies and their 58 Flipsides. `quote_changes` starts at the number of credited examples
the device has, so 1 means the original quote and the triggers add 1 for every later write.
Only missing rows are inserted, so a second run changes nothing and never resets a flag or count.

Run: python3 -m seed.add_device_review   (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3

from seed.db import DB_PATH, open_database

REVIEWED_GROUP = (
    "SELECT id FROM devices WHERE flipside_of IS NOT NULL "
    "UNION SELECT flipside_of FROM devices WHERE flipside_of IS NOT NULL"
)


def backfill(conn: sqlite3.Connection) -> int:
    """Insert a review row for each device without one; return how many were added."""
    cursor = conn.execute(
        "INSERT INTO device_review (device_id, definition_reviewed, ai_example_reviewed, quote_changes) "
        "SELECT d.id, d.id IN (" + REVIEWED_GROUP + "), d.id IN (" + REVIEWED_GROUP + "), "
        "(SELECT COUNT(*) FROM examples e WHERE e.device_id = d.id AND e.attribution <> 'Unattributed') "
        "FROM devices d WHERE d.id NOT IN (SELECT device_id FROM device_review)")
    return cursor.rowcount


def main() -> None:
    conn = open_database()  # applies schema.sql: the table and the triggers
    with conn:
        added = backfill(conn)
    total, definitions, examples, changes = conn.execute(
        "SELECT COUNT(*), SUM(definition_reviewed), SUM(ai_example_reviewed), SUM(quote_changes) "
        "FROM device_review").fetchone()
    print(f"[seed] {DB_PATH.name}: {added} review rows added; {total} in all "
          f"({definitions} definitions and {examples} AI examples reviewed, {changes} quote writes counted)")
    conn.close()


if __name__ == "__main__":
    main()
