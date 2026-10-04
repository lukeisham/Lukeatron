"""add_example_attribution: adds the column to an older database, tags examples by device and text,
and is safe to run twice."""
import sqlite3
import unittest

from seed import add_example_attribution as migration

OLD_EXAMPLES = """
CREATE TABLE devices (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE examples (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, body TEXT NOT NULL);
"""
DEVICES = [
    {"name": "Asyndeton", "examples": [{"text": "Veni, vidi, vici.", "attribution": "Julius Caesar"}]},
    {"name": "Litotes", "examples": [{"text": "She's no fool.", "attribution": "Unattributed"}]},
]


def old_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(OLD_EXAMPLES)
    conn.execute("INSERT INTO devices (id, name) VALUES (1, 'Asyndeton'), (2, 'Litotes')")
    conn.execute("INSERT INTO examples (device_id, body) VALUES (1, 'Veni, vidi, vici.'), (2, 'She''s no fool.')")
    return conn


class AddExampleAttributionTest(unittest.TestCase):
    def test_adds_column_and_tags_each_example(self):
        conn = old_database()
        migration.add_column(conn)
        tagged, missing = migration.apply_tags(conn, DEVICES)
        self.assertEqual((tagged, missing), (2, []))
        rows = conn.execute("SELECT d.name, e.attribution FROM examples e JOIN devices d ON d.id = e.device_id "
                            "ORDER BY e.id").fetchall()
        self.assertEqual(rows, [("Asyndeton", "Julius Caesar"), ("Litotes", "Unattributed")])

    def test_running_twice_changes_nothing(self):
        conn = old_database()
        for _ in range(2):
            migration.add_column(conn)
            migration.apply_tags(conn, DEVICES)
        self.assertTrue(migration.has_attribution_column(conn))
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM examples").fetchone()[0], 2)

    def test_example_with_no_matching_row_is_reported(self):
        conn = old_database()
        migration.add_column(conn)
        _, missing = migration.apply_tags(conn, [{"name": "Asyndeton", "examples": [
            {"text": "Different text", "attribution": "X"}]}])
        self.assertEqual(missing, [("Asyndeton", "Different text")])


if __name__ == "__main__":
    unittest.main()
