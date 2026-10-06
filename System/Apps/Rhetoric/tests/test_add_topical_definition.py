"""add_topical_definition: gives an older database the definition column on topical_types, keeping its rows."""
import sqlite3
import unittest

from seed import add_topical_definition as migration


def old_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE topical_types (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL,
                                    position INTEGER NOT NULL DEFAULT 0, tables_json TEXT NOT NULL DEFAULT '[]');
        INSERT INTO topical_types (name) VALUES ('Irony');
    """)
    return conn


class AddTopicalDefinitionTest(unittest.TestCase):
    def test_the_column_is_added_and_existing_types_start_with_a_blank_explanation(self):
        conn = old_database()
        self.assertTrue(migration.add_column(conn))
        self.assertEqual(conn.execute("SELECT name, definition FROM topical_types").fetchall(), [("Irony", "")])

    def test_running_it_twice_changes_nothing_the_second_time(self):
        conn = old_database()
        migration.add_column(conn)
        conn.execute("UPDATE topical_types SET definition = 'saying the opposite'")
        self.assertFalse(migration.add_column(conn))
        self.assertEqual(conn.execute("SELECT definition FROM topical_types").fetchone(), ("saying the opposite",))


if __name__ == "__main__":
    unittest.main()
