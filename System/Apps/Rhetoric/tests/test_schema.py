"""Smoke tests for schema.sql: happy path, FK guards, and the invariant queries."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

CROSS_PARENT = ("SELECT COUNT(*) FROM nodes c JOIN nodes p ON c.parent_id = p.id "
                "WHERE c.hierarchy != p.hierarchy")


def wrong_hierarchy_links(db, column, hierarchy):
    if column == "category":
        return db.execute(
            "SELECT COUNT(*) FROM device_categories dc JOIN nodes n ON n.id = dc.node_id "
            "WHERE n.hierarchy != 'category'").fetchone()[0]
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

    def add_device(self, category, form, function, popularity=50):
        device = self.db.execute(
            "INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity) "
            "VALUES ('Metaphor', 'd', ?, ?, ?)", (form, function, popularity)).lastrowid
        self.db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                        (device, category))
        return device

    def seed_valid(self):
        ids = [self.add_node(h) for h in ("category", "form", "function")]
        return ids, self.add_device(*ids)

    def test_foreign_keys_pragma_is_on(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)

    def test_schema_has_no_medium_column(self):
        columns = [row[1] for table in ("nodes", "devices", "examples")
                   for row in self.db.execute(f"PRAGMA table_info({table})")]
        self.assertFalse([c for c in columns if "medium" in c.lower()])

    def test_example_attribution_defaults_to_unattributed_and_is_never_null(self):
        _, device = self.seed_valid()
        self.db.execute("INSERT INTO examples (device_id, body) VALUES (?, 'carpe *diem*')", (device,))
        self.assertEqual(self.db.execute("SELECT attribution FROM examples").fetchone(), ("Unattributed",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (device_id, body, attribution) VALUES (?, 'x', NULL)", (device,))

    def test_quote_date_is_optional_and_must_be_a_year_a_full_date_or_a_year_bc(self):
        _, device = self.seed_valid()
        for date in (None, "1863", "1863-11-19", "0060", "-0935"):
            self.db.execute("INSERT INTO examples (device_id, body, quote_date) VALUES (?, 'x', ?)", (device, date))
        for bad in ("c. 1600", "1863-11", "19 November 1863", "60", "-935", "-0935-01-01"):
            with self.assertRaises(sqlite3.IntegrityError, msg=bad):
                self.db.execute("INSERT INTO examples (device_id, body, quote_date) VALUES (?, 'x', ?)", (device, bad))

    def test_happy_path_reads_chain_back(self):
        (category, form, function), device = self.seed_valid()
        self.db.execute("INSERT INTO examples (device_id, body) VALUES (?, 'carpe *diem*')",
                        (device,))
        row = self.db.execute(
            "SELECT d.name, c.hierarchy, f.hierarchy, u.hierarchy, e.body FROM devices d "
            "JOIN device_categories dc ON dc.device_id = d.id JOIN nodes c ON c.id = dc.node_id "
            "JOIN nodes f ON f.id = d.form_node_id "
            "JOIN nodes u ON u.id = d.function_node_id JOIN examples e ON e.device_id = d.id"
        ).fetchone()
        self.assertEqual(row, ("Metaphor", "category", "form", "function", "carpe *diem*"))
        self.assertEqual(self.db.execute(CROSS_PARENT).fetchone()[0], 0)
        for column, hierarchy in (("category", "category"), ("form_node_id", "form"),
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
        self.assertEqual(wrong_hierarchy_links(self.db, "category", "category"), 1)
        self.assertEqual(wrong_hierarchy_links(self.db, "form_node_id", "form"), 0)
        self.assertEqual(wrong_hierarchy_links(self.db, "function_node_id", "function"), 0)

    def test_sort_columns_are_indexed(self):
        indexed = {row[1] for row in self.db.execute("PRAGMA index_list(devices)")}
        for column in ("name", "popularity", "topical_rank"):
            self.assertIn(f"idx_devices_{column}", indexed)

    def test_flipside_links_to_its_fallacy_and_is_optional(self):
        ids, fallacy = self.seed_valid()
        flip = self.add_device(*ids)
        self.db.execute("UPDATE devices SET flipside_of = ? WHERE id = ?", (fallacy, flip))
        self.assertIsNone(self.db.execute(
            "SELECT flipside_of FROM devices WHERE id = ?", (fallacy,)).fetchone()[0])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE devices SET flipside_of = 9999 WHERE id = ?", (flip,))

    def test_device_can_hold_several_category_tags_but_not_the_same_twice(self):
        (category, _, _), device = self.seed_valid()
        naming = self.add_node("category", "Naming")
        self.db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                        (device, naming))
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM device_categories WHERE device_id = ?", (device,)).fetchone()[0], 2)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                            (device, naming))

    def test_dangling_category_tag_rejected(self):
        _, device = self.seed_valid()
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, 999)",
                            (device,))

    def test_popularity_required_in_range_and_topical_optional(self):
        ids, device = self.seed_valid()
        self.assertIsNone(self.db.execute(
            "SELECT topical_rank FROM devices WHERE id = ?", (device,)).fetchone()[0])
        for bad in (None, -1, 101):
            with self.assertRaises(sqlite3.IntegrityError):
                self.add_device(*ids, popularity=bad)

    def test_ids_are_distinct(self):
        self.assertNotEqual(self.add_node("form"), self.add_node("form"))


if __name__ == "__main__":
    unittest.main()
