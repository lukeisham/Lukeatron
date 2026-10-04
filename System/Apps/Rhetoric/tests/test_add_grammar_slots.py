"""add_grammar_slots: brings an old-shape grammar table pair up to the two-slot shape, never discarding rows."""
import sqlite3
import unittest
from pathlib import Path

from seed import add_grammar_slots

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

# The grammar tables as they were before the slots: no `slot`, one `example`.
OLD_TABLES = """
DROP TABLE device_labels;
DROP TABLE grammar_explanations;
CREATE TABLE device_labels (device_id INTEGER NOT NULL, label_id INTEGER NOT NULL, PRIMARY KEY (device_id, label_id));
CREATE TABLE grammar_explanations (device_id INTEGER PRIMARY KEY, summary TEXT NOT NULL, example TEXT NOT NULL);
"""


class AddGrammarSlotsTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(SCHEMA)
        self.conn.executescript(OLD_TABLES)

    def test_an_old_database_gains_the_slots(self):
        self.assertTrue(add_grammar_slots.needs_migration(self.conn))
        self.assertTrue(add_grammar_slots.migrate(self.conn))
        self.assertIn("slot", add_grammar_slots.columns(self.conn, "device_labels"))
        self.assertTrue({"function_example", "form_example"} <= add_grammar_slots.columns(self.conn, "grammar_explanations"))
        self.assertNotIn("example", add_grammar_slots.columns(self.conn, "grammar_explanations"))

    def test_a_second_run_changes_nothing(self):
        add_grammar_slots.migrate(self.conn)
        self.assertFalse(add_grammar_slots.migrate(self.conn))

    def test_it_refuses_while_old_rows_would_be_lost(self):
        self.conn.execute("INSERT INTO grammar_explanations VALUES (1, 's', '*e* [x]')")
        with self.assertRaises(ValueError):
            add_grammar_slots.migrate(self.conn)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM grammar_explanations").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
