"""Smoke tests for schema.sql: happy path, FK guards, and the AC-3/AC-4 invariant queries."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

CROSS_PARENT = ("SELECT COUNT(*) FROM nodes c JOIN nodes p ON c.parent_id = p.id "
                "WHERE c.hierarchy != p.hierarchy")


def wrong_hierarchy_links(db, column, hierarchy):
    return db.execute(
        f"SELECT COUNT(*) FROM devices d JOIN nodes n ON d.{column} = n.id "
        "WHERE n.hierarchy != ?", (hierarchy,)).fetchone()[0]


class SchemaTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def add_node(self, hierarchy, name="n", parent_id=None):
        return self.db.execute(
            "INSERT INTO nodes (hierarchy, parent_id, name, definition) VALUES (?, ?, ?, 'd')",
            (hierarchy, parent_id, name)).lastrowid

    def add_device(self, category, form, function):
        return self.db.execute(
            "INSERT INTO devices (name, definition, category_node_id, form_node_id, "
            "function_node_id) VALUES ('Metaphor', 'd', ?, ?, ?)",
            (category, form, function)).lastrowid

    def seed_valid(self):
        ids = [self.add_node(h) for h in ("category", "form", "function")]
        return ids, self.add_device(*ids)

    def test_foreign_keys_pragma_is_on(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)

    def test_schema_has_no_medium_column(self):
        columns = [row[1] for table in ("nodes", "devices", "examples")
                   for row in self.db.execute(f"PRAGMA table_info({table})")]
        self.assertFalse([c for c in columns if "medium" in c.lower()])

    def test_happy_path_reads_chain_back(self):
        (category, form, function), device = self.seed_valid()
        self.db.execute("INSERT INTO examples (device_id, body) VALUES (?, 'carpe *diem*')",
                        (device,))
        row = self.db.execute(
            "SELECT d.name, c.hierarchy, f.hierarchy, u.hierarchy, e.body FROM devices d "
            "JOIN nodes c ON c.id = d.category_node_id JOIN nodes f ON f.id = d.form_node_id "
            "JOIN nodes u ON u.id = d.function_node_id JOIN examples e ON e.device_id = d.id"
        ).fetchone()
        self.assertEqual(row, ("Metaphor", "category", "form", "function", "carpe *diem*"))
        self.assertEqual(self.db.execute(CROSS_PARENT).fetchone()[0], 0)
        for column, hierarchy in (("category_node_id", "category"), ("form_node_id", "form"),
                                  ("function_node_id", "function")):
            self.assertEqual(wrong_hierarchy_links(self.db, column, hierarchy), 0)

    def test_dangling_parent_id_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_node("form", parent_id=999)

    def test_dangling_device_link_rejected(self):
        (category, form, _), _ = self.seed_valid()
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_device(category, form, 999)

    def test_dangling_example_device_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (device_id, body) VALUES (999, 'x')")

    def test_unknown_hierarchy_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_node("medium")

    def test_cross_hierarchy_parent_detected(self):
        category = self.add_node("category")
        self.add_node("form", parent_id=category)
        self.assertEqual(self.db.execute(CROSS_PARENT).fetchone()[0], 1)

    def test_device_linked_into_wrong_hierarchy_detected(self):
        category, form, function = (self.add_node(h) for h in ("category", "form", "function"))
        self.add_device(form, form, function)
        self.assertEqual(wrong_hierarchy_links(self.db, "category_node_id", "category"), 1)
        self.assertEqual(wrong_hierarchy_links(self.db, "form_node_id", "form"), 0)
        self.assertEqual(wrong_hierarchy_links(self.db, "function_node_id", "function"), 0)

    def test_sort_columns_are_indexed(self):
        indexed = {row[1] for row in self.db.execute("PRAGMA index_list(devices)")}
        for column in ("name", "popularity", "topical_rank"):
            self.assertIn(f"idx_devices_{column}", indexed)

    def test_ids_are_distinct(self):
        self.assertNotEqual(self.add_node("form"), self.add_node("form"))


if __name__ == "__main__":
    unittest.main()
