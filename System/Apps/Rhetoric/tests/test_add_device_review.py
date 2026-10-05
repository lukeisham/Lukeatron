"""device_review: triggers count quote writes, the back-fill sets the flags once, and the app never reads it."""
import sqlite3
import unittest
from pathlib import Path

from seed import add_device_review as migration

APP = Path(__file__).resolve().parent.parent
SCHEMA = (APP / "schema.sql").read_text()


def database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    for hierarchy in ("category", "form", "function"):
        conn.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES (?, 'n', 'd')", (hierarchy,))
    return conn


def add_device(conn, name, flipside_of=None) -> int:
    return conn.execute(
        "INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity, flipside_of) "
        "VALUES (?, 'd', 2, 3, 50, ?)", (name, flipside_of)).lastrowid


def row(conn, device_id):
    return conn.execute("SELECT definition_reviewed, ai_example_reviewed, quote_changes "
                        "FROM device_review WHERE device_id = ?", (device_id,)).fetchone()


class DeviceReviewTest(unittest.TestCase):
    def test_a_new_device_starts_unreviewed_with_no_quote_changes(self):
        conn = database()
        self.assertEqual(row(conn, add_device(conn, "Litotes")), (0, 0, 0))

    def test_credited_quote_writes_are_counted_and_constructed_examples_are_not(self):
        conn = database()
        device = add_device(conn, "Litotes")
        conn.execute("INSERT INTO examples (device_id, body) VALUES (?, 'She is no fool.')", (device,))
        self.assertEqual(row(conn, device)[2], 0)
        quote = conn.execute("INSERT INTO examples (device_id, body, attribution) VALUES (?, 'q', 'A')",
                             (device,)).lastrowid
        self.assertEqual(row(conn, device)[2], 1)
        conn.execute("UPDATE examples SET body = 'q2' WHERE id = ?", (quote,))
        self.assertEqual(row(conn, device)[2], 2)
        conn.execute("UPDATE examples SET quote_date = '1999' WHERE id = ?", (quote,))  # a date is not a change
        conn.execute("DELETE FROM examples WHERE id = ?", (quote,))
        conn.execute("INSERT INTO examples (device_id, body, attribution) VALUES (?, 'q3', 'B')", (device,))
        self.assertEqual(row(conn, device)[2], 3)

    def test_backfill_flags_fallacies_and_flipsides_once_and_never_resets(self):
        conn = database()
        fallacy, other = add_device(conn, "Straw Man"), add_device(conn, "Litotes")
        flipside = add_device(conn, "Fair Summary", flipside_of=fallacy)
        conn.execute("INSERT INTO examples (device_id, body, attribution) VALUES (?, 'q', 'A')", (other,))
        conn.execute("DELETE FROM device_review")
        self.assertEqual(migration.backfill(conn), 3)
        self.assertEqual(row(conn, fallacy), (1, 1, 0))
        self.assertEqual(row(conn, flipside), (1, 1, 0))
        self.assertEqual(row(conn, other), (0, 0, 1))
        conn.execute("UPDATE device_review SET definition_reviewed = 1, quote_changes = 5 WHERE device_id = ?", (other,))
        self.assertEqual(migration.backfill(conn), 0)
        self.assertEqual(row(conn, other), (1, 0, 5))

    def test_the_app_never_selects_the_review_table(self):
        for name in ("items.py", "server.py", "quotes.py", "topical.py", "grammar.py"):
            self.assertNotIn("device_review", (APP / name).read_text(), name)
        for path in (APP / "app").rglob("*"):
            if path.is_file() and path.suffix in {".js", ".html", ".css"}:
                self.assertNotIn("device_review", path.read_text(), path.name)


if __name__ == "__main__":
    unittest.main()
