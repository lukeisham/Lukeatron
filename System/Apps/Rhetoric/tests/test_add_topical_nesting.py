"""add_topical_nesting: rebuilds an old flat topical_types table with a parent_id, keeping every Type, id, position and placement."""
import sqlite3
import unittest
from pathlib import Path

from seed import add_topical_nesting

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

# The table as it was: flat, with a table-wide unique name and no parent.
OLD_TABLE = """
DROP TABLE topical_placements;
DROP TABLE topical_types;
CREATE TABLE topical_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE topical_placements (type_id INTEGER NOT NULL REFERENCES topical_types(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES devices(id), position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (type_id, device_id));
"""


class AddTopicalNestingTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(SCHEMA)
        self.conn.executescript(OLD_TABLE)
        self.conn.execute("PRAGMA foreign_keys = ON")

    def test_every_type_stays_at_the_top_with_its_id_position_and_placements(self):
        self.conn.execute("PRAGMA foreign_keys = OFF")  # the placement names a device row this test does not build
        self.conn.executescript("INSERT INTO topical_types (name, position) VALUES ('B', 0), ('A', 1);"
                                "INSERT INTO topical_placements (type_id, device_id, position) VALUES (2, 7, 0);")
        self.assertTrue(add_topical_nesting.needs_migration(self.conn))
        self.assertTrue(add_topical_nesting.migrate(self.conn))
        self.assertEqual(self.conn.execute("SELECT id, parent_id, name, position FROM topical_types ORDER BY id").fetchall(),
                         [(1, None, "B", 0), (2, None, "A", 1)])
        self.assertEqual(self.conn.execute("SELECT type_id, device_id FROM topical_placements").fetchall(), [(2, 7)])

    def test_a_name_may_repeat_under_another_parent_and_among_siblings(self):
        add_topical_nesting.migrate(self.conn)
        self.conn.execute("INSERT INTO topical_types (name) VALUES ('A')")
        self.conn.execute("INSERT INTO topical_types (parent_id, name) VALUES (1, 'A')")
        self.conn.execute("INSERT INTO topical_types (parent_id, name) VALUES (1, 'a')")  # the sibling-name rule is gone

    def test_a_second_run_changes_nothing(self):
        add_topical_nesting.migrate(self.conn)
        self.assertFalse(add_topical_nesting.migrate(self.conn))
