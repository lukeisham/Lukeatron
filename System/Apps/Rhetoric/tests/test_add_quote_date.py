"""add_quote_date: adds the column to an older database and dates examples by device and text."""
import sqlite3
import unittest

from seed import add_quote_date as migration

OLD_SCHEMA = """
CREATE TABLE devices (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE examples (id INTEGER PRIMARY KEY, device_id INTEGER, body TEXT, attribution TEXT NOT NULL DEFAULT 'Unattributed');
"""
DEVICES = [
    {"name": "Antithesis", "examples": [{"text": "One small step", "attribution": "Neil Armstrong", "date": "1969-07-20"}]},
    {"name": "Litotes", "examples": [{"text": "She's no fool.", "attribution": "Unattributed"}]},
]


def old_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(OLD_SCHEMA)
    conn.executemany("INSERT INTO devices (id, name) VALUES (?, ?)", [(1, "Antithesis"), (2, "Litotes")])
    conn.executemany("INSERT INTO examples (device_id, body) VALUES (?, ?)", [(1, "One small step"), (2, "She's no fool.")])
    return conn


NARROW_SCHEMA = """
CREATE TABLE devices (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER, body TEXT, attribution TEXT NOT NULL DEFAULT 'Unattributed',
    quote_date TEXT CHECK (quote_date IS NULL OR quote_date GLOB '[0-9][0-9][0-9][0-9]'
                           OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX idx_examples_device_id ON examples(device_id);
CREATE TABLE log (note TEXT);
CREATE TRIGGER trg_log_added AFTER INSERT ON examples BEGIN INSERT INTO log VALUES (NEW.body); END;
"""


class WidenCheckTest(unittest.TestCase):
    def narrow_database(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:", isolation_level=None)
        conn.executescript(NARROW_SCHEMA)
        conn.execute("INSERT INTO devices VALUES (1, 'Antithesis')")
        conn.execute("INSERT INTO examples (device_id, body, quote_date) VALUES (1, 'kept', '1969')")
        conn.execute("DELETE FROM examples WHERE body = 'gone'")
        return conn

    def test_a_narrow_check_is_rebuilt_to_accept_a_year_bc_and_keeps_rows_index_and_triggers(self):
        conn = self.narrow_database()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("UPDATE examples SET quote_date = '-0935'")
        self.assertTrue(migration.widen_check(conn))
        conn.execute("UPDATE examples SET quote_date = '-0935'")
        self.assertEqual(conn.execute("SELECT id, body, quote_date FROM examples").fetchall(), [(1, "kept", "-0935")])
        names = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE tbl_name = 'examples'")}
        self.assertTrue({"idx_examples_device_id", "trg_log_added"} <= names)
        conn.execute("INSERT INTO examples (device_id, body) VALUES (1, 'next')")
        self.assertEqual(conn.execute("SELECT id FROM examples WHERE body = 'next'").fetchone(), (2,))
        self.assertEqual(conn.execute("SELECT note FROM log ORDER BY rowid DESC LIMIT 1").fetchone(), ("next",))

    def test_a_check_that_is_already_wide_is_left_alone(self):
        conn = self.narrow_database()
        self.assertTrue(migration.widen_check(conn))
        self.assertFalse(migration.widen_check(conn))  # safe to run twice


class AddQuoteDateTest(unittest.TestCase):
    def test_adds_the_column_once_and_dates_only_examples_that_carry_a_date(self):
        conn = old_database()
        self.assertFalse(migration.has_quote_date_column(conn))
        migration.add_column(conn)
        migration.add_column(conn)  # safe to run twice
        self.assertTrue(migration.has_quote_date_column(conn))
        dated, missing = migration.apply_dates(conn, DEVICES)
        self.assertEqual((dated, missing), (1, []))
        rows = conn.execute("SELECT d.name, e.quote_date FROM examples e JOIN devices d ON d.id = e.device_id ORDER BY d.id").fetchall()
        self.assertEqual(rows, [("Antithesis", "1969-07-20"), ("Litotes", None)])

    def test_a_dated_example_with_no_matching_row_is_reported(self):
        conn = old_database()
        migration.add_column(conn)
        dated, missing = migration.apply_dates(conn, [{"name": "Antithesis", "examples": [
            {"text": "Different text", "attribution": "X", "date": "1969"}]}])
        self.assertEqual((dated, missing), (0, [("Antithesis", "Different text")]))

    def test_the_check_refuses_a_malformed_date(self):
        conn = old_database()
        migration.add_column(conn)
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("UPDATE examples SET quote_date = 'c. 1600' WHERE id = 1")


if __name__ == "__main__":
    unittest.main()
