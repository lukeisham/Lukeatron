"""add_label_tables: gives an older database the tables_json column on both tree tables, keeping its rows."""
import sqlite3
import unittest

from seed import add_label_tables as migration


def old_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE grammar_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL,
                                     definition TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE topical_types (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL,
                                    position INTEGER NOT NULL DEFAULT 0);
        INSERT INTO grammar_labels (name, definition) VALUES ('Clause', 'd');
        INSERT INTO topical_types (name) VALUES ('Irony');
    """)
    return conn


class AddLabelTablesTest(unittest.TestCase):
    def test_both_tables_gain_the_column_and_existing_rows_start_with_no_tables(self):
        conn = old_database()
        self.assertEqual(migration.add_columns(conn), ["grammar_labels", "topical_types"])
        self.assertEqual(conn.execute("SELECT name, tables_json FROM grammar_labels").fetchall(), [("Clause", "[]")])
        self.assertEqual(conn.execute("SELECT name, tables_json FROM topical_types").fetchall(), [("Irony", "[]")])

    def test_running_it_twice_changes_nothing_the_second_time(self):
        conn = old_database()
        migration.add_columns(conn)
        conn.execute("UPDATE grammar_labels SET tables_json = '[1]'")
        self.assertEqual(migration.add_columns(conn), [])
        self.assertEqual(conn.execute("SELECT tables_json FROM grammar_labels").fetchone(), ("[1]",))


if __name__ == "__main__":
    unittest.main()
