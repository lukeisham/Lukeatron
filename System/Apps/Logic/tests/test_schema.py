"""Smoke tests for schema.sql: happy path, FK guards, and the AC-3/AC-4 invariant queries."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

CROSS_PARENT = ("SELECT COUNT(*) FROM nodes c JOIN nodes p ON c.parent_id = p.id "
                "WHERE c.hierarchy != p.hierarchy")


def wrong_hierarchy_links(db, column, hierarchy):
    if column == "category":
        return db.execute(
            "SELECT COUNT(*) FROM entry_categories dc JOIN nodes n ON n.id = dc.node_id "
            "WHERE n.hierarchy != 'category'").fetchone()[0]
    return db.execute(
        f"SELECT COUNT(*) FROM entries d JOIN nodes n ON d.{column} = n.id "
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

    def add_entry(self, category, form, function, popularity=50):
        entry = self.db.execute(
            "INSERT INTO entries (name, definition, form_node_id, function_node_id, popularity) "
            "VALUES ('Metaphor', 'd', ?, ?, ?)", (form, function, popularity)).lastrowid
        self.db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, ?)",
                        (entry, category))
        return entry

    def seed_valid(self):
        ids = [self.add_node(h) for h in ("category", "form", "function")]
        return ids, self.add_entry(*ids)

    def test_foreign_keys_pragma_is_on(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)

    def test_schema_has_no_medium_column(self):
        columns = [row[1] for table in ("nodes", "entries", "examples")
                   for row in self.db.execute(f"PRAGMA table_info({table})")]
        self.assertFalse([c for c in columns if "medium" in c.lower()])

    def test_example_attribution_defaults_to_unattributed_and_is_never_null(self):
        _, entry = self.seed_valid()
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')", (entry,))
        self.assertEqual(self.db.execute("SELECT attribution FROM examples").fetchone(), ("Unattributed",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (entry_id, body, attribution) VALUES (?, 'x', NULL)", (entry,))

    def test_quote_date_is_optional_and_must_be_a_year_a_full_date_or_a_year_bc(self):
        _, entry = self.seed_valid()
        for date in (None, "1863", "1863-11-19", "0060", "-0935"):
            self.db.execute("INSERT INTO examples (entry_id, body, quote_date) VALUES (?, 'x', ?)", (entry, date))
        for bad in ("c. 1600", "1863-11", "19 November 1863", "60", "-935", "-0935-01-01"):
            with self.assertRaises(sqlite3.IntegrityError, msg=bad):
                self.db.execute("INSERT INTO examples (entry_id, body, quote_date) VALUES (?, 'x', ?)", (entry, bad))

    def test_happy_path_reads_chain_back(self):
        (category, form, function), entry = self.seed_valid()
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')",
                        (entry,))
        row = self.db.execute(
            "SELECT d.name, c.hierarchy, f.hierarchy, u.hierarchy, e.body FROM entries d "
            "JOIN entry_categories dc ON dc.entry_id = d.id JOIN nodes c ON c.id = dc.node_id "
            "JOIN nodes f ON f.id = d.form_node_id "
            "JOIN nodes u ON u.id = d.function_node_id JOIN examples e ON e.entry_id = d.id"
        ).fetchone()
        self.assertEqual(row, ("Metaphor", "category", "form", "function", "carpe *diem*"))
        self.assertEqual(self.db.execute(CROSS_PARENT).fetchone()[0], 0)
        for column, hierarchy in (("category", "category"), ("form_node_id", "form"),
                                  ("function_node_id", "function")):
            self.assertEqual(wrong_hierarchy_links(self.db, column, hierarchy), 0)

    def test_dangling_parent_id_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_node("form", parent_id=999)

    def test_dangling_entry_link_rejected(self):
        (category, form, _), _ = self.seed_valid()
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_entry(category, form, 999)

    def test_dangling_example_entry_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (entry_id, body) VALUES (999, 'x')")

    def test_unknown_hierarchy_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_node("medium")

    def test_cross_hierarchy_parent_detected(self):
        category = self.add_node("category")
        self.add_node("form", parent_id=category)
        self.assertEqual(self.db.execute(CROSS_PARENT).fetchone()[0], 1)

    def test_entry_linked_into_wrong_hierarchy_detected(self):
        category, form, function = (self.add_node(h) for h in ("category", "form", "function"))
        self.add_entry(form, form, function)
        self.assertEqual(wrong_hierarchy_links(self.db, "category", "category"), 1)
        self.assertEqual(wrong_hierarchy_links(self.db, "form_node_id", "form"), 0)
        self.assertEqual(wrong_hierarchy_links(self.db, "function_node_id", "function"), 0)

    def test_sort_columns_are_indexed(self):
        indexed = {row[1] for row in self.db.execute("PRAGMA index_list(entries)")}
        for column in ("name", "popularity"):
            self.assertIn(f"idx_entries_{column}", indexed)

    def test_counterpart_links_to_its_base_and_is_optional(self):
        ids, base = self.seed_valid()
        flip = self.add_entry(*ids)
        self.db.execute("UPDATE entries SET counterpart_of = ? WHERE id = ?", (base, flip))
        self.assertIsNone(self.db.execute(
            "SELECT counterpart_of FROM entries WHERE id = ?", (base,)).fetchone()[0])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE entries SET counterpart_of = 9999 WHERE id = ?", (flip,))

    def test_entry_can_hold_several_category_tags_but_not_the_same_twice(self):
        (category, _, _), entry = self.seed_valid()
        naming = self.add_node("category", "Naming")
        self.db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, ?)",
                        (entry, naming))
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM entry_categories WHERE entry_id = ?", (entry,)).fetchone()[0], 2)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, ?)",
                            (entry, naming))

    def test_dangling_category_tag_rejected(self):
        _, entry = self.seed_valid()
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, 999)",
                            (entry,))

    def test_popularity_is_optional_but_within_range_when_given(self):
        ids, _ = self.seed_valid()
        self.add_entry(*ids, popularity=None)
        for bad in (-1, 101):
            with self.assertRaises(sqlite3.IntegrityError):
                self.add_entry(*ids, popularity=bad)

    def test_an_entry_needs_only_a_name_and_a_definition(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.assertEqual(self.db.execute(
            "SELECT form_node_id, function_node_id, popularity, ai_confidence_rating FROM entries").fetchone(), (None, None, None, "low"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO entries (name) VALUES ('No definition')")

    def test_a_new_entry_gets_a_review_row_and_a_credited_quote_is_counted(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.assertEqual(self.db.execute("SELECT * FROM entry_review").fetchall(), [(1, 0, 0, 0)])
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (1, 'constructed')")
        self.db.execute("INSERT INTO examples (entry_id, body, attribution) VALUES (1, '\"q\" (Someone)', 'Someone')")
        self.assertEqual(self.db.execute("SELECT quote_changes FROM entry_review").fetchone(), (1,))
        self.db.execute("UPDATE examples SET body = '\"q2\" (Someone)' WHERE id = 2")
        self.assertEqual(self.db.execute("SELECT quote_changes FROM entry_review").fetchone(), (2,))

    def test_labels_nest_and_a_placement_goes_with_its_label_or_entry(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.db.execute("INSERT INTO labels (name) VALUES ('Clause')")
        self.db.execute("INSERT INTO labels (parent_id, name) VALUES (1, 'Relative')")
        self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (2, 1)")
        self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (1, 1)")
        self.db.execute("DELETE FROM labels WHERE id = 2")
        self.assertEqual(self.db.execute("SELECT label_id FROM label_placements").fetchall(), [(1,)])
        self.db.execute("DELETE FROM label_placements")
        self.db.execute("INSERT INTO labels (name) VALUES ('Clause')")  # a label's name may repeat
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (99, 1)")

    def test_ids_are_distinct(self):
        self.assertNotEqual(self.add_node("form"), self.add_node("form"))


if __name__ == "__main__":
    unittest.main()
