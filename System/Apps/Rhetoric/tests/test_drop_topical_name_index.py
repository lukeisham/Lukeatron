"""drop_topical_name_index: an older database loses the unique sibling-name index and then accepts repeated names."""
import sqlite3
import unittest

from seed import drop_topical_name_index as migration


def old_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE topical_types (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL,
                                    position INTEGER NOT NULL DEFAULT 0);
        CREATE UNIQUE INDEX idx_topical_types_sibling_name ON topical_types(COALESCE(parent_id, 0), name COLLATE NOCASE);
        INSERT INTO topical_types (name) VALUES ('Irony');
    """)
    return conn


class DropTopicalNameIndexTest(unittest.TestCase):
    def test_siblings_may_share_a_name_once_the_index_is_dropped_and_rows_are_kept(self):
        conn = old_database()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO topical_types (name) VALUES ('IRONY')")
        self.assertTrue(migration.drop_index(conn))
        conn.execute("INSERT INTO topical_types (name) VALUES ('IRONY')")
        self.assertEqual(conn.execute("SELECT name FROM topical_types ORDER BY id").fetchall(), [("Irony",), ("IRONY",)])

    def test_running_it_twice_changes_nothing_the_second_time(self):
        conn = old_database()
        migration.drop_index(conn)
        self.assertFalse(migration.drop_index(conn))


if __name__ == "__main__":
    unittest.main()
