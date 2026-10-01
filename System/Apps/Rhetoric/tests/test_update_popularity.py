"""seed/update_popularity.py: changes only popularity, and refuses a mismatched device set."""

import sqlite3
import unittest
from pathlib import Path

from seed import update_popularity

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


class UpdatePopularityTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(SCHEMA)
        for hierarchy in ("form", "function"):
            self.conn.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES (?, 'n', 'd')", (hierarchy,))
        for name, score in (("A", 0), ("B", 25)):
            self.conn.execute("INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity) "
                              "VALUES (?, 'd', 1, 2, ?)", (name, score))

    def test_updates_only_popularity(self):
        self.assertEqual(update_popularity.apply_scores(self.conn, {"A": 80, "B": 25}), 1)
        self.assertEqual(self.conn.execute("SELECT name, definition, popularity FROM devices ORDER BY name").fetchall(),
                         [("A", "d", 80), ("B", "d", 25)])

    def test_refuses_when_device_sets_differ(self):
        with self.assertRaises(ValueError):
            update_popularity.apply_scores(self.conn, {"A": 80})
        self.assertEqual(self.conn.execute("SELECT popularity FROM devices WHERE name = 'A'").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
