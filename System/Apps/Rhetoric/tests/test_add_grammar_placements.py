"""add_grammar_placements: brings the old slot-shaped grammar tables up to the editable Grammar group, never discarding rows."""
import sqlite3
import unittest
from pathlib import Path

from seed import add_grammar_placements

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

# The grammar tables as they were before: no `position`, no placements, the two slot tables present.
OLD_TABLES = """
DROP TABLE grammar_placements;
DROP TABLE grammar_labels;
CREATE TABLE grammar_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL, definition TEXT NOT NULL);
CREATE TABLE device_labels (device_id INTEGER NOT NULL, slot TEXT NOT NULL, label_id INTEGER NOT NULL, PRIMARY KEY (device_id, slot, label_id));
CREATE TABLE grammar_explanations (device_id INTEGER PRIMARY KEY, summary TEXT NOT NULL, function_example TEXT, form_example TEXT);
"""


class AddGrammarPlacementsTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(SCHEMA)
        self.conn.executescript(OLD_TABLES)

    def test_an_old_database_gains_positions_and_placements_and_loses_the_slot_tables(self):
        self.conn.executescript("INSERT INTO grammar_labels (name, definition) VALUES ('B', 'd'), ('A', 'd');"
                                "INSERT INTO grammar_labels (parent_id, name, definition) VALUES (1, 'C', 'd');")
        self.assertTrue(add_grammar_placements.needs_migration(self.conn))
        self.assertTrue(add_grammar_placements.migrate(self.conn))
        tables = add_grammar_placements.tables(self.conn)
        self.assertIn("grammar_placements", tables)
        self.assertFalse(tables & set(add_grammar_placements.RETIRED))
        self.assertEqual(self.conn.execute("SELECT name, position FROM grammar_labels ORDER BY id").fetchall(),
                         [("B", 0), ("A", 1), ("C", 0)])  # existing order kept, per sibling set

    def test_a_second_run_changes_nothing(self):
        add_grammar_placements.migrate(self.conn)
        self.assertFalse(add_grammar_placements.migrate(self.conn))

    def test_it_refuses_while_retired_rows_would_be_lost(self):
        self.conn.execute("INSERT INTO grammar_explanations (device_id, summary) VALUES (1, 's')")
        with self.assertRaises(ValueError):
            add_grammar_placements.migrate(self.conn)
        self.assertIn("grammar_explanations", add_grammar_placements.tables(self.conn))

    def test_a_fresh_schema_needs_no_migration(self):
        fresh = sqlite3.connect(":memory:")
        fresh.executescript(SCHEMA)
        self.assertFalse(add_grammar_placements.needs_migration(fresh))
